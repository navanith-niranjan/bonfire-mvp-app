from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Enum, JSON
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import enum


class Wallet(SQLModel, table=True):
    """Wallet model for storing user wallet balances."""
    __tablename__ = "wallets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, description="Supabase user ID")
    balance: float = Field(default=0.0, description="Current wallet balance")
    created_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when wallet was created"
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
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
        default_factory=lambda: datetime.now(timezone.utc),
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
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when record was created"
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when record was last updated"
    )


