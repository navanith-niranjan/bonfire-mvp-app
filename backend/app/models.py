from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Enum, JSON, Numeric, ARRAY, Text
from typing import Optional, Dict, Any, List
from datetime import datetime
import enum


class Wallet(SQLModel, table=True):
    """Wallet model for storing user wallet balances."""
    __tablename__ = "wallets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, description="Supabase user ID")
    balance: float = Field(default=0.0, description="Current wallet balance")
    created_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when wallet was created"
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when wallet was last updated"
    )


class Status(str, enum.Enum):
    """Status of an item in the inventory."""
    PENDING = "pending"  # User submitted, waiting for authentication
    AUTHENTICATING = "authenticating"  # Currently being authenticated
    AUTHENTICATED = "authenticated"  # Authentication complete
    VAULTED = "vaulted"  # Stored in vault (authenticated and stored)
    REJECTED = "rejected"  # Authentication failed/rejected
    TRADING = "trading"  # Currently in a trade/swap


class Inventory(SQLModel, table=True):
    """Inventory model for storing user's items."""
    __tablename__ = "inventory"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, description="Supabase user ID")
    
    name: str = Field(description="Name of the item")
    image_url: Optional[str] = Field(
        default=None,
        description="URL to item image"
    )
    status: Status = Field(
        default=Status.PENDING,
        sa_column=Column(Enum(Status)),
        description="Current status of the item"
    )
    
    collectible_type: str = Field(
        default=None,
        index=True,
        description="Type of collectible (e.g., 'card', 'comic', 'action_figure')"
    )
    
    # Third-party API reference (optional)
    external_id: Optional[str] = Field(
        default=None,
        index=True,
        description="ID from third-party API (e.g., TCGPlayer, eBay)"
    )
    external_api: Optional[str] = Field(
        default=None,
        description="Name of third-party API (e.g., 'tcgplayer', 'ebay')"
    )
    
    # Flexible data for type-specific information (JSON)
    # Examples:
    # - Card: {"condition": "PSA 10", "set": "Base Set", "rarity": "Rare"}
    # - Comic: {"issue": 1, "publisher": "Marvel", "grade": "9.8"}
    # - Action Figure: {"series": "Star Wars", "manufacturer": "Hasbro", "year": 2020}
    # Note: Named 'item_data' instead of 'metadata' because 'metadata' is reserved by SQLAlchemy
    item_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Type-specific data stored as JSON"
    )
    
    notes: Optional[str] = Field(
        default=None,
        description="Notes about this item"
    )
    
    # Timestamps
    submitted_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="When user submitted/added this item"
    )
    authenticated_at: Optional[datetime] = Field(
        default=None,
        description="When item was authenticated (if applicable)"
    )
    vaulted_at: Optional[datetime] = Field(
        default=None,
        description="When item was moved to vault"
    )
    created_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when record was created"
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when record was last updated"
    )


class PokemonCard(SQLModel, table=True):
    """Pokemon card model with full-text search support."""
    __tablename__ = "pokemon_cards"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # External API reference
    external_id: str = Field(unique=True, index=True, description="Pokemon TCG API card ID")
    
    # Core card data
    name: str = Field(index=True, description="Card name")
    set_name: Optional[str] = Field(default=None, index=True, description="Set name (e.g., 'Base Set', '151')")
    set_id: Optional[str] = Field(default=None, description="Set ID from API")
    number: Optional[str] = Field(default=None, index=True, description="Card number in set")
    
    # Card attributes
    rarity: Optional[str] = Field(default=None, index=True)
    supertype: Optional[str] = Field(default=None, description="Pokemon, Trainer, Energy")
    subtypes: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(Text)),
        description="Array of subtypes (e.g., ['VMAX', 'Rapid Strike'])"
    )
    
    # Images
    image_small: Optional[str] = Field(default=None)
    image_large: Optional[str] = Field(default=None)
    
    # Japanese card support
    language: Optional[str] = Field(default="en", index=True, description="Language: en, ja, etc.")
    name_jp: Optional[str] = Field(default=None, description="Japanese name if available")
    
    # Price data (can come from ANY source!)
    market_price: Optional[float] = Field(
        default=None,
        sa_column=Column(Numeric(10, 2)),
        description="Market price in USD"
    )
    price_source: Optional[str] = Field(default=None, description="Source: tcgplayer, ebay, custom, etc.")
    price_updated_at: Optional[datetime] = Field(default=None)
    
    # Full price data (JSON for flexibility)
    tcgplayer_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Full TCGPlayer price data structure"
    )
    
    # Full API response (for future use)
    raw_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Complete API response from pokemontcg.io"
    )
    
    # Timestamps
    created_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow()
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow()
    )


class TransactionType(str, enum.Enum):
    """Type of transaction."""
    TRADE = "trade"  # Trade/swap transaction
    DEPOSIT = "deposit"  # Wallet deposit
    WITHDRAW = "withdraw"  # Wallet withdrawal


class Transaction(SQLModel, table=True):
    """Transaction model for recording all user transactions."""
    __tablename__ = "transactions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, description="Supabase user ID")
    
    transaction_type: TransactionType = Field(
        sa_column=Column(Enum(TransactionType)),
        description="Type of transaction"
    )
    
    # Transaction details
    description: str = Field(description="Human-readable description of the transaction")
    
    # Money amounts
    amount: float = Field(
        default=0.0,
        sa_column=Column(Numeric(10, 2)),
        description="Transaction amount (positive for deposits/received, negative for withdrawals/given)"
    )
    
    # Balance after transaction
    balance_after: float = Field(
        sa_column=Column(Numeric(10, 2)),
        description="Wallet balance after this transaction"
    )
    
    # Transaction data (JSON for flexibility)
    # For trades: {"give_items": [1, 2], "receive_items": [3, 4], "give_money": 10.0, "receive_money": 5.0}
    # For deposits/withdrawals: {"amount": 100.0}
    # Note: Named 'transaction_data' instead of 'metadata' because 'metadata' is reserved by SQLAlchemy
    transaction_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional transaction data stored as JSON"
    )
    
    # Timestamps
    created_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when transaction was created"
    )


