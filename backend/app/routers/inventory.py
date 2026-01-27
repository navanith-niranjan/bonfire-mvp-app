"""Inventory router for search and vault endpoints."""
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlmodel import SQLModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import get_session
from app.models import Inventory, Status, Transaction, TransactionType, Wallet
from app.auth import get_user_id_from_token, get_user_email_from_token, get_user_name_from_token
from app.email import send_vault_confirmation_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["inventory"])


# Auth helper
async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Get user ID from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    return get_user_id_from_token(authorization)


# Request/Response models
class InventoryItemRequest(SQLModel):
    """Request model for creating a single inventory item."""
    name: str
    image_url: Optional[str] = None
    collectible_type: str = "card"
    external_id: Optional[str] = None
    external_api: Optional[str] = None
    item_data: Optional[Dict[str, Any]] = None


class CreateInventoryItemsRequest(SQLModel):
    """Request model for creating multiple inventory items."""
    items: List[InventoryItemRequest]


class InventoryItemResponse(SQLModel):
    """Response model for inventory item."""
    id: int
    user_id: str
    name: str
    image_url: Optional[str]
    status: str
    collectible_type: str
    external_id: Optional[str]
    external_api: Optional[str]
    item_data: Optional[Dict[str, Any]]
    submitted_at: Optional[datetime]
    vaulted_at: Optional[datetime]
    created_at: Optional[datetime]


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


@router.post("/items", response_model=List[InventoryItemResponse])
async def create_inventory_items(
    request: CreateInventoryItemsRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id),
    authorization: Optional[str] = Header(None)
):
    """Create multiple inventory items for the authenticated user."""
    created_items = []
    items_details = []  # Store card details for transaction
    
    for item_data in request.items:
        # Extract card value from item_data if available
        card_value = 0.0
        if item_data.item_data and isinstance(item_data.item_data, dict):
            card_value = item_data.item_data.get("market_price", 0.0) or 0.0
        
        items_details.append({
            "name": item_data.name,
            "value": float(card_value),
            "image_url": item_data.image_url,
        })
        
        # Create inventory item with VAULTED status (mock MVP)
        inventory_item = Inventory(
            user_id=user_id,
            name=item_data.name,
            image_url=item_data.image_url,
            status=Status.VAULTED,  # Immediately vaulted for mock MVP
            collectible_type=item_data.collectible_type,
            external_id=item_data.external_id,
            external_api=item_data.external_api,
            item_data=item_data.item_data,
            submitted_at=datetime.utcnow(),
            vaulted_at=datetime.utcnow(),  # Set vaulted_at immediately
        )
        session.add(inventory_item)
        created_items.append(inventory_item)
    
    # Get wallet for transaction (balance doesn't change, but we need it for transaction record)
    wallet = await get_wallet(session, user_id, commit=False)
    
    # Create transaction record for submission
    total_value = sum(item["value"] for item in items_details)
    description = f"Submitted {len(created_items)} item(s) to inventory"
    if len(created_items) == 1:
        description = f"Submitted {created_items[0].name} to inventory"
    
    transaction = Transaction(
        user_id=user_id,
        transaction_type=TransactionType.SUBMIT,
        description=description,
        amount=0.0,  # No money change for submission
        balance_after=wallet.balance,
        transaction_data={
            "items_count": len(created_items),
            "items_details": items_details,
        }
    )
    session.add(transaction)
    
    await session.commit()
    
    # Refresh all items and transaction to get their IDs
    for item in created_items:
        await session.refresh(item)
    await session.refresh(transaction)
    
    # Send confirmation email (non-blocking - don't fail request if email fails)
    if authorization:
        try:
            user_email = get_user_email_from_token(authorization)
            user_name = get_user_name_from_token(authorization) or "User"
            
            # Generate vault ID from transaction ID
            vault_id = f"VLT-{transaction.id}" if transaction.id else f"VLT-{user_id[:8]}"
            
            # Prepare items_details with item_data for email formatting
            email_items_details = []
            for i, item_detail in enumerate(items_details):
                email_item = item_detail.copy()
                # Add item_data from the corresponding created item if available
                if i < len(created_items) and created_items[i].item_data:
                    email_item["item_data"] = created_items[i].item_data
                email_items_details.append(email_item)
            
            # Send email asynchronously (fire and forget)
            # Run in background thread to avoid blocking the response
            asyncio.create_task(
                asyncio.to_thread(
                    send_vault_confirmation_email,
                    user_email,
                    user_name,
                    email_items_details,
                    vault_id
                )
            )
        except Exception as e:
            # Log error but don't fail the request
            logger.error(f"Failed to send vault confirmation email: {str(e)}", exc_info=True)
    
    return created_items


@router.get("/vault", response_model=List[InventoryItemResponse])
async def get_vault(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Get user's vault items (items with VAULTED status)."""
    result = await session.execute(
        select(Inventory).where(
            Inventory.user_id == user_id,
            Inventory.status == Status.VAULTED
        ).order_by(Inventory.vaulted_at.desc())
    )
    items = result.scalars().all()
    return items


@router.delete("/items", response_model=Dict[str, Any])
async def delete_inventory_items(
    item_ids: str = Query(..., alias="item_ids", description="Comma-separated list of item IDs"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Delete multiple inventory items for the authenticated user."""
    # Parse comma-separated item IDs
    try:
        parsed_ids = [int(id_str.strip()) for id_str in item_ids.split(',') if id_str.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item IDs format")
    
    if not parsed_ids:
        raise HTTPException(status_code=400, detail="No item IDs provided")
    
    # Verify all items belong to the user
    result = await session.execute(
        select(Inventory).where(
            Inventory.id.in_(parsed_ids),
            Inventory.user_id == user_id
        )
    )
    items = result.scalars().all()
    
    if len(items) != len(parsed_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more items not found or do not belong to user"
        )
    
    # Store card details before deletion for transaction
    items_details = []
    for item in items:
        card_value = 0.0
        if item.item_data and isinstance(item.item_data, dict):
            card_value = item.item_data.get("market_price", 0.0) or 0.0
        
        items_details.append({
            "name": item.name,
            "value": float(card_value),
            "image_url": item.image_url,
        })
    
    # Get wallet for transaction (balance doesn't change, but we need it for transaction record)
    wallet = await get_wallet(session, user_id, commit=False)
    
    # Create transaction record for redemption
    description = f"Redeemed {len(items)} item(s) from inventory"
    if len(items) == 1:
        description = f"Redeemed {items[0].name} from inventory"
    
    try:
        transaction = Transaction(
            user_id=user_id,
            transaction_type=TransactionType.REDEEM,
            description=description,
            amount=0.0,  # No money change for redemption
            balance_after=wallet.balance,
            transaction_data={
                "items_count": len(items),
                "items_details": items_details,
            }
        )
        session.add(transaction)
        
        # Delete all items
        for item in items:
            await session.delete(item)
        
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to redeem items: {str(e)}"
        )
    
    return {"message": f"Successfully deleted {len(items)} item(s)", "deleted_count": len(items)}


@router.get("/search")
async def search_items():
    """Search inventory items."""
    # TODO: Implement search logic
    return {"items": []}


