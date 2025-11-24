"""
Automated Seed Script
Runs automatically on backend startup to seed mock data if collections are empty
"""

import os
import sys
import logging
from typing import Dict, Any

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

logger = logging.getLogger(__name__)

def check_collection_empty(collection_name: str) -> bool:
    """Check if a Firestore collection is empty"""
    try:
        from config.firebase_config import firebase_config
        db = firebase_config.get_firestore_client()
        
        # Get first document
        docs = db.collection(collection_name).limit(1).stream()
        return len(list(docs)) == 0
    except Exception as e:
        logger.error(f"Error checking collection {collection_name}: {str(e)}")
        return True  # Assume empty if error

def should_seed_data() -> bool:
    """Check if we should seed data (if collections are empty)"""
    collections_to_check = ['users', 'donations', 'requests']
    
    for collection in collections_to_check:
        if not check_collection_empty(collection):
            logger.info(f"Collection '{collection}' has data, skipping seed")
            return False
    
    logger.info("All collections are empty, will seed data")
    return True

def auto_seed_data():
    """Automatically seed data if collections are empty"""
    try:
        # Check if we should seed
        if not should_seed_data():
            logger.info("Data already exists, skipping auto-seed")
            return False
        
        # Import seed function
        from utils.seed_map_data import seed_map_data_to_firestore
        
        logger.info("Starting automated data seeding...")
        seed_map_data_to_firestore()
        logger.info("✅ Automated data seeding completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error in automated seeding: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    auto_seed_data()

