"""
Admin Role Assignment Script
Run this script locally to set admin role for a user

Usage:
    python backend/utils/set_admin.py <UID_OF_USER>
"""

import sys
import os
import firebase_admin
from firebase_admin import credentials, auth

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def initialize_firebase(backend_dir: str):
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        # Get project ID from environment
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        
        # Try to load from credentials file path
        credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        
        # Resolve credentials path relative to backend directory if it's a relative path
        if credentials_path:
            if not os.path.isabs(credentials_path):
                # Relative path - resolve from backend directory
                credentials_path = os.path.join(backend_dir, credentials_path)
            # Check if file exists
            if os.path.exists(credentials_path):
                print(f"Loading Firebase credentials from: {credentials_path}")
                cred = credentials.Certificate(credentials_path)
                # Project ID is usually in the credentials file
                if not project_id:
                    # Read project_id from the JSON file
                    import json
                    with open(credentials_path, 'r') as f:
                        cred_data = json.load(f)
                        project_id = cred_data.get('project_id')
            else:
                print(f"Warning: Credentials file not found at: {credentials_path}")
                credentials_path = None
        
        if credentials_path and os.path.exists(credentials_path):
            # Already loaded above
            pass
        else:
            # Try to load from inline JSON credentials
            firebase_credentials = os.getenv("FIREBASE_CREDENTIALS")
            
            if firebase_credentials:
                import json
                print("Loading Firebase credentials from environment variable")
                cred_dict = json.loads(firebase_credentials)
                cred = credentials.Certificate(cred_dict)
                # Extract project ID from credentials if not set
                if not project_id and 'project_id' in cred_dict:
                    project_id = cred_dict['project_id']
            else:
                print("ERROR: No Firebase credentials found!")
                print("Please set FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS in your .env file")
                print(f"  Backend directory: {backend_dir}")
                print(f"  Looking for: {os.getenv('FIREBASE_CREDENTIALS_PATH', 'NOT SET')}")
                sys.exit(1)
        
        # Initialize Firebase Admin with project ID
        if project_id:
            firebase_admin.initialize_app(cred, {'projectId': project_id})
            print(f"Firebase Admin SDK initialized successfully (Project: {project_id})")
        else:
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")

def make_admin(uid: str):
    """
    Set admin role for a user
    
    Args:
        uid: Firebase user UID
    """
    try:
        # Get existing user
        user = auth.get_user(uid)
        existing_claims = user.custom_claims or {}
        
        # Set admin claim (preserve existing role if any)
        new_claims = {**existing_claims, "admin": True, "role": "admin"}
        auth.set_custom_user_claims(uid, new_claims)
        
        print(f"✓ Successfully set admin role for user: {uid}")
        print(f"  Email: {user.email}")
        print(f"  Display Name: {user.display_name or 'N/A'}")
        return True
    except auth.UserNotFoundError:
        print(f"✗ Error: User with UID '{uid}' not found")
        return False
    except Exception as e:
        print(f"✗ Error setting admin role: {str(e)}")
        return False

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    
    # Load .env from backend directory (parent of utils)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        # Try loading from current directory
        load_dotenv()
    
    if len(sys.argv) < 2:
        print("Usage: python backend/utils/set_admin.py <UID_OF_USER>")
        print("\nExample:")
        print("  python backend/utils/set_admin.py abc123xyz456")
        print("\nRequired environment variables:")
        print("  - FIREBASE_PROJECT_ID (required)")
        print("  - FIREBASE_CREDENTIALS_PATH (recommended)")
        print("  - OR FIREBASE_CREDENTIALS (alternative)")
        sys.exit(1)
    
    uid = sys.argv[1]
    
    # Get backend directory for path resolution
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Check for required project ID or credentials
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    firebase_credentials = os.getenv("FIREBASE_CREDENTIALS")
    
    if not project_id and not credentials_path and not firebase_credentials:
        print("ERROR: Firebase configuration is required")
        print("Please set one of the following in your .env file:")
        print("  - FIREBASE_PROJECT_ID (required)")
        print("  - FIREBASE_CREDENTIALS_PATH (recommended, e.g., config/serviceAccountKey.json)")
        print("  - OR FIREBASE_CREDENTIALS (alternative, inline JSON)")
        print(f"\nBackend directory: {backend_dir}")
        print(f"Looking for .env at: {env_path}")
        sys.exit(1)
    
    # Initialize Firebase
    try:
        initialize_firebase(backend_dir)
    except Exception as e:
        print(f"✗ Failed to initialize Firebase: {str(e)}")
        print("\nTroubleshooting:")
        print(f"1. Ensure .env file exists at: {env_path}")
        print("2. Ensure FIREBASE_PROJECT_ID is set in .env")
        print("3. Ensure FIREBASE_CREDENTIALS_PATH points to a valid service account JSON file")
        print(f"   (Resolved path will be relative to: {backend_dir})")
        print("4. Or set FIREBASE_CREDENTIALS with inline JSON credentials")
        sys.exit(1)
    
    # Set admin role
    success = make_admin(uid)
    
    if success:
        print("\n✓ Admin role assigned successfully!")
        print("  Note: User may need to refresh their token to see the change.")
    else:
        sys.exit(1)

