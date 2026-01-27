import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Pokemon TCG API Configuration
    POKEMON_TCG_API_URL: str = os.getenv("POKEMON_TCG_API_URL", "")
    POKEMON_TCG_API_KEY: str = os.getenv("POKEMON_TCG_API_KEY", "")
    
    # App Configuration
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Resend Email Configuration
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_TEMPLATE_ID: str = os.getenv("RESEND_TEMPLATE_ID", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "")


settings = Settings()

