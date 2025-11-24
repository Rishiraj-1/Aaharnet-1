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
    location: Optional[Dict[str, float]] = None
    points: int = 0
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
                # Ensure required fields have defaults
                if 'location' not in existing_user:
                    existing_user['location'] = None
                if 'points' not in existing_user:
                    existing_user['points'] = 0
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
        
        # Ensure required fields have defaults
        if 'location' not in user_profile:
            user_profile['location'] = None
        if 'points' not in user_profile:
            user_profile['points'] = 0
        
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
        
        # Ensure required fields have defaults
        if 'location' not in updated_profile:
            updated_profile['location'] = None
        if 'points' not in updated_profile:
            updated_profile['points'] = 0
        
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

class RoleSetIn(BaseModel):
    role: str  # donor|ngo|volunteer

@router.post("/set-role")
async def set_role(
    payload: RoleSetIn,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Set user role as Firebase custom claim
    Only allows donor, ngo, volunteer roles (admin must be set separately)
    """
    from firebase_admin import auth as fb_auth
    
    uid = current_user.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload"
        )
    
    requested_role = payload.role
    
    # Only allow these roles via registration
    if requested_role not in ("donor", "ngo", "volunteer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Only donor, ngo, or volunteer allowed."
        )
    
    try:
        # Get existing user to check current claims
        user = fb_auth.get_user(uid)
        existing_claims = user.custom_claims or {}
        
        # Prevent overriding an admin
        if existing_claims.get("admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot change admin role"
            )
        
        # Set custom claims (merge with existing claims to preserve admin if set)
        new_claims = {**existing_claims, "role": requested_role}
        fb_auth.set_custom_user_claims(uid, new_claims)
        
        logger.info(f"Set role '{requested_role}' for user {uid}")
        
        return {
            "ok": True,
            "role": requested_role,
            "message": f"Role set to {requested_role}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set role: {str(e)}"
        )

class SetAdminIn(BaseModel):
    uid: str

@router.post("/admin/set-admin")
async def set_admin(
    payload: SetAdminIn,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Set admin role for a user (admin only)
    """
    from firebase_admin import auth as fb_auth
    from utils.deps import require_admin
    
    # Verify current user is admin
    is_admin = current_user.get("admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    target_uid = payload.uid
    
    try:
        # Get existing user
        user = fb_auth.get_user(target_uid)
        existing_claims = user.custom_claims or {}
        
        # Set admin claim (preserve existing role if any)
        new_claims = {**existing_claims, "admin": True, "role": "admin"}
        fb_auth.set_custom_user_claims(target_uid, new_claims)
        
        logger.info(f"Admin {current_user.get('uid')} set admin role for user {target_uid}")
        
        return {
            "ok": True,
            "message": f"Admin role set for user {target_uid}",
            "uid": target_uid
        }
    except fb_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        logger.error(f"Failed to set admin role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set admin role: {str(e)}"
        )

@router.get("/admin/users")
async def list_users(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all users (admin only)
    """
    from firebase_admin import auth as fb_auth
    
    # Verify current user is admin
    is_admin = current_user.get("admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # List users (Firebase Admin SDK)
        users = []
        page = fb_auth.list_users()
        
        while page:
            for user in page.users:
                # Get custom claims
                custom_claims = user.custom_claims or {}
                role = custom_claims.get("role", "donor")
                is_user_admin = custom_claims.get("admin", False)
                
                users.append({
                    "uid": user.uid,
                    "email": user.email,
                    "display_name": user.display_name,
                    "email_verified": user.email_verified,
                    "disabled": user.disabled,
                    "created_at": user.user_metadata.creation_timestamp if hasattr(user.user_metadata, 'creation_timestamp') else None,
                    "last_sign_in": user.user_metadata.last_sign_in_timestamp if hasattr(user.user_metadata, 'last_sign_in_timestamp') else None,
                    "role": "admin" if is_user_admin else role,
                    "admin": is_user_admin
                })
            
            # Get next page
            page = page.get_next_page() if page.has_next_page else None
        
        return {
            "users": users,
            "count": len(users)
        }
    except Exception as e:
        logger.error(f"Failed to list users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )

class SeedDataRequest(BaseModel):
    force: bool = False  # Force seed even if data exists

@router.post("/admin/seed-data")
async def seed_data_endpoint(
    request: SeedDataRequest = SeedDataRequest(),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually trigger data seeding (admin only)
    """
    # Verify current user is admin
    is_admin = current_user.get("admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        from utils.seed_map_data import seed_map_data_to_firestore
        from utils.auto_seed import should_seed_data
        
        # Check if data exists (unless force is True)
        if not request.force and not should_seed_data():
            return {
                "message": "Data already exists. Use force=true to overwrite.",
                "seeded": False
            }
        
        logger.info(f"Admin {current_user.get('uid')} triggered data seeding (force={request.force})")
        seed_map_data_to_firestore()
        
        return {
            "message": "Data seeded successfully",
            "seeded": True
        }
    except Exception as e:
        logger.error(f"Failed to seed data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed data: {str(e)}"
        )

# Import required modules
import pandas as pd
from config.firebase_config import firebase_config
from pydantic import BaseModel
