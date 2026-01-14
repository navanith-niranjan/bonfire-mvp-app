"""Wallet router for deposit and balance endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance")
async def get_balance():
    """Get wallet balance."""
    # TODO: Implement balance retrieval
    return {"balance": 0.0}


@router.post("/deposit")
async def deposit():
    """Deposit funds to wallet."""
    # TODO: Implement deposit logic
    return {"message": "Deposit endpoint - to be implemented"}


