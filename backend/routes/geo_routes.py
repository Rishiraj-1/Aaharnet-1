"""
Geospatial Module for Heatmaps and Smart Matching
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
import logging
from datetime import datetime, timedelta
import json
import math
from dependencies import get_current_user
from utils.firebase_helpers import FirebaseHelper

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 10.0
    user_type: Optional[str] = None  # donor, ngo, volunteer

class HeatmapRequest(BaseModel):
    center_lat: float
    center_lng: float
    zoom_level: int = 10
    data_type: str = "donations"  # donations, requests, volunteers

class HeatmapResponse(BaseModel):
    heatmap_data: List[Dict[str, Any]]
    bounds: Dict[str, float]
    summary: Dict[str, Any]

class MatchingRequest(BaseModel):
    donor_location: Dict[str, float]  # lat, lng
    ngo_location: Dict[str, float]
    food_type: str
    quantity: float
    urgency: str = "normal"  # low, normal, high, urgent

class MatchingResponse(BaseModel):
    matches: List[Dict[str, Any]]
    optimal_match: Optional[Dict[str, Any]]
    distance_matrix: Dict[str, Any]
    recommendations: List[str]

class GeoAnalysisRequest(BaseModel):
    locations: List[Dict[str, Any]]  # [{"lat": 40.7128, "lng": -74.006, "type": "donor"}]
    analysis_type: str = "coverage"  # coverage, clustering, optimization

class GeoAnalysisResponse(BaseModel):
    analysis_results: Dict[str, Any]
    visualizations: Dict[str, Any]
    recommendations: List[str]

@router.post("/heatmap", response_model=HeatmapResponse)
async def generate_heatmap(
    request: HeatmapRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate heatmap data for food distribution visualization
    """
    try:
        # Generate mock heatmap data (in production, query real data from Firestore)
        heatmap_data = generate_mock_heatmap_data(
            request.center_lat,
            request.center_lng,
            request.zoom_level,
            request.data_type
        )
        
        # Calculate bounds
        bounds = calculate_bounds(heatmap_data)
        
        # Generate summary
        summary = {
            'total_points': len(heatmap_data),
            'data_type': request.data_type,
            'center_lat': request.center_lat,
            'center_lng': request.center_lng,
            'zoom_level': request.zoom_level,
            'generated_at': datetime.now().isoformat()
        }
        
        logger.info(f"Heatmap generated for user {current_user['uid']}")
        
        return HeatmapResponse(
            heatmap_data=heatmap_data,
            bounds=bounds,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Heatmap generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Heatmap generation failed: {str(e)}"
        )

