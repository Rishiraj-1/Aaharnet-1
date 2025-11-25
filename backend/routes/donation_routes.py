"""
Donation Routes
Handles donation creation, claiming, and management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from datetime import datetime
from dependencies import get_current_user
from utils.firebase_helpers import FirebaseHelper
from config.firebase_config import firebase_config

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class DonationCreate(BaseModel):
    donorId: str
    lat: float
    lng: float
    qtyKg: float
    foodType: str
    imageUrl: Optional[str] = None
    freshnessScore: Optional[float] = None

class DonationClaim(BaseModel):
    donationId: str
    ngoId: Optional[str] = None

class DonationUpdate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    qtyKg: Optional[float] = None
    foodType: Optional[str] = None
    imageUrl: Optional[str] = None
    freshnessScore: Optional[float] = None
    status: Optional[str] = None

class DonationResponse(BaseModel):
    id: str
    donorId: str
    lat: float
    lng: float
    qtyKg: float
    foodType: str
    freshnessScore: Optional[float]
    status: str
    createdAt: str
    imageUrl: Optional[str] = None

@router.post("/donations", response_model=DonationResponse)
async def create_donation(
    donation_data: DonationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new donation
    """
    logger.info(f"Received donation creation request from user {current_user.get('uid')}")
    logger.info(f"Donation data: lat={donation_data.lat}, lng={donation_data.lng}, qtyKg={donation_data.qtyKg}, foodType={donation_data.foodType}")
    
    try:
        # Verify user is the donor
        if donation_data.donorId != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create donations for yourself"
            )

        # Get Firestore client
        db = firebase_config.get_firestore_client()
        
        # Get donor name from user document
        try:
            donor_doc = db.collection('users').document(donation_data.donorId).get()
            donor_name = donor_doc.get('name') if donor_doc.exists else 'Anonymous'
            
            # If name not found, try to get from current_user
            if not donor_name or donor_name == 'Anonymous':
                donor_name = current_user.get('name', 'Anonymous')
        except Exception as e:
            logger.warning(f"Could not fetch donor name: {str(e)}")
            donor_name = current_user.get('name', 'Anonymous')

        # Create donation document
        now = datetime.now()
        donation_doc = {
            'donorId': donation_data.donorId,
            'donorName': donor_name,
            'lat': donation_data.lat,
            'lng': donation_data.lng,
            'qtyKg': donation_data.qtyKg,
            'foodType': donation_data.foodType,
            'freshnessScore': donation_data.freshnessScore or 85,
            'status': 'available',
            'createdAt': now,  # Firestore will handle datetime conversion
            'imageUrl': donation_data.imageUrl
        }

        # Add to Firestore with error handling
        try:
            # Firestore add() returns a tuple: (write_result, document_reference)
            result = db.collection('donations').add(donation_doc)
            
            # Handle tuple return format
            if isinstance(result, tuple) and len(result) >= 2:
                donation_id = result[1].id
            elif hasattr(result, 'id'):
                donation_id = result.id
            else:
                # Fallback: create document with explicit ID
                import uuid
                donation_id = str(uuid.uuid4())
                db.collection('donations').document(donation_id).set(donation_doc)
            
            logger.info(f"Donation document created with ID: {donation_id}")
        except Exception as firestore_error:
            error_msg = str(firestore_error)
            logger.error(f"Firestore write error: {error_msg}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Check for quota exceeded error (429)
            if "429" in error_msg or "Quota exceeded" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Firestore quota exceeded. Please wait a moment and try again, or check your Firebase quota limits in the Firebase Console."
                )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write to database: {error_msg}"
            )

        logger.info(f"Donation created: {donation_id} by {donation_data.donorId}")

        return DonationResponse(
            id=donation_id,
            donorId=donation_data.donorId,
            lat=donation_data.lat,
            lng=donation_data.lng,
            qtyKg=donation_data.qtyKg,
            foodType=donation_data.foodType,
            freshnessScore=donation_data.freshnessScore,
            status='available',
            createdAt=now.isoformat(),
            imageUrl=donation_data.imageUrl
        )

    except Exception as e:
        logger.error(f"Error creating donation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create donation: {str(e)}"
        )

