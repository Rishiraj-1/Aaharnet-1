"""
Seed Map Data for Indore, India
Creates ~8 donors, ~5 NGOs, and ~4 volunteers spread across Indore city bbox
"""

import sys
import os
# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Set Firebase credentials path if not already set
if not os.getenv("FIREBASE_CREDENTIALS_PATH"):
    credentials_path = os.path.join(backend_dir, "config", "serviceAccountKey.json")
    if os.path.exists(credentials_path):
        os.environ["FIREBASE_CREDENTIALS_PATH"] = credentials_path
        print(f"Using Firebase credentials from: {credentials_path}")

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
from config.firebase_config import firebase_config
import random
import uuid

# Indore city bounding box (narrower - city only, not district)
INDURE_BBOX = {
    "southwest": {"lat": 22.6500, "lng": 75.7500},
    "northeast": {"lat": 22.8000, "lng": 75.9500}
}

# Indore center
INDURE_CENTER = {"lat": 22.7196, "lng": 75.8577}

FOOD_TYPES = ["vegetarian", "non-vegetarian", "vegan", "bakery", "dairy"]
STATUSES = ["available", "assigned", "picked", "delivered"]

def generate_random_location_in_indore() -> Dict[str, float]:
    """Generate random location within Indore bbox"""
    lat = random.uniform(INDURE_BBOX["southwest"]["lat"], INDURE_BBOX["northeast"]["lat"])
    lng = random.uniform(INDURE_BBOX["southwest"]["lng"], INDURE_BBOX["northeast"]["lng"])
    return {"lat": lat, "lng": lng}

def seed_map_donors() -> List[Dict[str, Any]]:
    """Generate ~8 donors in Indore"""
    donors = []
    names = [
        "Indore Fresh Mart", "City Bakery", "Green Valley Restaurant", "Royal Kitchen",
        "Annapurna Food Services", "Tasty Bites", "Food Express", "Delicious Corner"
    ]
    
    for i in range(8):
        location = generate_random_location_in_indore()
        donors.append({
            "uid": f"donor_indore_{i+1:03d}",
            "email": f"donor{i+1}@indore.example.com",
            "name": names[i] if i < len(names) else f"Donor {i+1}",
            "user_type": "donor",
            "phone": f"+91-98765-{10000+i}",
            "location": location,
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 180))).isoformat(),
        })
    
    return donors

def seed_map_ngos() -> List[Dict[str, Any]]:
    """Generate ~5 NGOs in Indore"""
    ngos = []
    names = [
        "Indore Food Bank", "Community Kitchen", "Hope Foundation", "Feed the Hungry",
        "Food for All"
    ]
    
    for i in range(5):
        location = generate_random_location_in_indore()
        ngos.append({
            "uid": f"ngo_indore_{i+1:03d}",
            "email": f"ngo{i+1}@indore.example.com",
            "name": names[i] if i < len(names) else f"NGO {i+1}",
            "user_type": "ngo",
            "phone": f"+91-98765-{20000+i}",
            "location": location,
            "beneficiaries": random.randint(500, 5000),
            "food_needed": random.randint(200, 1000),
            "rating": round(random.uniform(4.0, 5.0), 1),
            "volunteers": random.randint(10, 50),
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
        })
    
    return ngos

def seed_map_volunteers() -> List[Dict[str, Any]]:
    """Generate ~4 volunteers in Indore"""
    volunteers = []
    names = [
        "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Singh"
    ]
    
    for i in range(4):
        location = generate_random_location_in_indore()
        volunteers.append({
            "uid": f"volunteer_indore_{i+1:03d}",
            "email": f"volunteer{i+1}@indore.example.com",
            "name": names[i] if i < len(names) else f"Volunteer {i+1}",
            "user_type": "volunteer",
            "phone": f"+91-98765-{30000+i}",
            "location": location,
            "status": random.choice(["active", "inactive", "on_duty"]),
            "total_deliveries": random.randint(0, 100),
            "rating": round(random.uniform(4.0, 5.0), 1),
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 180))).isoformat(),
        })
    
    return volunteers

