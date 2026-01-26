from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from supabase import create_client, Client
from app.config import settings

# 1. Create the Connection Engine (Async)
# ⚠️ CRITICAL: Use NullPool for Supabase Transaction Mode (Port 6543)
# Let Supavisor (Supabase's pooler) manage connections, not the app
# This prevents connection exhaustion and memory issues
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool,  # Let external pooler manage connections
    connect_args={
        # CRITICAL: Disables statement caching, fixing Transaction Mode conflict
        # Prepared statements don't work with Transaction Mode connection swapping
        "statement_cache_size": 0,
        # Ensures asyncpg also respects the cache being disabled
        "prepared_statement_cache_size": 0,
    },
)

# 2. Dependency: Get a Database Session
# You will use this in every API route: `async def route(session: AsyncSession = Depends(get_session))`
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_session() -> AsyncSession:
    """Get an async database session for SQLModel operations (FastAPI dependency)."""
    async with async_session() as session:
        yield session


# 3. Helper: Create Tables
# We run this when the app starts up
async def init_db():
    """Initialize database tables (create tables if they don't exist)."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # Check if database is empty and sync if needed (non-blocking)
    async with async_session() as session:
        from sqlalchemy import select, func
        from app.models import PokemonCard
        
        result = await session.execute(select(func.count(PokemonCard.id)))
        count = result.scalar() or 0
        
        if count == 0:
            print("📦 Database is empty - starting initial card sync in background...")
            # Start sync in background (non-blocking)
            import asyncio
            asyncio.create_task(sync_cards_if_needed())
        else:
            print(f"✅ Database has {count} cards - skipping auto-sync")


async def sync_cards_if_needed():
    """Sync cards from Pokemon TCG API (runs in background)."""
    try:
        # Import sync function from script
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from scripts.sync_cards import sync_all_cards
        await sync_all_cards()
    except Exception as e:
        print(f"❌ Error syncing cards: {e}")


# Supabase client functions (for REST API operations)
def get_supabase_client() -> Client:
    """Create and return a Supabase client instance using publishable key."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)


def get_supabase_admin_client() -> Client:
    """Create and return a Supabase admin client using secret key (bypasses RLS)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)

