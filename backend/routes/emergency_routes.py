"""
Emergency Disaster Response Module
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
import json
import math
import requests
from dependencies import get_current_user
from utils.firebase_helpers import FirebaseHelper

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class EmergencyAlertRequest(BaseModel):
    alert_type: str  # natural_disaster, pandemic, conflict, other
    severity: str  # low, medium, high, critical
    location: Dict[str, float]  # lat, lng
    description: str
    affected_population: Optional[int] = None
    estimated_duration_hours: Optional[int] = None

class EmergencyAlertResponse(BaseModel):
    alert_id: str
    status: str
    response_plan: Dict[str, Any]
    resource_requirements: Dict[str, Any]
    estimated_response_time: str
    assigned_resources: List[Dict[str, Any]]

class DisasterDataRequest(BaseModel):
    location: Dict[str, float]
    radius_km: float = 100.0
    time_period_days: int = 7

class DisasterDataResponse(BaseModel):
    disaster_events: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    preparedness_score: float
    recommendations: List[str]

class ResourceAllocationRequest(BaseModel):
    emergency_id: str
    resource_type: str  # food, volunteers, vehicles, medical
    quantity: float
    priority: str  # low, medium, high, critical
    target_location: Dict[str, float]

class ResourceAllocationResponse(BaseModel):
    allocation_id: str
    allocated_resources: List[Dict[str, Any]]
    estimated_delivery_time: str
    logistics_plan: Dict[str, Any]
    status: str

class EmergencyResponsePlanRequest(BaseModel):
    emergency_type: str
    location: Dict[str, float]
    severity: str
    affected_area_km2: float

class EmergencyResponsePlanResponse(BaseModel):
    plan_id: str
    response_phases: List[Dict[str, Any]]
    resource_requirements: Dict[str, Any]
    timeline: Dict[str, Any]
    success_probability: float

@router.post("/alert", response_model=EmergencyAlertResponse)
async def create_emergency_alert(
    request: EmergencyAlertRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create emergency alert and generate response plan
    """
    try:
        # Validate emergency data
        if request.severity not in ['low', 'medium', 'high', 'critical']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid severity level"
            )
        
        # Generate alert ID
        alert_id = f"EMERGENCY_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create response plan
        response_plan = generate_emergency_response_plan(
            request.alert_type,
            request.severity,
            request.location,
            request.affected_population
        )
        
        # Calculate resource requirements
        resource_requirements = calculate_resource_requirements(
            request.alert_type,
            request.severity,
            request.affected_population
        )
        
        # Find available resources
        assigned_resources = find_available_resources(
            request.location,
            resource_requirements
        )
        
        # Estimate response time
        estimated_response_time = estimate_response_time(
            request.severity,
            request.location,
            assigned_resources
        )
        
        # Save emergency alert to Firestore
        alert_data = {
            'alert_id': alert_id,
            'alert_type': request.alert_type,
            'severity': request.severity,
            'location': request.location,
            'description': request.description,
            'affected_population': request.affected_population,
            'estimated_duration_hours': request.estimated_duration_hours,
            'created_by': current_user['uid'],
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'response_plan': response_plan,
            'resource_requirements': resource_requirements,
            'assigned_resources': assigned_resources
        }
        
        FirebaseHelper.create_emergency_alert(alert_data)
        
        logger.info(f"Emergency alert {alert_id} created by user {current_user['uid']}")
        
        return EmergencyAlertResponse(
            alert_id=alert_id,
            status='active',
            response_plan=response_plan,
            resource_requirements=resource_requirements,
            estimated_response_time=estimated_response_time,
            assigned_resources=assigned_resources
        )
        
    except Exception as e:
        logger.error(f"Emergency alert creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Emergency alert creation failed: {str(e)}"
        )

