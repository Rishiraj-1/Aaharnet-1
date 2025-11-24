"""
FastAPI Dependencies for Role-Based Access Control
"""

from fastapi import Request, HTTPException, Depends, status
from firebase_admin import auth as fb_auth
from typing import Dict, Any, List
from config.firebase_config import verify_firebase_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def verify_token_and_get_claims(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify Firebase token and return decoded token with claims
    """
    try:
        token = credentials.credentials
        decoded = verify_firebase_token(token)
        return decoded
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(*allowed_roles: str):
    """
    Dependency factory that requires user to have one of the specified roles
    Admins bypass all role checks
    
    Note: Firebase custom claims are directly in the decoded token, not nested
    """
    def _checker(decoded: Dict[str, Any] = Depends(verify_token_and_get_claims)) -> Dict[str, Any]:
        # Custom claims are directly in the decoded token
        # Firebase Admin SDK puts them at the root level of the decoded token
        role = decoded.get("role")
        is_admin = decoded.get("admin", False)
        
        # Admins bypass role checks
        if is_admin:
            return decoded
        
        # Check if user has required role
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}"
            )
        
        return decoded
    
    return _checker

def require_admin(decoded: Dict[str, Any] = Depends(verify_token_and_get_claims)) -> Dict[str, Any]:
    """
    Dependency that requires admin role
    """
    is_admin = decoded.get("admin", False)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return decoded

# Alias for backward compatibility
get_current_user = verify_token_and_get_claims

