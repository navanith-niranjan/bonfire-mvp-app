"""Inventory router for search and vault endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlmodel import SQLModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.database import get_session
from app.models import Inventory, Status
from app.auth import get_user_id_from_token

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


@router.post("/items", response_model=List[InventoryItemResponse])
async def create_inventory_items(
    request: CreateInventoryItemsRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Create multiple inventory items for the authenticated user."""
    created_items = []
    
    for item_data in request.items:
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
    
    await session.commit()
    
    # Refresh all items to get their IDs
    for item in created_items:
        await session.refresh(item)
    
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
    item_ids: str = Query(..., description="Comma-separated list of item IDs"),
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
    
    # Delete all items
    for item in items:
        await session.delete(item)
    
    await session.commit()
    
    return {"message": f"Successfully deleted {len(items)} item(s)", "deleted_count": len(items)}


@router.get("/search")
async def search_items():
    """Search inventory items."""
    # TODO: Implement search logic
    return {"items": []}