@router.get("/alerts", response_model=List[Dict[str, Any]])
async def get_active_emergency_alerts(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all active emergency alerts
    """
    try:
        alerts = FirebaseHelper.get_active_emergency_alerts()
        
        # Filter and format alerts
        formatted_alerts = []
        for alert in alerts:
            formatted_alerts.append({
                'alert_id': alert.get('alert_id'),
                'alert_type': alert.get('alert_type'),
                'severity': alert.get('severity'),
                'location': alert.get('location'),
                'description': alert.get('description'),
                'affected_population': alert.get('affected_population'),
                'created_at': alert.get('created_at'),
                'status': alert.get('status'),
                'response_plan': alert.get('response_plan'),
                'resource_requirements': alert.get('resource_requirements')
            })
        
        return formatted_alerts
        
    except Exception as e:
        logger.error(f"Failed to get emergency alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get emergency alerts: {str(e)}"
        )

@router.post("/disaster-data", response_model=DisasterDataResponse)
async def get_disaster_data(
    request: DisasterDataRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get disaster data and risk assessment for a location
    """
    try:
        # Get disaster events from external APIs (mock implementation)
        disaster_events = get_disaster_events_from_api(
            request.location,
            request.radius_km,
            request.time_period_days
        )
        
        # Perform risk assessment
        risk_assessment = perform_risk_assessment(
            request.location,
            disaster_events
        )
        
        # Calculate preparedness score
        preparedness_score = calculate_preparedness_score(
            request.location,
            risk_assessment
        )
        
        # Generate recommendations
        recommendations = generate_preparedness_recommendations(
            risk_assessment,
            preparedness_score
        )
        
        return DisasterDataResponse(
            disaster_events=disaster_events,
            risk_assessment=risk_assessment,
            preparedness_score=preparedness_score,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Disaster data retrieval failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Disaster data retrieval failed: {str(e)}"
        )

@router.post("/allocate-resources", response_model=ResourceAllocationResponse)
async def allocate_emergency_resources(
    request: ResourceAllocationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Allocate resources for emergency response
    """
    try:
        # Find available resources
        available_resources = find_resources_by_type(
            request.resource_type,
            request.target_location,
            request.quantity
        )
        
        # Create allocation plan
        allocation_plan = create_allocation_plan(
            available_resources,
            request.target_location,
            request.priority
        )
        
        # Generate logistics plan
        logistics_plan = generate_logistics_plan(
            allocation_plan,
            request.target_location
        )
        
        # Estimate delivery time
        estimated_delivery_time = estimate_resource_delivery_time(
            allocation_plan,
            request.target_location,
            request.priority
        )
        
        # Generate allocation ID
        allocation_id = f"ALLOC_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        return ResourceAllocationResponse(
            allocation_id=allocation_id,
            allocated_resources=allocation_plan,
            estimated_delivery_time=estimated_delivery_time,
            logistics_plan=logistics_plan,
            status='allocated'
        )
        
    except Exception as e:
        logger.error(f"Resource allocation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resource allocation failed: {str(e)}"
        )

@router.post("/response-plan", response_model=EmergencyResponsePlanResponse)
async def generate_emergency_response_plan_endpoint(
    request: EmergencyResponsePlanRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate comprehensive emergency response plan
    """
    try:
        # Generate response phases
        response_phases = generate_response_phases(
            request.emergency_type,
            request.severity,
            request.affected_area_km2
        )
        
        # Calculate resource requirements
        resource_requirements = calculate_comprehensive_resource_requirements(
            request.emergency_type,
            request.severity,
            request.affected_area_km2
        )
        
        # Create timeline
        timeline = create_emergency_timeline(
            request.emergency_type,
            request.severity,
            response_phases
        )
        
        # Calculate success probability
        success_probability = calculate_response_success_probability(
            request.emergency_type,
            request.severity,
            resource_requirements
        )
        
        # Generate plan ID
        plan_id = f"PLAN_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        return EmergencyResponsePlanResponse(
            plan_id=plan_id,
            response_phases=response_phases,
            resource_requirements=resource_requirements,
            timeline=timeline,
            success_probability=success_probability
        )
        
    except Exception as e:
        logger.error(f"Response plan generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Response plan generation failed: {str(e)}"
        )

def generate_emergency_response_plan(
    alert_type: str,
    severity: str,
    location: Dict[str, float],
    affected_population: Optional[int]
) -> Dict[str, Any]:
    """Generate emergency response plan"""
    
    # Base response plan
    response_plan = {
        'immediate_actions': [],
        'short_term_actions': [],
        'long_term_actions': [],
        'coordination_requirements': [],
        'communication_plan': {}
    }
    
    # Immediate actions based on alert type
    if alert_type == 'natural_disaster':
        response_plan['immediate_actions'] = [
            'Assess damage and casualties',
            'Evacuate affected areas',
            'Set up emergency shelters',
            'Deploy search and rescue teams',
            'Establish communication networks'
        ]
    elif alert_type == 'pandemic':
        response_plan['immediate_actions'] = [
            'Implement quarantine measures',
            'Distribute medical supplies',
            'Set up testing centers',
            'Coordinate with health authorities',
            'Provide food assistance to isolated populations'
        ]
    elif alert_type == 'conflict':
        response_plan['immediate_actions'] = [
            'Ensure safe evacuation routes',
            'Provide emergency food and water',
            'Coordinate with security forces',
            'Set up refugee camps',
            'Establish humanitarian corridors'
        ]
    
    # Adjust based on severity
    if severity == 'critical':
        response_plan['immediate_actions'].insert(0, 'ACTIVATE EMERGENCY PROTOCOLS')
        response_plan['immediate_actions'].append('Request international assistance')
    elif severity == 'high':
        response_plan['immediate_actions'].insert(0, 'Mobilize all available resources')
    
    # Short-term actions
    response_plan['short_term_actions'] = [
        'Distribute emergency food supplies',
        'Provide medical assistance',
        'Restore basic infrastructure',
        'Coordinate volunteer efforts',
        'Monitor situation developments'
    ]
    
    # Long-term actions
    response_plan['long_term_actions'] = [
        'Rebuild affected communities',
        'Implement prevention measures',
        'Conduct post-disaster assessment',
        'Develop recovery plans',
        'Strengthen preparedness systems'
    ]
    
    return response_plan

def calculate_resource_requirements(
    alert_type: str,
    severity: str,
    affected_population: Optional[int]
) -> Dict[str, Any]:
    """Calculate resource requirements for emergency response"""
    
    # Base requirements
    base_requirements = {
        'food_kg_per_person_per_day': 2.0,
        'water_liters_per_person_per_day': 3.0,
        'medical_supplies_per_100_people': 1.0,
        'volunteers_per_100_people': 5.0,
        'vehicles_per_1000_people': 2.0
    }
    
    # Adjust based on alert type
    if alert_type == 'natural_disaster':
        base_requirements['food_kg_per_person_per_day'] *= 1.5
        base_requirements['volunteers_per_100_people'] *= 2.0
    elif alert_type == 'pandemic':
        base_requirements['medical_supplies_per_100_people'] *= 3.0
        base_requirements['volunteers_per_100_people'] *= 1.5
    elif alert_type == 'conflict':
        base_requirements['food_kg_per_person_per_day'] *= 2.0
        base_requirements['water_liters_per_person_per_day'] *= 1.5
    
    # Adjust based on severity
    severity_multipliers = {
        'low': 0.5,
        'medium': 1.0,
        'high': 2.0,
        'critical': 4.0
    }
    
    multiplier = severity_multipliers.get(severity, 1.0)
    
    # Calculate total requirements
    if affected_population:
        requirements = {
            'food_kg_daily': base_requirements['food_kg_per_person_per_day'] * affected_population * multiplier,
            'water_liters_daily': base_requirements['water_liters_per_person_per_day'] * affected_population * multiplier,
            'medical_supplies': base_requirements['medical_supplies_per_100_people'] * (affected_population / 100) * multiplier,
            'volunteers_needed': base_requirements['volunteers_per_100_people'] * (affected_population / 100) * multiplier,
            'vehicles_needed': base_requirements['vehicles_per_1000_people'] * (affected_population / 1000) * multiplier
        }
    else:
        # Default requirements
        requirements = {
            'food_kg_daily': 1000 * multiplier,
            'water_liters_daily': 1500 * multiplier,
            'medical_supplies': 10 * multiplier,
            'volunteers_needed': 50 * multiplier,
            'vehicles_needed': 5 * multiplier
        }
    
    return requirements

def find_available_resources(
    location: Dict[str, float],
    requirements: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Find available resources near the emergency location"""
    
    # Get nearby NGOs and volunteers
    nearby_ngos = FirebaseHelper.get_nearby_users(location['lat'], location['lng'], 50.0)
    ngo_resources = [user for user in nearby_ngos if user.get('role') == 'ngo']
    
    nearby_volunteers = FirebaseHelper.get_available_volunteers()
    
    # Get nearby donors
    nearby_donors = FirebaseHelper.get_nearby_users(location['lat'], location['lng'], 30.0)
    donor_resources = [user for user in nearby_donors if user.get('role') == 'donor']
    
    # Format available resources
    available_resources = []
    
    # NGO resources
    for ngo in ngo_resources[:5]:  # Limit to top 5
        available_resources.append({
            'resource_id': ngo['uid'],
            'resource_type': 'ngo',
            'name': ngo['name'],
            'location': ngo['location'],
            'capacity': ngo.get('capacity', 'unknown'),
            'specialization': ngo.get('specialization', 'general'),
            'distance_km': calculate_distance(
                location['lat'], location['lng'],
                ngo['location']['lat'], ngo['location']['lng']
            )
        })
    
    # Volunteer resources
    for volunteer in nearby_volunteers[:10]:  # Limit to top 10
        available_resources.append({
            'resource_id': volunteer['user_id'],
            'resource_type': 'volunteer',
            'name': volunteer.get('name', 'Volunteer'),
            'availability': volunteer.get('availability', True),
            'skills': volunteer.get('skills', []),
            'rating': volunteer.get('rating', 5.0)
        })
    
    # Donor resources
    for donor in donor_resources[:5]:  # Limit to top 5
        available_resources.append({
            'resource_id': donor['uid'],
            'resource_type': 'donor',
            'name': donor['name'],
            'location': donor['location'],
            'food_available': donor.get('food_available', 0),
            'last_donation': donor.get('last_donation', 'unknown')
        })
    
    return available_resources

def estimate_response_time(
    severity: str,
    location: Dict[str, float],
    assigned_resources: List[Dict[str, Any]]
) -> str:
    """Estimate emergency response time"""
    
    # Base response times by severity
    base_times = {
        'low': 4,      # hours
        'medium': 2,   # hours
        'high': 1,     # hour
        'critical': 0.5  # hours
    }
    
    base_time = base_times.get(severity, 2)
    
    # Adjust based on resource availability
    if len(assigned_resources) > 10:
        time_multiplier = 0.8
    elif len(assigned_resources) > 5:
        time_multiplier = 0.9
    else:
        time_multiplier = 1.2
    
    estimated_hours = base_time * time_multiplier
    
    if estimated_hours < 1:
        return f"{int(estimated_hours * 60)} minutes"
    else:
        return f"{estimated_hours:.1f} hours"

def get_disaster_events_from_api(
    location: Dict[str, float],
    radius_km: float,
    time_period_days: int
) -> List[Dict[str, Any]]:
    """Get disaster events from external APIs (mock implementation)"""
    
    # Mock disaster events
    events = [
        {
            'event_id': 'EVENT_001',
            'event_type': 'earthquake',
            'magnitude': 6.2,
            'location': {
                'lat': location['lat'] + 0.1,
                'lng': location['lng'] + 0.1
            },
            'timestamp': (datetime.now() - timedelta(days=2)).isoformat(),
            'severity': 'high',
            'affected_area_km2': 500
        },
        {
            'event_id': 'EVENT_002',
            'event_type': 'flood',
            'magnitude': 4.5,
            'location': {
                'lat': location['lat'] - 0.05,
                'lng': location['lng'] + 0.05
            },
            'timestamp': (datetime.now() - timedelta(days=5)).isoformat(),
            'severity': 'medium',
            'affected_area_km2': 200
        }
    ]
    
    return events

def perform_risk_assessment(
    location: Dict[str, float],
    disaster_events: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Perform risk assessment for a location"""
    
    # Calculate risk factors
    earthquake_risk = 0.3
    flood_risk = 0.4
    pandemic_risk = 0.2
    conflict_risk = 0.1
    
    # Adjust based on recent events
    for event in disaster_events:
        if event['event_type'] == 'earthquake':
            earthquake_risk += 0.2
        elif event['event_type'] == 'flood':
            flood_risk += 0.3
        elif event['event_type'] == 'pandemic':
            pandemic_risk += 0.4
        elif event['event_type'] == 'conflict':
            conflict_risk += 0.5
    
    # Calculate overall risk
    overall_risk = (earthquake_risk + flood_risk + pandemic_risk + conflict_risk) / 4
    
    return {
        'overall_risk': min(1.0, overall_risk),
        'earthquake_risk': min(1.0, earthquake_risk),
        'flood_risk': min(1.0, flood_risk),
        'pandemic_risk': min(1.0, pandemic_risk),
        'conflict_risk': min(1.0, conflict_risk),
        'risk_level': 'high' if overall_risk > 0.7 else 'medium' if overall_risk > 0.4 else 'low'
    }

def calculate_preparedness_score(
    location: Dict[str, float],
    risk_assessment: Dict[str, Any]
) -> float:
    """Calculate preparedness score for a location"""
    
    # Base preparedness factors
    infrastructure_score = 0.7
    resource_availability_score = 0.6
    response_capacity_score = 0.5
    communication_score = 0.8
    
    # Adjust based on risk level
    risk_level = risk_assessment.get('risk_level', 'medium')
    if risk_level == 'high':
        preparedness_multiplier = 0.8
    elif risk_level == 'medium':
        preparedness_multiplier = 0.9
    else:
        preparedness_multiplier = 1.0
    
    # Calculate overall preparedness
    preparedness_score = (
        infrastructure_score * 0.3 +
        resource_availability_score * 0.3 +
        response_capacity_score * 0.2 +
        communication_score * 0.2
    ) * preparedness_multiplier
    
    return min(1.0, preparedness_score)

def generate_preparedness_recommendations(
    risk_assessment: Dict[str, Any],
    preparedness_score: float
) -> List[str]:
    """Generate preparedness recommendations"""
    
    recommendations = []
    
    if preparedness_score < 0.5:
        recommendations.append("CRITICAL: Immediate preparedness improvements needed")
        recommendations.append("Establish emergency response protocols")
        recommendations.append("Build resource stockpiles")
    elif preparedness_score < 0.7:
        recommendations.append("Moderate preparedness improvements recommended")
        recommendations.append("Enhance communication systems")
        recommendations.append("Increase volunteer training")
    else:
        recommendations.append("Good preparedness level maintained")
        recommendations.append("Continue regular drills and updates")
    
    # Risk-specific recommendations
    if risk_assessment.get('earthquake_risk', 0) > 0.7:
        recommendations.append("High earthquake risk - strengthen building codes")
    
    if risk_assessment.get('flood_risk', 0) > 0.7:
        recommendations.append("High flood risk - improve drainage systems")
    
    if risk_assessment.get('pandemic_risk', 0) > 0.7:
        recommendations.append("High pandemic risk - enhance health infrastructure")
    
    return recommendations

def find_resources_by_type(
    resource_type: str,
    target_location: Dict[str, float],
    quantity: float
) -> List[Dict[str, Any]]:
    """Find resources of specific type near target location"""
    
    # Mock resource search
    resources = []
    
    if resource_type == 'food':
        # Find food donors
        nearby_donors = FirebaseHelper.get_nearby_users(
            target_location['lat'], target_location['lng'], 50.0
        )
        for donor in nearby_donors:
            if donor.get('role') == 'donor':
                resources.append({
                    'id': donor['uid'],
                    'name': donor['name'],
                    'type': 'food',
                    'quantity_available': donor.get('food_available', 100),
                    'location': donor['location'],
                    'distance_km': calculate_distance(
                        target_location['lat'], target_location['lng'],
                        donor['location']['lat'], donor['location']['lng']
                    )
                })
    
    elif resource_type == 'volunteers':
        # Find available volunteers
        volunteers = FirebaseHelper.get_available_volunteers()
        for volunteer in volunteers:
            resources.append({
                'id': volunteer['user_id'],
                'name': volunteer.get('name', 'Volunteer'),
                'type': 'volunteer',
                'availability': volunteer.get('availability', True),
                'skills': volunteer.get('skills', []),
                'rating': volunteer.get('rating', 5.0)
            })
    
    elif resource_type == 'vehicles':
        # Mock vehicle resources
        resources = [
            {
                'id': 'VEHICLE_001',
                'name': 'Emergency Truck 1',
                'type': 'vehicle',
                'capacity_kg': 2000,
                'location': target_location,
                'distance_km': 5.0
            },
            {
                'id': 'VEHICLE_002',
                'name': 'Delivery Van 1',
                'type': 'vehicle',
                'capacity_kg': 1000,
                'location': target_location,
                'distance_km': 10.0
            }
        ]
    
    return resources

def create_allocation_plan(
    available_resources: List[Dict[str, Any]],
    target_location: Dict[str, float],
    priority: str
) -> List[Dict[str, Any]]:
    """Create resource allocation plan"""
    
    allocation_plan = []
    
    # Sort resources by distance and priority
    sorted_resources = sorted(
        available_resources,
        key=lambda x: x.get('distance_km', 0)
    )
    
    # Allocate resources based on priority
    priority_multipliers = {
        'low': 0.5,
        'medium': 1.0,
        'high': 1.5,
        'critical': 2.0
    }
    
    multiplier = priority_multipliers.get(priority, 1.0)
    
    for resource in sorted_resources[:5]:  # Limit to top 5 resources
        allocation_plan.append({
            'resource_id': resource['id'],
            'resource_name': resource['name'],
            'allocation_quantity': resource.get('quantity_available', 1) * multiplier,
            'estimated_delivery_time': estimate_delivery_time(
                resource.get('distance_km', 0), priority
            ),
            'allocation_status': 'allocated'
        })
    
    return allocation_plan

def generate_logistics_plan(
    allocation_plan: List[Dict[str, Any]],
    target_location: Dict[str, float]
) -> Dict[str, Any]:
    """Generate logistics plan for resource delivery"""
    
    return {
        'delivery_routes': [
            {
                'route_id': f"ROUTE_{i+1}",
                'resource_id': allocation['resource_id'],
                'start_location': 'Resource Location',
                'end_location': target_location,
                'estimated_distance_km': 15.0,
                'estimated_time_hours': 1.5
            }
            for i, allocation in enumerate(allocation_plan)
        ],
        'coordination_points': [
            {
                'point_id': 'COORD_001',
                'location': target_location,
                'type': 'distribution_center',
                'capacity': 1000
            }
        ],
        'communication_plan': {
            'primary_contact': 'Emergency Coordinator',
            'backup_contact': 'Logistics Manager',
            'communication_channels': ['radio', 'phone', 'app']
        }
    }

def estimate_resource_delivery_time(
    allocation_plan: List[Dict[str, Any]],
    target_location: Dict[str, float],
    priority: str
) -> str:
    """Estimate resource delivery time"""
    
    if not allocation_plan:
        return "No resources available"
    
    # Calculate average delivery time
    total_time = sum(
        float(allocation['estimated_delivery_time'].split()[0])
        for allocation in allocation_plan
        if 'estimated_delivery_time' in allocation
    )
    
    average_time = total_time / len(allocation_plan)
    
    # Adjust based on priority
    priority_adjustments = {
        'low': 1.2,
        'medium': 1.0,
        'high': 0.8,
        'critical': 0.6
    }
    
    adjusted_time = average_time * priority_adjustments.get(priority, 1.0)
    
    return f"{adjusted_time:.1f} hours"

def estimate_delivery_time(distance_km: float, priority: str) -> str:
    """Estimate delivery time based on distance and priority"""
    
    # Base delivery time (hours)
    base_time = distance_km / 30.0  # Assume 30 km/h average speed
    
    # Adjust based on priority
    priority_adjustments = {
        'low': 1.5,
        'medium': 1.0,
        'high': 0.7,
        'critical': 0.5
    }
    
    adjusted_time = base_time * priority_adjustments.get(priority, 1.0)
    
    return f"{adjusted_time:.1f} hours"

def generate_response_phases(
    emergency_type: str,
    severity: str,
    affected_area_km2: float
) -> List[Dict[str, Any]]:
    """Generate emergency response phases"""
    
    phases = []
    
    # Phase 1: Immediate Response (0-24 hours)
    phases.append({
        'phase_id': 'PHASE_1',
        'phase_name': 'Immediate Response',
        'duration_hours': 24,
        'objectives': [
            'Assess situation and casualties',
            'Evacuate affected areas',
            'Provide emergency shelter',
            'Distribute emergency supplies'
        ],
        'resources_needed': {
            'search_rescue_teams': 5,
            'emergency_shelters': 3,
            'medical_teams': 2,
            'food_supplies_kg': 1000
        }
    })
    
    # Phase 2: Stabilization (24-72 hours)
    phases.append({
        'phase_id': 'PHASE_2',
        'phase_name': 'Stabilization',
        'duration_hours': 48,
        'objectives': [
            'Restore basic services',
            'Provide medical care',
            'Distribute food and water',
            'Establish communication'
        ],
        'resources_needed': {
            'medical_personnel': 10,
            'food_supplies_kg': 5000,
            'water_supplies_liters': 10000,
            'communication_equipment': 5
        }
    })
    
    # Phase 3: Recovery (72+ hours)
    phases.append({
        'phase_id': 'PHASE_3',
        'phase_name': 'Recovery',
        'duration_hours': 168,  # 1 week
        'objectives': [
            'Rebuild infrastructure',
            'Provide long-term assistance',
            'Conduct damage assessment',
            'Plan reconstruction'
        ],
        'resources_needed': {
            'construction_teams': 3,
            'long_term_supplies': 'ongoing',
            'assessment_teams': 2,
            'planning_teams': 1
        }
    })
    
    return phases

def calculate_comprehensive_resource_requirements(
    emergency_type: str,
    severity: str,
    affected_area_km2: float
) -> Dict[str, Any]:
    """Calculate comprehensive resource requirements"""
    
    # Base requirements per km²
    base_requirements_per_km2 = {
        'food_kg': 100,
        'water_liters': 200,
        'medical_supplies': 10,
        'volunteers': 5,
        'vehicles': 1,
        'shelters': 0.5
    }
    
    # Adjust based on emergency type
    type_multipliers = {
        'natural_disaster': 1.5,
        'pandemic': 2.0,
        'conflict': 1.8,
        'other': 1.0
    }
    
    # Adjust based on severity
    severity_multipliers = {
        'low': 0.5,
        'medium': 1.0,
        'high': 2.0,
        'critical': 4.0
    }
    
    type_multiplier = type_multipliers.get(emergency_type, 1.0)
    severity_multiplier = severity_multipliers.get(severity, 1.0)
    
    total_multiplier = type_multiplier * severity_multiplier
    
    requirements = {}
    for resource, base_amount in base_requirements_per_km2.items():
        requirements[resource] = base_amount * affected_area_km2 * total_multiplier
    
    return requirements

def create_emergency_timeline(
    emergency_type: str,
    severity: str,
    response_phases: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Create emergency response timeline"""
    
    timeline = {
        'total_duration_hours': sum(phase['duration_hours'] for phase in response_phases),
        'phases': [],
        'milestones': [],
        'critical_deadlines': []
    }
    
    current_time = 0
    for phase in response_phases:
        timeline['phases'].append({
            'phase_name': phase['phase_name'],
            'start_time': current_time,
            'end_time': current_time + phase['duration_hours'],
            'duration_hours': phase['duration_hours']
        })
        current_time += phase['duration_hours']
    
    # Add milestones
    timeline['milestones'] = [
        {'time_hours': 6, 'milestone': 'Initial assessment complete'},
        {'time_hours': 24, 'milestone': 'Emergency shelters established'},
        {'time_hours': 48, 'milestone': 'Basic services restored'},
        {'time_hours': 72, 'milestone': 'Recovery phase begins'}
    ]
    
    # Add critical deadlines
    timeline['critical_deadlines'] = [
        {'time_hours': 1, 'deadline': 'First responders deployed'},
        {'time_hours': 4, 'deadline': 'Emergency supplies distributed'},
        {'time_hours': 12, 'deadline': 'Communication networks restored'},
        {'time_hours': 24, 'deadline': 'All affected areas assessed'}
    ]
    
    return timeline

def calculate_response_success_probability(
    emergency_type: str,
    severity: str,
    resource_requirements: Dict[str, Any]
) -> float:
    """Calculate probability of successful emergency response"""
    
    # Base success probability
    base_probability = 0.8
    
    # Adjust based on emergency type
    type_adjustments = {
        'natural_disaster': 0.1,
        'pandemic': -0.1,
        'conflict': -0.2,
        'other': 0.0
    }
    
    # Adjust based on severity
    severity_adjustments = {
        'low': 0.2,
        'medium': 0.0,
        'high': -0.1,
        'critical': -0.2
    }
    
    type_adjustment = type_adjustments.get(emergency_type, 0.0)
    severity_adjustment = severity_adjustments.get(severity, 0.0)
    
    success_probability = base_probability + type_adjustment + severity_adjustment
    
    # Ensure probability is between 0 and 1
    return max(0.0, min(1.0, success_probability))

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat/2) * math.sin(dlat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng/2) * math.sin(dlng/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return distance
