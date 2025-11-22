"""
Shared Dependencies for FastAPI Routes
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config.firebase_config import verify_firebase_token

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase JWT token and return decoded user information
    
    Args:
        credentials: HTTP Bearer token from request header
        
    Returns:
        Decoded token containing user information
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    try:
        token = credentials.credentials
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