@router.post("/nearby", response_model=Dict[str, Any])
async def find_nearby_users(
    request: LocationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Find nearby users based on location and radius
    """
    try:
        # Get nearby users from Firebase
        nearby_users = FirebaseHelper.get_nearby_users(
            request.latitude,
            request.longitude,
            request.radius_km
        )
        
        # Filter by user type if specified
        if request.user_type:
            nearby_users = [
                user for user in nearby_users 
                if user.get('role') == request.user_type
            ]
        
        # Calculate distances and add to results
        results = []
        for user in nearby_users:
            if 'location' in user:
                distance = calculate_distance(
                    request.latitude,
                    request.longitude,
                    user['location']['lat'],
                    user['location']['lng']
                )
                
                results.append({
                    'uid': user['uid'],
                    'name': user['name'],
                    'role': user['role'],
                    'location': user['location'],
                    'distance_km': round(distance, 2),
                    'points': user.get('points', 0)
                })
        
        # Sort by distance
        results.sort(key=lambda x: x['distance_km'])
        
        return {
            'center_location': {
                'lat': request.latitude,
                'lng': request.longitude
            },
            'radius_km': request.radius_km,
            'user_type_filter': request.user_type,
            'total_found': len(results),
            'users': results
        }
        
    except Exception as e:
        logger.error(f"Nearby users search failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Nearby users search failed: {str(e)}"
        )

@router.post("/matching", response_model=MatchingResponse)
async def find_optimal_matches(
    request: MatchingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Find optimal matches between donors and NGOs
    """
    try:
        # Get nearby NGOs
        nearby_ngos = FirebaseHelper.get_nearby_users(
            request.donor_location['lat'],
            request.donor_location['lng'],
            50.0  # 50km radius
        )
        
        # Filter NGOs only
        ngo_users = [user for user in nearby_ngos if user.get('role') == 'ngo']
        
        # Calculate matches
        matches = []
        for ngo in ngo_users:
            if 'location' in ngo:
                distance = calculate_distance(
                    request.donor_location['lat'],
                    request.donor_location['lng'],
                    ngo['location']['lat'],
                    ngo['location']['lng']
                )
                
                # Calculate match score
                match_score = calculate_match_score(
                    distance,
                    request.quantity,
                    request.urgency,
                    ngo
                )
                
                matches.append({
                    'ngo_id': ngo['uid'],
                    'ngo_name': ngo['name'],
                    'location': ngo['location'],
                    'distance_km': round(distance, 2),
                    'match_score': round(match_score, 2),
                    'estimated_delivery_time': estimate_delivery_time(distance),
                    'capacity': ngo.get('capacity', 'unknown')
                })
        
        # Sort by match score
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Find optimal match
        optimal_match = matches[0] if matches else None
        
        # Generate distance matrix
        distance_matrix = generate_distance_matrix(matches)
        
        # Generate recommendations
        recommendations = generate_matching_recommendations(matches, request)
        
        return MatchingResponse(
            matches=matches,
            optimal_match=optimal_match,
            distance_matrix=distance_matrix,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Matching failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Matching failed: {str(e)}"
        )

@router.post("/analysis", response_model=GeoAnalysisResponse)
async def analyze_geospatial_data(
    request: GeoAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform geospatial analysis on location data
    """
    try:
        analysis_results = {}
        visualizations = {}
        recommendations = []
        
        if request.analysis_type == "coverage":
            analysis_results = analyze_coverage(request.locations)
            visualizations = generate_coverage_visualization(analysis_results)
            recommendations = generate_coverage_recommendations(analysis_results)
        
        elif request.analysis_type == "clustering":
            analysis_results = analyze_clustering(request.locations)
            visualizations = generate_clustering_visualization(analysis_results)
            recommendations = generate_clustering_recommendations(analysis_results)
        
        elif request.analysis_type == "optimization":
            analysis_results = analyze_optimization(request.locations)
            visualizations = generate_optimization_visualization(analysis_results)
            recommendations = generate_optimization_recommendations(analysis_results)
        
        return GeoAnalysisResponse(
            analysis_results=analysis_results,
            visualizations=visualizations,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Geospatial analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geospatial analysis failed: {str(e)}"
        )

def generate_mock_heatmap_data(center_lat: float, center_lng: float, zoom_level: int, data_type: str) -> List[Dict[str, Any]]:
    """Generate mock heatmap data for visualization"""
    heatmap_data = []
    
    # Calculate grid size based on zoom level
    grid_size = max(1, 20 - zoom_level)
    
    # Generate points in a grid around the center
    for i in range(-grid_size, grid_size + 1):
        for j in range(-grid_size, grid_size + 1):
            lat = center_lat + (i * 0.01)  # Roughly 1km per 0.01 degrees
            lng = center_lng + (j * 0.01)
            
            # Generate mock intensity based on data type
            if data_type == "donations":
                intensity = np.random.uniform(0.1, 1.0)
            elif data_type == "requests":
                intensity = np.random.uniform(0.2, 0.9)
            elif data_type == "volunteers":
                intensity = np.random.uniform(0.1, 0.8)
            else:
                intensity = np.random.uniform(0.1, 1.0)
            
            heatmap_data.append({
                'lat': lat,
                'lng': lng,
                'intensity': intensity,
                'weight': intensity * 100
            })
    
    return heatmap_data

def calculate_bounds(heatmap_data: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate bounds for heatmap data"""
    if not heatmap_data:
        return {'north': 0, 'south': 0, 'east': 0, 'west': 0}
    
    lats = [point['lat'] for point in heatmap_data]
    lngs = [point['lng'] for point in heatmap_data]
    
    return {
        'north': max(lats),
        'south': min(lats),
        'east': max(lngs),
        'west': min(lngs)
    }

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in kilometers"""
    # Haversine formula
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat/2) * math.sin(dlat/2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng/2) * math.sin(dlng/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return distance

def calculate_match_score(distance: float, quantity: float, urgency: str, ngo: Dict[str, Any]) -> float:
    """Calculate match score between donor and NGO"""
    # Distance score (closer is better)
    distance_score = max(0, 100 - (distance * 2))
    
    # Quantity score (based on NGO capacity)
    capacity = ngo.get('capacity', 100)
    quantity_score = min(100, (quantity / capacity) * 100)
    
    # Urgency multiplier
    urgency_multipliers = {
        'low': 0.8,
        'normal': 1.0,
        'high': 1.2,
        'urgent': 1.5
    }
    urgency_multiplier = urgency_multipliers.get(urgency, 1.0)
    
    # Calculate final score
    match_score = (distance_score * 0.4 + quantity_score * 0.6) * urgency_multiplier
    
    return min(100, match_score)

def estimate_delivery_time(distance_km: float) -> str:
    """Estimate delivery time based on distance"""
    if distance_km < 5:
        return "15-30 minutes"
    elif distance_km < 15:
        return "30-60 minutes"
    elif distance_km < 30:
        return "1-2 hours"
    else:
        return "2+ hours"

def generate_distance_matrix(matches: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate distance matrix for optimization"""
    matrix = {}
    for i, match1 in enumerate(matches):
        matrix[f"ngo_{i}"] = {}
        for j, match2 in enumerate(matches):
            if i != j:
                distance = calculate_distance(
                    match1['location']['lat'],
                    match1['location']['lng'],
                    match2['location']['lat'],
                    match2['location']['lng']
                )
                matrix[f"ngo_{i}"][f"ngo_{j}"] = round(distance, 2)
    
    return matrix

def generate_matching_recommendations(matches: List[Dict[str, Any]], request: MatchingRequest) -> List[str]:
    """Generate recommendations based on matching results"""
    recommendations = []
    
    if not matches:
        recommendations.append("No nearby NGOs found. Consider expanding search radius.")
        return recommendations
    
    best_match = matches[0]
    
    if best_match['match_score'] > 80:
        recommendations.append(f"Excellent match found: {best_match['ngo_name']}")
        recommendations.append("Proceed with donation immediately")
    elif best_match['match_score'] > 60:
        recommendations.append(f"Good match found: {best_match['ngo_name']}")
        recommendations.append("Consider this NGO for donation")
    else:
        recommendations.append("Consider expanding search radius for better matches")
    
    if best_match['distance_km'] > 20:
        recommendations.append("Consider volunteer delivery for long distances")
    
    if request.urgency == "urgent":
        recommendations.append("URGENT: Contact NGO immediately")
        recommendations.append("Consider multiple NGOs for urgent requests")
    
    return recommendations

def analyze_coverage(locations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze coverage of locations"""
    # Group by type
    by_type = {}
    for loc in locations:
        loc_type = loc.get('type', 'unknown')
        if loc_type not in by_type:
            by_type[loc_type] = []
        by_type[loc_type].append(loc)
    
    # Calculate coverage metrics
    total_locations = len(locations)
    coverage_analysis = {
        'total_locations': total_locations,
        'by_type': {k: len(v) for k, v in by_type.items()},
        'coverage_density': total_locations / 100,  # Mock density calculation
        'gaps_identified': identify_coverage_gaps(locations)
    }
    
    return coverage_analysis

def analyze_clustering(locations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze clustering of locations"""
    # Simple clustering analysis
    clusters = []
    processed = set()
    
    for i, loc1 in enumerate(locations):
        if i in processed:
            continue
        
        cluster = [loc1]
        processed.add(i)
        
        for j, loc2 in enumerate(locations):
            if j in processed:
                continue
            
            distance = calculate_distance(
                loc1['lat'], loc1['lng'],
                loc2['lat'], loc2['lng']
            )
            
            if distance < 5:  # 5km cluster radius
                cluster.append(loc2)
                processed.add(j)
        
        clusters.append(cluster)
    
    return {
        'total_clusters': len(clusters),
        'cluster_sizes': [len(cluster) for cluster in clusters],
        'largest_cluster': max([len(cluster) for cluster in clusters]) if clusters else 0,
        'clusters': clusters
    }

def analyze_optimization(locations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze optimization opportunities"""
    # Calculate distances between all locations
    distances = []
    for i, loc1 in enumerate(locations):
        for j, loc2 in enumerate(locations):
            if i != j:
                distance = calculate_distance(
                    loc1['lat'], loc1['lng'],
                    loc2['lat'], loc2['lng']
                )
                distances.append(distance)
    
    return {
        'total_locations': len(locations),
        'average_distance': np.mean(distances) if distances else 0,
        'max_distance': max(distances) if distances else 0,
        'min_distance': min(distances) if distances else 0,
        'optimization_potential': calculate_optimization_potential(distances)
    }

def identify_coverage_gaps(locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Identify coverage gaps in the area"""
    # Mock gap identification
    gaps = []
    for i in range(3):  # Mock 3 gaps
        gaps.append({
            'lat': 40.7128 + (i * 0.1),
            'lng': -74.006 + (i * 0.1),
            'gap_type': 'low_coverage',
            'priority': 'medium'
        })
    return gaps

def calculate_optimization_potential(distances: List[float]) -> str:
    """Calculate optimization potential based on distances"""
    if not distances:
        return "low"
    
    avg_distance = np.mean(distances)
    if avg_distance > 20:
        return "high"
    elif avg_distance > 10:
        return "medium"
    else:
        return "low"

# Visualization generation functions
def generate_coverage_visualization(analysis: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'chart_type': 'coverage_map',
        'data': analysis,
        'visualization_options': ['heatmap', 'scatter', 'choropleth']
    }

def generate_clustering_visualization(analysis: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'chart_type': 'cluster_map',
        'data': analysis,
        'visualization_options': ['cluster', 'density', 'network']
    }

def generate_optimization_visualization(analysis: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'chart_type': 'optimization_map',
        'data': analysis,
        'visualization_options': ['route', 'network', 'flow']
    }

# Recommendation generation functions
def generate_coverage_recommendations(analysis: Dict[str, Any]) -> List[str]:
    recommendations = []
    
    if analysis['coverage_density'] < 0.5:
        recommendations.append("Low coverage density - consider adding more locations")
    
    if analysis['gaps_identified']:
        recommendations.append(f"Found {len(analysis['gaps_identified'])} coverage gaps")
        recommendations.append("Consider strategic placement of new locations")
    
    return recommendations

def generate_clustering_recommendations(analysis: Dict[str, Any]) -> List[str]:
    recommendations = []
    
    if analysis['total_clusters'] > 10:
        recommendations.append("Many small clusters - consider consolidation")
    
    if analysis['largest_cluster'] > 10:
        recommendations.append("Large cluster detected - consider splitting")
    
    return recommendations

def generate_optimization_recommendations(analysis: Dict[str, Any]) -> List[str]:
    recommendations = []
    
    if analysis['optimization_potential'] == 'high':
        recommendations.append("High optimization potential - implement route optimization")
        recommendations.append("Consider centralized distribution hubs")
    
    if analysis['average_distance'] > 15:
        recommendations.append("High average distances - optimize logistics")
    
    return recommendations
