"""
Data Seeder for AAHARNET.AI
Creates sample data for testing and demo purposes
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from config.firebase_config import firebase_config
import random

def seed_donors() -> List[Dict[str, Any]]:
    """Generate sample donor data"""
    donors = [
        {
            "uid": "donor_001",
            "email": "freshmarket@example.com",
            "name": "Fresh Market Downtown",
            "user_type": "donor",
            "phone": "+1-555-0101",
            "location": {"lat": 40.7128, "lng": -74.0060, "address": "123 Main St, New York, NY"},
            "food_available": 450,
            "rating": 4.8,
            "total_donations": 156,
            "last_donation": (datetime.now() - timedelta(hours=2)).isoformat(),
            "created_at": (datetime.now() - timedelta(days=90)).isoformat(),
        },
        {
            "uid": "donor_002",
            "email": "greenvalley@example.com",
            "name": "Green Valley Farm",
            "user_type": "donor",
            "phone": "+1-555-0102",
            "location": {"lat": 40.7580, "lng": -73.9855, "address": "456 Farm Rd, Brooklyn, NY"},
            "food_available": 320,
            "rating": 4.9,
            "total_donations": 89,
            "last_donation": (datetime.now() - timedelta(hours=5)).isoformat(),
            "created_at": (datetime.now() - timedelta(days=60)).isoformat(),
        },
        {
            "uid": "donor_003",
            "email": "cityrestaurant@example.com",
            "name": "City Restaurant Group",
            "user_type": "donor",
            "phone": "+1-555-0103",
            "location": {"lat": 40.7489, "lng": -73.9680, "address": "789 Restaurant Ave, Queens, NY"},
            "food_available": 180,
            "rating": 4.7,
            "total_donations": 234,
            "last_donation": (datetime.now() - timedelta(hours=1)).isoformat(),
            "created_at": (datetime.now() - timedelta(days=180)).isoformat(),
        }
    ]
    return donors

def seed_ngos() -> List[Dict[str, Any]]:
    """Generate sample NGO data"""
    ngos = [
        {
            "uid": "ngo_001",
            "email": "communityfoodbank@example.com",
            "name": "Community Food Bank",
            "user_type": "ngo",
            "phone": "+1-555-0201",
            "location": {"lat": 40.7505, "lng": -73.9972, "address": "321 Community Center Blvd, Bronx, NY"},
            "beneficiaries": 2500,
            "food_needed": 800,
            "rating": 4.9,
            "volunteers": 45,
            "created_at": (datetime.now() - timedelta(days=120)).isoformat(),
        },
        {
            "uid": "ngo_002",
            "email": "hopeforall@example.com",
            "name": "Hope for All",
            "user_type": "ngo",
            "phone": "+1-555-0202",
            "location": {"lat": 40.7614, "lng": -73.9776, "address": "654 Hope St, Manhattan, NY"},
            "beneficiaries": 1800,
            "food_needed": 600,
            "rating": 4.8,
            "volunteers": 32,
            "created_at": (datetime.now() - timedelta(days=90)).isoformat(),
        },
        {
            "uid": "ngo_003",
            "email": "zerowaste@example.com",
            "name": "Zero Waste Organization",
            "user_type": "ngo",
            "phone": "+1-555-0203",
            "location": {"lat": 40.7282, "lng": -73.7949, "address": "987 Green Ave, Brooklyn, NY"},
            "beneficiaries": 1200,
            "food_needed": 400,
            "rating": 5.0,
            "volunteers": 28,
            "created_at": (datetime.now() - timedelta(days=150)).isoformat(),
        }
    ]
    return ngos

def seed_volunteers() -> List[Dict[str, Any]]:
    """Generate sample volunteer data"""
    volunteers = [
        {
            "uid": "vol_001",
            "email": "ravi.singh@example.com",
            "name": "Ravi Singh",
            "user_type": "volunteer",
            "phone": "+1-555-0301",
            "location": {"lat": 40.7589, "lng": -73.9851, "address": "111 Volunteer Way, New York, NY"},
            "hours_volunteered": 156,
            "deliveries": 45,
            "rating": 4.9,
            "status": "active",
            "vehicle_type": "truck",
            "capacity": 1000,
            "created_at": (datetime.now() - timedelta(days=180)).isoformat(),
        },
        {
            "uid": "vol_002",
            "email": "aarav.patel@example.com",
            "name": "Aarav Patel",
            "user_type": "volunteer",
            "phone": "+1-555-0302",
            "location": {"lat": 40.7550, "lng": -73.9800, "address": "222 Helper St, Brooklyn, NY"},
            "hours_volunteered": 98,
            "deliveries": 28,
            "rating": 4.8,
            "status": "active",
            "vehicle_type": "van",
            "capacity": 500,
            "created_at": (datetime.now() - timedelta(days=90)).isoformat(),
        },
        {
            "uid": "vol_003",
            "email": "priya.sharma@example.com",
            "name": "Priya Sharma",
            "user_type": "volunteer",
            "phone": "+1-555-0303",
            "location": {"lat": 40.7480, "lng": -73.9680, "address": "333 Service Rd, Queens, NY"},
            "hours_volunteered": 234,
            "deliveries": 67,
            "rating": 5.0,
            "status": "active",
            "vehicle_type": "car",
            "capacity": 200,
            "created_at": (datetime.now() - timedelta(days=240)).isoformat(),
        }
    ]
    return volunteers

def seed_donations() -> List[Dict[str, Any]]:
    """Generate sample donation data"""
    donations = []
    donors = seed_donors()
    
    for i in range(20):
        donor = random.choice(donors)
        food_types = ["vegetables", "fruits", "grains", "dairy", "prepared_meals"]
        
        donation = {
            "id": f"don_{i+1:03d}",
            "donor_id": donor["uid"],
            "donor_name": donor["name"],
            "food_type": random.choice(food_types),
            "quantity_kg": random.randint(50, 500),
            "status": random.choice(["pending", "assigned", "completed", "delivered"]),
            "pickup_location": donor["location"],
            "pickup_date": (datetime.now() + timedelta(days=random.randint(1, 7))).isoformat(),
            "created_at": (datetime.now() - timedelta(days=random.randint(0, 14))).isoformat(),
            "priority": random.choice(["low", "normal", "high"]),
        }
        donations.append(donation)
    
    return donations

def seed_requests() -> List[Dict[str, Any]]:
    """Generate sample request data from NGOs"""
    requests = []
    ngos = seed_ngos()
    
    for i in range(15):
        ngo = random.choice(ngos)
        food_types = ["vegetables", "fruits", "grains", "dairy", "meals"]
        
        request = {
            "id": f"req_{i+1:03d}",
            "ngo_id": ngo["uid"],
            "ngo_name": ngo["name"],
            "food_type": random.choice(food_types),
            "quantity_kg": random.randint(100, 1000),
            "status": random.choice(["active", "fulfilled", "urgent"]),
            "location": ngo["location"],
            "urgency": random.choice(["low", "normal", "high", "urgent"]),
            "deadline": (datetime.now() + timedelta(days=random.randint(1, 30))).isoformat(),
            "created_at": (datetime.now() - timedelta(days=random.randint(0, 21))).isoformat(),
        }
        requests.append(request)
    
    return requests

def seed_data_to_firestore():
    """Seed all data to Firestore"""
    db = firebase_config.get_firestore_client()
    
    print("Seeding data to Firestore...")
    
    # Seed donors
    donors = seed_donors()
    for donor in donors:
        db.collection("users").document(donor["uid"]).set(donor)
    print(f"✓ Seeded {len(donors)} donors")
    
    # Seed NGOs
    ngos = seed_ngos()
    for ngo in ngos:
        db.collection("users").document(ngo["uid"]).set(ngo)
    print(f"✓ Seeded {len(ngos)} NGOs")
    
    # Seed volunteers
    volunteers = seed_volunteers()
    for volunteer in volunteers:
        db.collection("users").document(volunteer["uid"]).set(volunteer)
    print(f"✓ Seeded {len(volunteers)} volunteers")
    
    # Seed donations
    donations = seed_donations()
    for donation in donations:
        db.collection("donations").document(donation["id"]).set(donation)
    print(f"✓ Seeded {len(donations)} donations")
    
    # Seed requests
    requests = seed_requests()
    for request in requests:
        db.collection("requests").document(request["id"]).set(request)
    print(f"✓ Seeded {len(requests)} requests")
    
    print("\n✅ Data seeding completed successfully!")
    print(f"Total users: {len(donors) + len(ngos) + len(volunteers)}")
    print(f"Total donations: {len(donations)}")
    print(f"Total requests: {len(requests)}")

if __name__ == "__main__":
    try:
        seed_data_to_firestore()
    except Exception as e:
        print(f"❌ Error seeding data: {str(e)}")

