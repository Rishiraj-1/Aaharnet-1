"""
Firebase Helper Functions
"""

from config.firebase_config import firebase_config
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class FirebaseHelper:
    """Helper class for Firebase operations"""
    
    @staticmethod
    def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        try:
            doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
            doc = doc_ref.get()
            return doc.to_dict() if doc.exists else None
        except Exception as e:
            logger.error(f"Error getting user profile for {uid}: {str(e)}")
            return None
    
    @staticmethod
    def create_donation(donation_data: Dict[str, Any]) -> str:
        """Create a new donation record"""
        try:
            collection_ref = firebase_config.get_firestore_client().collection('donations')
            doc_ref = collection_ref.add(donation_data)
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error creating donation: {str(e)}")
            raise e
    
    @staticmethod
    def get_donations_by_donor(donor_id: str) -> List[Dict[str, Any]]:
        """Get all donations by a specific donor"""
        try:
            docs = firebase_config.get_firestore_client().collection('donations')\
                .where('donor_id', '==', donor_id)\
                .order_by('timestamp', direction='DESCENDING')\
                .stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting donations for donor {donor_id}: {str(e)}")
            return []
    
    @staticmethod
    def create_request(request_data: Dict[str, Any]) -> str:
        """Create a new food request"""
        try:
            collection_ref = firebase_config.get_firestore_client().collection('requests')
            doc_ref = collection_ref.add(request_data)
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error creating request: {str(e)}")
            raise e
    
    @staticmethod
    def get_requests_by_ngo(ngo_id: str) -> List[Dict[str, Any]]:
        """Get all requests by a specific NGO"""
        try:
            docs = firebase_config.get_firestore_client().collection('requests')\
                .where('ngo_id', '==', ngo_id)\
                .order_by('timestamp', direction='DESCENDING')\
                .stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting requests for NGO {ngo_id}: {str(e)}")
            return []
    
    @staticmethod
    def update_volunteer_status(volunteer_id: str, status_data: Dict[str, Any]) -> bool:
        """Update volunteer status and availability"""
        try:
            doc_ref = firebase_config.get_firestore_client().collection('volunteers').document(volunteer_id)
            doc_ref.update(status_data)
            return True
        except Exception as e:
            logger.error(f"Error updating volunteer {volunteer_id}: {str(e)}")
            return False
    
    @staticmethod
    def get_available_volunteers() -> List[Dict[str, Any]]:
        """Get all available volunteers"""
        try:
            docs = firebase_config.get_firestore_client().collection('volunteers')\
                .where('availability', '==', True)\
                .stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting available volunteers: {str(e)}")
            return []
    
    @staticmethod
    def get_users_by_role(role: str) -> List[Dict[str, Any]]:
        """Get all users by role (donor, ngo, volunteer)"""
        try:
            docs = firebase_config.get_firestore_client().collection('users')\
                .where('role', '==', role)\
                .stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting users by role {role}: {str(e)}")
            return []
    
    @staticmethod
    def update_user(uid: str, update_data: Dict[str, Any]) -> bool:
        """Update user document"""
        try:
            doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
            doc_ref.update(update_data)
            return True
        except Exception as e:
            logger.error(f"Error updating user {uid}: {str(e)}")
            return False
    
    @staticmethod
    def update_user_points(uid: str, points: int) -> bool:
        """Update user points"""
        try:
            doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
            doc_ref.update({'points': points})
            return True
        except Exception as e:
            logger.error(f"Error updating points for user {uid}: {str(e)}")
            return False
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth using Haversine formula
        Returns distance in kilometers
        """
        import math
        
        # Radius of Earth in kilometers
        R = 6371.0
        
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return distance
    
    @staticmethod
    def get_nearby_users(latitude: float, longitude: float, radius_km: float = 10.0) -> List[Dict[str, Any]]:
        """Get users within a certain radius using accurate Haversine formula"""
        try:
            docs = firebase_config.get_firestore_client().collection('users').stream()
            nearby_users = []
            
            for doc in docs:
                user_data = doc.to_dict()
                if 'location' in user_data and user_data['location']:
                    user_lat = user_data['location'].get('lat', 0)
                    user_lng = user_data['location'].get('lng', 0)
                    
                    # Skip if invalid coordinates
                    if user_lat == 0 and user_lng == 0:
                        continue
                    
                    # Calculate accurate distance using Haversine formula
                    distance = FirebaseHelper.haversine_distance(
                        latitude, longitude, user_lat, user_lng
                    )
                    
                    if distance <= radius_km:
                        # Add distance to user data
                        user_data_with_distance = user_data.copy()
                        user_data_with_distance['distance_km'] = round(distance, 2)
                        nearby_users.append(user_data_with_distance)
            
            # Sort by distance
            nearby_users.sort(key=lambda x: x.get('distance_km', float('inf')))
            
            return nearby_users
        except Exception as e:
            logger.error(f"Error getting nearby users: {str(e)}")
            return []
    
    @staticmethod
    def create_emergency_alert(alert_data: Dict[str, Any]) -> str:
        """Create an emergency alert"""
        try:
            collection_ref = firebase_config.get_firestore_client().collection('emergency_alerts')
            doc_ref = collection_ref.add(alert_data)
            return doc_ref[1].id
        except Exception as e:
            logger.error(f"Error creating emergency alert: {str(e)}")
            raise e
    
    @staticmethod
    def get_active_emergency_alerts() -> List[Dict[str, Any]]:
        """Get all active emergency alerts"""
        try:
            docs = firebase_config.get_firestore_client().collection('emergency_alerts')\
                .where('status', '==', 'active')\
                .order_by('timestamp', direction='DESCENDING')\
                .stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting emergency alerts: {str(e)}")
            return []
