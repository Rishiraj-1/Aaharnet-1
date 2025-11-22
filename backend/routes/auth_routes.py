"""
Authentication Routes
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import logging
from config.firebase_config import verify_firebase_token
from utils.firebase_helpers import FirebaseHelper
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    user_type: str  # donor, ngo, volunteer (keeping frontend naming)
    location: Optional[Dict[str, float]] = None
    phone: Optional[str] = None
    uid: Optional[str] = None  # Optional, will be from Firebase auth

class UserUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    phone: Optional[str] = None
    points: Optional[int] = None

class UserResponse(BaseModel):
    uid: str
    name: str
    email: str
    role: str
    location: Optional[Dict[str, float]]
    points: int
    created_at: str

class LoginRequest(BaseModel):
    token: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user in the system
    Note: Frontend handles Firebase auth and Firestore creation directly.
    This endpoint is kept for backwards compatibility but may not be used.
    """
    try:
        # Since frontend already creates user in Firestore, we can just return success
        # or handle any additional backend-specific registration logic here
        logger.info(f"User registration request for {user_data.email}")
        
        # If user_data has uid, try to fetch the existing user
        if user_data.uid:
            existing_user = FirebaseHelper.get_user_profile(user_data.uid)
            if existing_user:
                # Normalize user_type to role if needed
                if 'user_type' in existing_user and 'role' not in existing_user:
                    existing_user['role'] = existing_user.pop('user_type')
                return UserResponse(**existing_user)
        
        # If no existing user, return a success response
        # Frontend has already created the user in Firestore
        logger.info(f"User {user_data.email} registered successfully")
        
        # Return a basic response (frontend already created the user)
        return UserResponse(
            uid=user_data.uid or "",
            name=user_data.name,
            email=user_data.email,
            role=user_data.user_type,
            location=user_data.location,
            points=0,
            created_at=str(pd.Timestamp.now())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: LoginRequest):
    """
    Login user with Firebase token
    """
    try:
        # Verify Firebase token
        decoded_token = verify_firebase_token(login_data.token)
        uid = decoded_token['uid']
        
        # Get user profile
        user_profile = FirebaseHelper.get_user_profile(uid)
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update last login
        FirebaseHelper.update_user(uid, {'last_login': str(pd.Timestamp.now())})
        
        # Normalize user_type to role if needed
        if 'user_type' in user_profile and 'role' not in user_profile:
            user_profile['role'] = user_profile.pop('user_type')
        
        logger.info(f"User {uid} logged in successfully")
        
        return LoginResponse(
            token=login_data.token,
            user=UserResponse(**user_profile)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current user's profile
    """
    try:
        uid = current_user['uid']
        user_profile = FirebaseHelper.get_user_profile(uid)
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Normalize user_type to role if needed
        if 'user_type' in user_profile and 'role' not in user_profile:
            user_profile['role'] = user_profile.pop('user_type')
        
        return UserResponse(**user_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update current user's profile
    """
    try:
        uid = current_user['uid']
        
        # Prepare update data
        update_data = user_update.dict(exclude_unset=True)
        update_data['updated_at'] = str(pd.Timestamp.now())
        
        # Update user document
        success = FirebaseHelper.update_user(uid, update_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        # Get updated profile
        updated_profile = FirebaseHelper.get_user_profile(uid)
        
        # Normalize user_type to role if needed
        if 'user_type' in updated_profile and 'role' not in updated_profile:
            updated_profile['role'] = updated_profile.pop('user_type')
        
        logger.info(f"User {uid} profile updated successfully")
        
        return UserResponse(**updated_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.get("/users/{role}")
async def get_users_by_role(
    role: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all users by role (admin only)
    """
    try:
        # Check if user is admin (you might want to add admin role)
        if role not in ['donor', 'ngo', 'volunteer']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role"
            )
        
        users = FirebaseHelper.get_users_by_role(role)
        
        return {
            "role": role,
            "count": len(users),
            "users": users
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get users by role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get users"
        )

@router.post("/verify-token")
async def verify_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Verify if the current token is valid
    """
    return {
        "valid": True,
        "user": current_user
    }

# Import required modules
import pandas as pd
from config.firebase_config import firebase_config
