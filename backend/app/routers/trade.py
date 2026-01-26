"""Trade router for atomic swap engine."""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlmodel import SQLModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import get_session
from app.models import Inventory, Wallet, Status, Transaction, TransactionType
from app.auth import get_user_id_from_token

router = APIRouter(prefix="/trade", tags=["trade"])


# Auth helper
async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Get user ID from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    return get_user_id_from_token(authorization)


# Request models
class ReceiveItem(SQLModel):
    """Item being received in trade."""
    external_id: Optional[str] = None
    name: str
    image_url: Optional[str] = None
    item_data: Optional[Dict[str, Any]] = None


class SwapRequest(SQLModel):
    """Request model for atomic swap."""
    give_items: List[int]  # List of inventory item IDs to remove
    receive_items: List[ReceiveItem]  # List of items to add
    give_money: float = 0.0  # Money being given
    receive_money: float = 0.0  # Money being received


class SwapResponse(SQLModel):
    """Response model for atomic swap."""
    message: str
    removed_items_count: int
    added_items_count: int
    wallet_balance: float


# Get or create wallet helper (reused from wallet router)
async def get_wallet(session: AsyncSession, user_id: str, commit: bool = False) -> Wallet:
    """
    Get wallet, create if doesn't exist.
    
    Args:
        session: Database session
        user_id: User ID
        commit: If True, commit immediately (for standalone use). 
                If False, add to session without committing (for use in transactions)
    """
    result = await session.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        session.add(wallet)
        if commit:
            await session.commit()
            await session.refresh(wallet)
    
    return wallet


@router.post("/swap", response_model=SwapResponse)
async def atomic_swap(
    request: SwapRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """
    Execute an atomic swap (demo version).
    
    For demo purposes:
    - Removes items being given from user's inventory
    - Adds items being received to user's inventory
    - Updates wallet balance (subtracts give_money, adds receive_money)
    """
    # Validate request
    if not request.give_items and not request.receive_items and request.give_money == 0 and request.receive_money == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Swap must include at least one item or money amount"
        )
    
    if request.give_money < 0 or request.receive_money < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Money amounts cannot be negative"
        )
    
    # Step 1: Verify and remove items being given
    removed_count = 0
    give_items_details = []  # Store card details before deletion
    if request.give_items:
        # Verify all items belong to the user
        result = await session.execute(
            select(Inventory).where(
                Inventory.id.in_(request.give_items),
                Inventory.user_id == user_id
            )
        )
        items_to_remove = result.scalars().all()
        
        if len(items_to_remove) != len(request.give_items):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more items not found or do not belong to user"
            )
        
        # Store card details before deletion
        for item in items_to_remove:
            card_value = 0.0
            if item.item_data and isinstance(item.item_data, dict):
                # Try to get market_price from item_data
                card_value = item.item_data.get("market_price", 0.0) or 0.0
            
            give_items_details.append({
                "name": item.name,
                "value": float(card_value),
                "image_url": item.image_url,
            })
            await session.delete(item)
        removed_count = len(items_to_remove)
    
    # Step 2: Add items being received
    added_count = 0
    receive_items_details = []  # Store card details
    if request.receive_items:
        for receive_item in request.receive_items:
            # Extract card value from item_data
            card_value = 0.0
            if receive_item.item_data and isinstance(receive_item.item_data, dict):
                card_value = receive_item.item_data.get("market_price", 0.0) or 0.0
            
            receive_items_details.append({
                "name": receive_item.name,
                "value": float(card_value),
                "image_url": receive_item.image_url,
            })
            
            # Create new inventory item with VAULTED status
            new_item = Inventory(
                user_id=user_id,
                name=receive_item.name,
                image_url=receive_item.image_url,
                status=Status.VAULTED,
                collectible_type="card",  # Default to card for demo
                external_id=receive_item.external_id,
                external_api="pokemon-tcg" if receive_item.external_id else None,
                item_data=receive_item.item_data,
                submitted_at=datetime.utcnow(),
                vaulted_at=datetime.utcnow(),
            )
            session.add(new_item)
            added_count += 1
    
    # Step 3: Update wallet balance
    # Don't commit wallet creation separately - include in main transaction
    wallet = await get_wallet(session, user_id, commit=False)
    
    # Validate sufficient balance for money being given
    if request.give_money > 0:
        if wallet.balance < request.give_money:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient balance. Current: ${wallet.balance:.2f}, Required: ${request.give_money:.2f}"
            )
        wallet.balance -= request.give_money
    
    # Add money being received
    if request.receive_money > 0:
        wallet.balance += request.receive_money
    
    wallet.updated_at = datetime.utcnow()
    
    # Step 4: Create transaction record
    # Calculate net money change
    net_money_change = request.receive_money - request.give_money
    
    # Create description
    give_items_desc = f"{removed_count} item(s)" if removed_count > 0 else ""
    receive_items_desc = f"{added_count} item(s)" if added_count > 0 else ""
    money_desc_parts = []
    if request.give_money > 0:
        money_desc_parts.append(f"gave ${request.give_money:.2f}")
    if request.receive_money > 0:
        money_desc_parts.append(f"received ${request.receive_money:.2f}")
    
    description_parts = []
    if give_items_desc:
        description_parts.append(f"Traded {give_items_desc}")
    if receive_items_desc:
        description_parts.append(f"for {receive_items_desc}")
    if money_desc_parts:
        description_parts.append("(" + ", ".join(money_desc_parts) + ")")
    
    description = " ".join(description_parts) if description_parts else "Trade completed"
    
    # Create transaction
    transaction = Transaction(
        user_id=user_id,
        transaction_type=TransactionType.TRADE,
        description=description,
        amount=net_money_change,  # Positive if received more, negative if gave more
        balance_after=wallet.balance,
        transaction_data={
            "give_items": request.give_items,
            "give_items_details": give_items_details,  # Card names, values, images
            "receive_items_count": added_count,
            "receive_items_details": receive_items_details,  # Card names, values, images
            "give_money": request.give_money,
            "receive_money": request.receive_money,
            "removed_items_count": removed_count,
        }
    )
    session.add(transaction)
    
    # Commit all changes atomically
    try:
        await session.commit()
        await session.refresh(wallet)
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete swap: {str(e)}"
        )
    
    return SwapResponse(
        message="Swap completed successfully",
        removed_items_count=removed_count,
        added_items_count=added_count,
        wallet_balance=wallet.balance
    )


