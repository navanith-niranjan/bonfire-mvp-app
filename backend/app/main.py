from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import wallet, inventory, trade, cards, transactions, oauth_callback
from app.database import init_db, get_supabase_client
from app import models  # Import models so SQLModel knows about them


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔥 Bonfire is heating up...")
    await init_db()  # Creates tables in Supabase automatically
    yield
    print("🧊 Bonfire is cooling down...")


app = FastAPI(
    lifespan=lifespan,
    title="Bonfire MVP API",
    description="Backend API for Bonfire MVP application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(wallet.router)
app.include_router(inventory.router)
app.include_router(trade.router)
app.include_router(cards.router)
app.include_router(transactions.router)
app.include_router(oauth_callback.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Bonfire MVP API"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

