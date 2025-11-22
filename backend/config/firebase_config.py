"""
Firebase Configuration and Helpers
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import os
from typing import Dict, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FirebaseConfig:
    """Firebase configuration and initialization"""
    
    def __init__(self):
        self.db = None
        self.auth_client = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Option 1: Try to load from credentials file path
                credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
                
                if credentials_path and os.path.exists(credentials_path):
                    logger.info(f"Loading Firebase credentials from: {credentials_path}")
                    cred = credentials.Certificate(credentials_path)
                else:
                    # Option 2: Try to load from inline JSON credentials
                    firebase_credentials = os.getenv("FIREBASE_CREDENTIALS")
                    
                    if firebase_credentials:
                        logger.info("Loading Firebase credentials from environment variable")
                        cred_dict = json.loads(firebase_credentials)
                        cred = credentials.Certificate(cred_dict)
                    else:
                        # Option 3: Use default credentials (for local development)
                        logger.warning("No Firebase credentials found in .env file!")
                        logger.warning("Please set FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS")
                        cred = credentials.ApplicationDefault()
                
                # Initialize Firebase Admin
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized successfully")
            
            # Initialize Firestore and Auth clients
            self.db = firestore.client()
            self.auth_client = auth
            logger.info("Firestore client initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            raise e
    
    def get_firestore_client(self):
        """Get Firestore client"""
        return self.db
    
    def get_auth_client(self):
        """Get Firebase Auth client"""
        return self.auth_client

# Global Firebase instance
firebase_config = FirebaseConfig()

def verify_firebase_token(token: str) -> Dict[str, Any]:
    """
    Verify Firebase JWT token and return decoded token
    
    Args:
        token: Firebase JWT token
        
    Returns:
        Decoded token data
        
    Raises:
        Exception: If token is invalid
    """
    try:
        decoded_token = firebase_config.get_auth_client().verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise Exception(f"Invalid token: {str(e)}")

def get_user_by_uid(uid: str) -> Optional[Dict[str, Any]]:
    """
    Get user data from Firestore by UID
    
    Args:
        uid: User UID
        
    Returns:
        User document data or None
    """
    try:
        doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        logger.error(f"Failed to get user {uid}: {str(e)}")
        return None

def create_user(user_data: Dict[str, Any]) -> bool:
    """
    Create a new user document in Firestore
    
    Args:
        user_data: User data dictionary
        
    Returns:
        True if successful, False otherwise
    """
    try:
        uid = user_data.get('uid')
        if not uid:
            raise ValueError("UID is required")
        
        doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
        doc_ref.set(user_data)
        logger.info(f"User {uid} created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        return False

def update_user(uid: str, update_data: Dict[str, Any]) -> bool:
    """
    Update user document in Firestore
    
    Args:
        uid: User UID
        update_data: Data to update
        
    Returns:
        True if successful, False otherwise
    """
    try:
        doc_ref = firebase_config.get_firestore_client().collection('users').document(uid)
        doc_ref.update(update_data)
        logger.info(f"User {uid} updated successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to update user {uid}: {str(e)}")
        return False

def get_collection_data(collection_name: str, limit: int = 100) -> list:
    """
    Get all documents from a Firestore collection
    
    Args:
        collection_name: Name of the collection
        limit: Maximum number of documents to return
        
    Returns:
        List of document data
    """
    try:
        docs = firebase_config.get_firestore_client().collection(collection_name).limit(limit).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.error(f"Failed to get collection {collection_name}: {str(e)}")
        return []

def add_document(collection_name: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
    """
    Add a document to a Firestore collection
    
    Args:
        collection_name: Name of the collection
        data: Document data
        doc_id: Optional document ID
        
    Returns:
        Document ID
    """
    try:
        collection_ref = firebase_config.get_firestore_client().collection(collection_name)
        
        if doc_id:
            doc_ref = collection_ref.document(doc_id)
            doc_ref.set(data)
            return doc_id
        else:
            doc_ref = collection_ref.add(data)
            return doc_ref[1].id
    except Exception as e:
        logger.error(f"Failed to add document to {collection_name}: {str(e)}")
        raise e

def update_document(collection_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
    """
    Update a document in Firestore
    
    Args:
        collection_name: Name of the collection
        doc_id: Document ID
        data: Data to update
        
    Returns:
        True if successful, False otherwise
    """
    try:
        doc_ref = firebase_config.get_firestore_client().collection(collection_name).document(doc_id)
        doc_ref.update(data)
        return True
    except Exception as e:
        logger.error(f"Failed to update document {doc_id} in {collection_name}: {str(e)}")
        return False

def delete_document(collection_name: str, doc_id: str) -> bool:
    """
    Delete a document from Firestore
    
    Args:
        collection_name: Name of the collection
        doc_id: Document ID
        
    Returns:
        True if successful, False otherwise
    """
    try:
        doc_ref = firebase_config.get_firestore_client().collection(collection_name).document(doc_id)
        doc_ref.delete()
        return True
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id} from {collection_name}: {str(e)}")
        return False
