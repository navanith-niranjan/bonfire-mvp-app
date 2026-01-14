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
async def get_session() -> AsyncSession:
    """Get an async database session for SQLModel operations (FastAPI dependency)."""
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


# 3. Helper: Create Tables
# We run this when the app starts up
async def init_db():
    """Initialize database tables (create tables if they don't exist)."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


# Supabase client functions (for REST API operations)
def get_supabase_client() -> Client:
    """Create and return a Supabase client instance using publishable key."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)


def get_supabase_admin_client() -> Client:
    """Create and return a Supabase admin client using secret key (bypasses RLS)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)

