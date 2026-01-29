"""Card search router with full-text search."""
from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlmodel import SQLModel
from typing import Optional, List
from app.database import get_session
from app.models import PokemonCard

router = APIRouter(prefix="/cards", tags=["cards"])


class CardResponse(SQLModel):
    """Response model for card search."""
    id: int
    external_id: str
    name: str
    set_name: Optional[str]
    number: Optional[str]
    rarity: Optional[str]
    supertype: Optional[str]
    subtypes: Optional[List[str]]
    image_small: Optional[str]
    image_large: Optional[str]
    language: Optional[str]
    name_jp: Optional[str]
    market_price: Optional[float]
    price_source: Optional[str]


@router.get("/search", response_model=List[CardResponse])
async def search_cards(
    q: str = Query("", description="Search query"),
    language: Optional[str] = Query(None, description="Filter by language: en, ja"),
    sort_by: str = Query("relevance", description="Sort by: relevance, price"),
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    session: AsyncSession = Depends(get_session)
):
    """
    Search Pokemon cards using full-text search.
    
    Supports:
    - Full-text search across name, set, number, rarity
    - Filtering by language
    - Sorting by relevance or price
    """
    query = select(PokemonCard)
    
    # Language filter
    if language:
        query = query.where(PokemonCard.language == language)
    
    # Search - use simple ILIKE for MVP (works reliably)
    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.where(
            (PokemonCard.name.ilike(search_term)) |
            (PokemonCard.set_name.ilike(search_term)) |
            (PokemonCard.number.ilike(search_term)) |
            (PokemonCard.rarity.ilike(search_term))
        )
    
    # Sort: prioritize rarest cards from recent/popular sets
    if sort_by == "price":
        query = query.order_by(PokemonCard.market_price.desc().nulls_last())
    else:  # relevance (default)
        # Use window function to get top 10 most expensive cards per set
        # Only rank cards that have a set name and a valid price
        # Create window function: rank cards by price within each set
        row_number = func.row_number().over(
            partition_by=PokemonCard.set_name,
            order_by=desc(PokemonCard.market_price).nulls_last()
        ).label('row_num')
        
        # Build the ranked query with filters and window function
        ranked_query = select(
            PokemonCard.id.label('card_id'),
            row_number
        ).where(
            PokemonCard.set_name.isnot(None),  # Must have a set name
            PokemonCard.market_price.isnot(None),  # Must have a price
            PokemonCard.market_price > 0  # Price must be positive
        )
        
        # Apply the same filters
        if language:
            ranked_query = ranked_query.where(PokemonCard.language == language)
        if q and q.strip():
            search_term = f"%{q.strip()}%"
            ranked_query = ranked_query.where(
                (PokemonCard.name.ilike(search_term)) |
                (PokemonCard.set_name.ilike(search_term)) |
                (PokemonCard.number.ilike(search_term)) |
                (PokemonCard.rarity.ilike(search_term))
            )
        
        # Convert to subquery
        ranked_subquery = ranked_query.subquery()
        
        # Filter to top 10 per set and get card IDs
        top_10_ids = select(ranked_subquery.c.card_id).where(
            ranked_subquery.c.row_num <= 10
        )
        
        # Select the actual cards that are in top 10 per set
        # Order by price first (most expensive overall), then by recency
        query = select(PokemonCard).where(
            PokemonCard.id.in_(top_10_ids)
        ).order_by(
            PokemonCard.market_price.desc().nulls_last(),  # Most expensive cards first
            PokemonCard.created_at.desc().nulls_last()    # Then most recent sets
        )
    
    # Pagination
    query = query.limit(limit).offset(offset)
    
    # Execute
    result = await session.execute(query)
    cards = result.scalars().all()
    
    return cards


@router.get("/popular", response_model=List[CardResponse])
async def get_popular_cards(
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    """Get popular cards: top N by market price (only cards with valid price and set)."""
    # Simple, robust query: top cards by price (with set_name to avoid fully empty results)
    query = (
        select(PokemonCard)
        .where(PokemonCard.market_price.isnot(None))
        .where(PokemonCard.market_price > 0)
        .order_by(
            PokemonCard.market_price.desc().nulls_last(),
            PokemonCard.created_at.desc().nulls_last(),
        )
        .limit(limit)
    )
    result = await session.execute(query)
    cards = result.scalars().all()
    return cards


@router.get("/{card_id}", response_model=CardResponse)
async def get_card(
    card_id: int,
    session: AsyncSession = Depends(get_session)
):
    """Get a single card by ID."""
    result = await session.execute(
        select(PokemonCard).where(PokemonCard.id == card_id)
    )
    card = result.scalar_one_or_none()
    
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    return card
