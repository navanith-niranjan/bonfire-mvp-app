"""Authentication module for decoding Supabase JWT tokens using JWKS."""
import jwt
from jwt import PyJWKClient
from typing import Optional
from fastapi import HTTPException, status
from app.config import settings

# Cache for JWKS client (fetches keys from Supabase)
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> PyJWKClient:
    """
    Get or create a JWKS client for Supabase token verification.
    Uses the JWKS endpoint to fetch public keys for token verification.
    """
    global _jwks_client
    if _jwks_client is None:
        if not settings.SUPABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_URL not configured"
            )
        # Supabase JWKS endpoint
        jwks_url = f"{settings.SUPABASE_URL}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def decode_jwt_token(token: str) -> dict:
    """
    Decode and verify a Supabase JWT token using JWKS (JSON Web Key Set).
    
    Supabase now uses RS256 (RSA) signing with JWKS instead of the legacy
    HS256 secret. This method fetches the public keys from Supabase's JWKS
    endpoint and verifies the token signature.
    
    Args:
        token: The JWT token string (with or without 'Bearer ' prefix)
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith("Bearer "):
            token = token[7:]
        
        # Get JWKS client and signing key
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify token using the public key from JWKS
        # Supabase uses RS256 algorithm with JWKS
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_signature": True, "verify_exp": True}
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


def get_user_id_from_token(token: str) -> str:
    """
    Extract user ID from JWT token.
    
    Args:
        token: The JWT token string
        
    Returns:
        User ID (sub claim from token)
    """
    decoded = decode_jwt_token(token)
    return decoded.get("sub", "")