@router.post("/donations/{donation_id}/claim", response_model=Dict[str, Any])
async def claim_donation(
    donation_id: str,
    claim_data: Optional[DonationClaim] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Claim a donation (NGO action)
    """
    try:
        db = firebase_config.get_firestore_client()
        
        # Get donation document
        donation_ref = db.collection('donations').document(donation_id)
        donation_doc = donation_ref.get()

        if not donation_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation not found"
            )

        donation_data = donation_doc.to_dict()

        # Check if donation is available
        if donation_data.get('status') != 'available':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Donation is not available (status: {donation_data.get('status')})"
            )

        # Verify user is an NGO
        user_doc = db.collection('users').document(current_user['uid']).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        
        if user_data.get('user_type') != 'ngo':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only NGOs can claim donations"
            )

        # Update donation status
        donation_ref.update({
            'status': 'matched',
            'ngoId': current_user['uid'],
            'claimedAt': datetime.now()
        })

        # Create delivery task
        delivery_task = {
            'donationId': donation_id,
            'ngoId': current_user['uid'],
            'donorId': donation_data.get('donorId'),
            'status': 'pending',
            'createdAt': datetime.now()
        }
        db.collection('deliveries').add(delivery_task)

        logger.info(f"Donation {donation_id} claimed by NGO {current_user['uid']}")

        return {
            'success': True,
            'donationId': donation_id,
            'status': 'matched',
            'message': 'Donation claimed successfully'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error claiming donation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to claim donation: {str(e)}"
        )

@router.get("/donations", response_model=Dict[str, Any])
async def get_donations(
    status_filter: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all donations (with optional status filter)
    """
    try:
        db = firebase_config.get_firestore_client()
        query = db.collection('donations')

        if status_filter:
            query = query.where('status', '==', status_filter)

        docs = query.stream()
        donations = []
        for doc in docs:
            data = doc.to_dict()
            donations.append({
                'id': doc.id,
                **data
            })

        return {
            'donations': donations,
            'count': len(donations)
        }

    except Exception as e:
        logger.error(f"Error getting donations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get donations: {str(e)}"
        )

@router.put("/donations/{donation_id}", response_model=DonationResponse)
async def update_donation(
    donation_id: str,
    donation_update: DonationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a donation (only by the donor who created it)
    """
    try:
        db = firebase_config.get_firestore_client()
        
        # Get donation document
        donation_ref = db.collection('donations').document(donation_id)
        donation_doc = donation_ref.get()

        if not donation_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation not found"
            )

        donation_data = donation_doc.to_dict()

        # Verify user is the donor who created this donation
        if donation_data.get('donorId') != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own donations"
            )

        # Build update dictionary (only include fields that are provided)
        update_data = {}
        if donation_update.lat is not None:
            update_data['lat'] = donation_update.lat
        if donation_update.lng is not None:
            update_data['lng'] = donation_update.lng
        if donation_update.qtyKg is not None:
            update_data['qtyKg'] = donation_update.qtyKg
        if donation_update.foodType is not None:
            update_data['foodType'] = donation_update.foodType
        if donation_update.imageUrl is not None:
            update_data['imageUrl'] = donation_update.imageUrl
        if donation_update.freshnessScore is not None:
            update_data['freshnessScore'] = donation_update.freshnessScore
        if donation_update.status is not None:
            update_data['status'] = donation_update.status

        # Add updated timestamp
        update_data['updatedAt'] = datetime.now()

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Update donation document
        donation_ref.update(update_data)
        logger.info(f"Donation {donation_id} update data written to Firestore: {update_data}")

        # Get updated document
        updated_doc = donation_ref.get()
        updated_data = updated_doc.to_dict()

        logger.info(f"Donation {donation_id} updated by {current_user['uid']}. New location: lat={updated_data.get('lat')}, lng={updated_data.get('lng')}")

        # Convert createdAt to string if it's a datetime
        created_at = updated_data.get('createdAt')
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        elif hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()

        return DonationResponse(
            id=donation_id,
            donorId=updated_data.get('donorId', ''),
            lat=updated_data.get('lat', 0),
            lng=updated_data.get('lng', 0),
            qtyKg=updated_data.get('qtyKg', 0),
            foodType=updated_data.get('foodType', ''),
            freshnessScore=updated_data.get('freshnessScore'),
            status=updated_data.get('status', 'available'),
            createdAt=created_at or datetime.now().isoformat(),
            imageUrl=updated_data.get('imageUrl')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating donation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update donation: {str(e)}"
        )

