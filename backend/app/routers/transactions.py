"""Transactions router for viewing transaction history."""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlmodel import SQLModel
from typing import Optional, List
from datetime import datetime
from app.database import get_session
from app.models import Transaction, TransactionType
from app.auth import get_user_id_from_token

router = APIRouter(prefix="/transactions", tags=["transactions"])


# Auth helper
async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Get user ID from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    return get_user_id_from_token(authorization)


# Response models
class TransactionResponse(SQLModel):
    """Response model for transaction."""
    id: int
    user_id: str
    transaction_type: str
    description: str
    amount: float
    balance_after: float
    transaction_data: Optional[dict]
    created_at: datetime


@router.get("", response_model=List[TransactionResponse])
async def get_transactions(
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by transaction type"),
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Get user's transaction history."""
    query = select(Transaction).where(
        Transaction.user_id == user_id
    )
    
    # Filter by type if provided
    if transaction_type:
        query = query.where(Transaction.transaction_type == transaction_type)
    
    # Order by most recent first
    query = query.order_by(desc(Transaction.created_at))
    
    # Pagination
    query = query.limit(limit).offset(offset)
    
    result = await session.execute(query)
    transactions = result.scalars().all()
    
    return transactions