def seed_map_donations(donors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate donations from donors"""
    donations = []
    
    for donor in donors[:6]:  # Use first 6 donors
        num_donations = random.randint(1, 2)  # 1-2 donations per donor
        for j in range(num_donations):
            location = generate_random_location_in_indore()
            created_at = datetime.now() - timedelta(hours=random.randint(1, 72))
            
            donation = {
                "id": str(uuid.uuid4()),
                "donorId": donor["uid"],
                "donorName": donor["name"],
                "lat": location["lat"],
                "lng": location["lng"],
                "qtyKg": round(random.uniform(5, 100), 2),
                "foodType": random.choice(FOOD_TYPES),
                "freshnessScore": random.randint(70, 100),
                "status": random.choice(STATUSES),
                "createdAt": created_at,
                "imageUrl": None
            }
            
            # Add ngoId and volunteerId if status is assigned/picked/delivered
            if donation["status"] in ["assigned", "picked", "delivered"]:
                # Randomly assign NGO and volunteer (mock)
                donation["ngoId"] = f"ngo_indore_{random.randint(1, 5):03d}"
                donation["volunteerId"] = f"volunteer_indore_{random.randint(1, 4):03d}"
            
            donations.append(donation)
    
    return donations

def seed_map_requests(ngos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate requests from NGOs"""
    requests = []
    
    for ngo in ngos[:4]:  # Use first 4 NGOs
        num_requests = random.randint(1, 2)
        for j in range(num_requests):
            location = generate_random_location_in_indore()
            created_at = datetime.now() - timedelta(hours=random.randint(1, 48))
            
            request = {
                "id": str(uuid.uuid4()),
                "ngoId": ngo["uid"],
                "ngoName": ngo["name"],
                "lat": location["lat"],
                "lng": location["lng"],
                "qtyKg": round(random.uniform(50, 500), 2),
                "foodType": random.choice(FOOD_TYPES),
                "status": random.choice(["pending", "matched", "fulfilled"]),
                "createdAt": created_at,
                "urgency": random.choice(["low", "normal", "high", "urgent"])
            }
            
            requests.append(request)
    
    return requests

def seed_map_data_to_firestore():
    """Seed all map data to Firestore"""
    db = firebase_config.get_firestore_client()
    
    print("Seeding Indore map data to Firestore...")
    
    # Seed donors
    donors = seed_map_donors()
    for donor in donors:
        db.collection("users").document(donor["uid"]).set(donor)
    print(f"✓ Seeded {len(donors)} donors")
    
    # Seed NGOs
    ngos = seed_map_ngos()
    for ngo in ngos:
        db.collection("users").document(ngo["uid"]).set(ngo)
    print(f"✓ Seeded {len(ngos)} NGOs")
    
    # Seed volunteers
    volunteers = seed_map_volunteers()
    for volunteer in volunteers:
        db.collection("users").document(volunteer["uid"]).set(volunteer)
    print(f"✓ Seeded {len(volunteers)} volunteers")
    
    # Seed donations
    donations = seed_map_donations(donors)
    for donation in donations:
        db.collection("donations").document(donation["id"]).set(donation)
    print(f"✓ Seeded {len(donations)} donations")
    
    # Seed requests
    requests = seed_map_requests(ngos)
    for request in requests:
        db.collection("requests").document(request["id"]).set(request)
    print(f"✓ Seeded {len(requests)} requests")
    
    print("\n✅ Indore map data seeding completed successfully!")
    print(f"Total users: {len(donors) + len(ngos) + len(volunteers)}")
    print(f"Total donations: {len(donations)}")
    print(f"Total requests: {len(requests)}")

if __name__ == "__main__":
    try:
        seed_map_data_to_firestore()
    except Exception as e:
        print(f"❌ Error seeding data: {str(e)}")
        import traceback
        traceback.print_exc()

