from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlmodel import SQLModel
from typing import Optional
from datetime import datetime
from app.database import get_session
from app.models import Wallet, Transaction, TransactionType
from app.auth import get_user_id_from_token

router = APIRouter(prefix="/wallet", tags=["wallet"])


# Simple request models
class AmountRequest(SQLModel):
    amount: float


# Auth helper
async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Get user ID from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    return get_user_id_from_token(authorization)


# Get or create wallet helper
async def get_wallet(session: AsyncSession, user_id: str) -> Wallet:
    """Get wallet, create if doesn't exist."""
    result = await session.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        session.add(wallet)
        await session.commit()
        await session.refresh(wallet)
    
    return wallet


@router.get("/balance")
async def get_balance(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Get wallet balance."""
    wallet = await get_wallet(session, user_id)
    return {"balance": wallet.balance}


@router.post("/deposit")
async def deposit(
    request: AmountRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Deposit funds."""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await get_wallet(session, user_id)
    wallet.balance += request.amount
    wallet.updated_at = datetime.utcnow()
    
    # Create transaction record
    transaction = Transaction(
        user_id=user_id,
        transaction_type=TransactionType.DEPOSIT,
        description=f"Deposited ${request.amount:.2f}",
        amount=request.amount,
        balance_after=wallet.balance,
        transaction_data={"amount": request.amount}
    )
    session.add(transaction)
    
    await session.commit()
    await session.refresh(wallet)
    return {"balance": wallet.balance}


@router.post("/withdraw")
async def withdraw(
    request: AmountRequest,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_user_id)
):
    """Withdraw funds."""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    wallet = await get_wallet(session, user_id)
    
    if wallet.balance < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    wallet.balance -= request.amount
    wallet.updated_at = datetime.utcnow()
    
    # Create transaction record
    transaction = Transaction(
        user_id=user_id,
        transaction_type=TransactionType.WITHDRAW,
        description=f"Withdrew ${request.amount:.2f}",
        amount=-request.amount,  # Negative for withdrawal
        balance_after=wallet.balance,
        transaction_data={"amount": request.amount}
    )
    session.add(transaction)
    
    await session.commit()
    await session.refresh(wallet)
    return {"balance": wallet.balance}


