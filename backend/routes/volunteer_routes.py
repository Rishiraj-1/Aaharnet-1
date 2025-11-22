"""
Volunteer Route Optimization Module using OR-Tools
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

# OR-Tools imports
try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
except ImportError:
    # Mock OR-Tools for demo purposes
    class MockRoutingEnums:
        FIRST_UNBOUND_MINIMIZE_COST = 0
    routing_enums_pb2 = MockRoutingEnums()
    
    class MockPyWrapCP:
        def CreateRoutingModel(self, *args, **kwargs):
            return MockRoutingModel()
    pywrapcp = MockPyWrapCP()

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class Location(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    location_type: str  # donor, ngo, warehouse, volunteer_home
    capacity: Optional[float] = None
    priority: int = 1  # 1-5, higher is more urgent
    time_window_start: Optional[str] = None  # HH:MM format
    time_window_end: Optional[str] = None

class RouteOptimizationRequest(BaseModel):
    volunteer_id: str
    start_location: Location
    locations: List[Location]
    max_route_time_hours: float = 8.0
    vehicle_capacity: float = 1000.0  # kg
    optimization_type: str = "time"  # time, distance, cost, balanced

class RouteOptimizationResponse(BaseModel):
    optimized_route: List[Dict[str, Any]]
    total_distance_km: float
    total_time_hours: float
    total_cost: float
    route_efficiency: float
    recommendations: List[str]
    alternative_routes: List[Dict[str, Any]]

class VolunteerAssignmentRequest(BaseModel):
    volunteers: List[Dict[str, Any]]  # volunteer info
    tasks: List[Dict[str, Any]]  # pickup/delivery tasks
    constraints: Dict[str, Any]  # time, capacity, skill constraints

class VolunteerAssignmentResponse(BaseModel):
    assignments: List[Dict[str, Any]]
    unassigned_tasks: List[Dict[str, Any]]
    total_efficiency: float
    recommendations: List[str]

class RouteAnalysisRequest(BaseModel):
    route_data: List[Dict[str, Any]]
    analysis_type: str = "efficiency"  # efficiency, cost, time, environmental

class RouteAnalysisResponse(BaseModel):
    analysis_results: Dict[str, Any]
    improvements: List[str]
    environmental_impact: Dict[str, Any]

# Mock OR-Tools classes for demo
class MockRoutingModel:
    def __init__(self):
        self.solution = None
    
    def AddDimension(self, *args, **kwargs):
        pass
    
    def SetArcCostEvaluatorOfAllVehicles(self, *args, **kwargs):
        pass
    
    def SolveWithParameters(self, *args, **kwargs):
        return MockSolution()

class MockSolution:
    def __init__(self):
        self.objective_value = 100.0
    
    def ObjectiveValue(self):
        return self.objective_value

@router.post("/optimize", response_model=RouteOptimizationResponse)
async def optimize_volunteer_route(
    request: RouteOptimizationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Optimize volunteer delivery route using OR-Tools
    """
    try:
        # Validate input
        if len(request.locations) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 locations required for route optimization"
            )
        
        # Create distance matrix
        distance_matrix = create_distance_matrix(request.locations, request.start_location)
        
        # Solve routing problem
        solution = solve_routing_problem(
            distance_matrix,
            request.locations,
            request.start_location,
            request.max_route_time_hours,
            request.vehicle_capacity,
            request.optimization_type
        )
        
        # Generate optimized route
        optimized_route = generate_optimized_route(
            solution,
            request.locations,
            request.start_location,
            distance_matrix
        )
        
        # Calculate metrics
        total_distance = calculate_total_distance(optimized_route, distance_matrix)
        total_time = calculate_total_time(optimized_route, distance_matrix)
        total_cost = calculate_total_cost(optimized_route, total_distance, total_time)
        route_efficiency = calculate_route_efficiency(optimized_route, total_distance, total_time)
        
        # Generate recommendations
        recommendations = generate_route_recommendations(
            optimized_route,
            total_distance,
            total_time,
            route_efficiency
        )
        
        # Generate alternative routes
        alternative_routes = generate_alternative_routes(
            request.locations,
            request.start_location,
            distance_matrix
        )
        
        logger.info(f"Route optimization completed for volunteer {request.volunteer_id}")
        
        return RouteOptimizationResponse(
            optimized_route=optimized_route,
            total_distance_km=round(total_distance, 2),
            total_time_hours=round(total_time, 2),
            total_cost=round(total_cost, 2),
            route_efficiency=round(route_efficiency, 2),
            recommendations=recommendations,
            alternative_routes=alternative_routes
        )
        
    except Exception as e:
        logger.error(f"Route optimization failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route optimization failed: {str(e)}"
        )

@router.post("/assign", response_model=VolunteerAssignmentResponse)
async def assign_volunteers_to_tasks(
    request: VolunteerAssignmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Assign volunteers to tasks optimally
    """
    try:
        # Create assignment matrix
        assignment_matrix = create_assignment_matrix(request.volunteers, request.tasks)
        
        # Solve assignment problem
        assignments = solve_assignment_problem(assignment_matrix, request.volunteers, request.tasks)
        
        # Calculate unassigned tasks
        unassigned_tasks = find_unassigned_tasks(assignments, request.tasks)
        
        # Calculate total efficiency
        total_efficiency = calculate_assignment_efficiency(assignments)
        
        # Generate recommendations
        recommendations = generate_assignment_recommendations(assignments, unassigned_tasks)
        
        return VolunteerAssignmentResponse(
            assignments=assignments,
            unassigned_tasks=unassigned_tasks,
            total_efficiency=round(total_efficiency, 2),
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Volunteer assignment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Volunteer assignment failed: {str(e)}"
        )

@router.post("/analyze", response_model=RouteAnalysisResponse)
async def analyze_route_performance(
    request: RouteAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze route performance and suggest improvements
    """
    try:
        # Perform analysis based on type
        if request.analysis_type == "efficiency":
            analysis_results = analyze_route_efficiency(request.route_data)
        elif request.analysis_type == "cost":
            analysis_results = analyze_route_cost(request.route_data)
        elif request.analysis_type == "time":
            analysis_results = analyze_route_time(request.route_data)
        elif request.analysis_type == "environmental":
            analysis_results = analyze_environmental_impact(request.route_data)
        else:
            analysis_results = analyze_route_efficiency(request.route_data)
        
        # Generate improvements
        improvements = generate_route_improvements(analysis_results, request.analysis_type)
        
        # Calculate environmental impact
        environmental_impact = calculate_environmental_impact(request.route_data)
        
        return RouteAnalysisResponse(
            analysis_results=analysis_results,
            improvements=improvements,
            environmental_impact=environmental_impact
        )
        
    except Exception as e:
        logger.error(f"Route analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route analysis failed: {str(e)}"
        )

def create_distance_matrix(locations: List[Location], start_location: Location) -> List[List[float]]:
    """Create distance matrix between all locations"""
    all_locations = [start_location] + locations
    n = len(all_locations)
    
    distance_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                distance = calculate_distance(
                    all_locations[i].latitude,
                    all_locations[i].longitude,
                    all_locations[j].latitude,
                    all_locations[j].longitude
                )
                distance_matrix[i][j] = distance
    
    return distance_matrix

def solve_routing_problem(
    distance_matrix: List[List[float]],
    locations: List[Location],
    start_location: Location,
    max_time_hours: float,
    vehicle_capacity: float,
    optimization_type: str
) -> Dict[str, Any]:
    """Solve the routing problem using OR-Tools"""
    try:
        # Create routing model
        manager = pywrapcp.RoutingIndexManager(len(distance_matrix), 1, 0)
        routing = pywrapcp.RoutingModel(manager)
        
        # Define distance callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add capacity constraint
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:  # Start location
                return 0
            return locations[from_node - 1].capacity or 100
        
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            int(vehicle_capacity),  # vehicle capacity
            True,  # start cumul to zero
            'Capacity'
        )
        
        # Set search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FIRST_UNBOUND_MINIMIZE_COST
        )
        
        # Solve the problem
        solution = routing.SolveWithParameters(search_parameters)
        
        if solution:
            return {
                'solution': solution,
                'routing': routing,
                'manager': manager,
                'objective_value': solution.ObjectiveValue()
            }
        else:
            # Fallback to mock solution
            return create_mock_solution(locations, start_location, distance_matrix)
            
    except Exception as e:
        logger.warning(f"OR-Tools solving failed, using mock solution: {str(e)}")
        return create_mock_solution(locations, start_location, distance_matrix)

def create_mock_solution(locations: List[Location], start_location: Location, distance_matrix: List[List[float]]) -> Dict[str, Any]:
    """Create a mock solution when OR-Tools is not available"""
    # Simple greedy solution
    route = [0]  # Start at start location
    unvisited = list(range(1, len(locations) + 1))
    
    current = 0
    while unvisited:
        # Find nearest unvisited location
        nearest = min(unvisited, key=lambda x: distance_matrix[current][x])
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    
    # Return to start
    route.append(0)
    
    return {
        'route': route,
        'objective_value': sum(distance_matrix[route[i]][route[i+1]] for i in range(len(route)-1))
    }

def generate_optimized_route(
    solution: Dict[str, Any],
    locations: List[Location],
    start_location: Location,
    distance_matrix: List[List[float]]
) -> List[Dict[str, Any]]:
    """Generate optimized route from solution"""
    optimized_route = []
    
    if 'route' in solution:
        # Mock solution
        route_indices = solution['route']
    else:
        # OR-Tools solution
        route_indices = extract_route_from_solution(solution)
    
    all_locations = [start_location] + locations
    
    for i, location_index in enumerate(route_indices):
        if location_index < len(all_locations):
            location = all_locations[location_index]
            
            # Calculate arrival time
            arrival_time = calculate_arrival_time(optimized_route, i, distance_matrix)
            
            optimized_route.append({
                'sequence': i,
                'location_id': location.id,
                'location_name': location.name,
                'location_type': location.location_type,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'arrival_time': arrival_time,
                'priority': location.priority,
                'capacity': location.capacity
            })
    
    return optimized_route

def extract_route_from_solution(solution: Dict[str, Any]) -> List[int]:
    """Extract route from OR-Tools solution"""
    # Mock implementation
    return list(range(len(solution.get('locations', [])) + 1))

def calculate_arrival_time(route: List[Dict[str, Any]], index: int, distance_matrix: List[List[float]]) -> str:
    """Calculate arrival time for a location"""
    if index == 0:
        return "09:00"  # Start time
    
    # Calculate cumulative time
    total_minutes = 0
    for i in range(index):
        if i < len(route) - 1:
            distance = distance_matrix[i][i+1] if i+1 < len(distance_matrix) else 0
            total_minutes += distance * 2  # Assume 2 minutes per km
    
    # Convert to time
    start_hour = 9
    arrival_hour = start_hour + (total_minutes // 60)
    arrival_minute = total_minutes % 60
    
    return f"{arrival_hour:02d}:{arrival_minute:02d}"

def calculate_total_distance(route: List[Dict[str, Any]], distance_matrix: List[List[float]]) -> float:
    """Calculate total distance of the route"""
    total_distance = 0.0
    
    for i in range(len(route) - 1):
        from_index = i
        to_index = i + 1
        if to_index < len(distance_matrix):
            total_distance += distance_matrix[from_index][to_index]
    
    return total_distance

def calculate_total_time(route: List[Dict[str, Any]], distance_matrix: List[List[float]]) -> float:
    """Calculate total time of the route"""
    total_distance = calculate_total_distance(route, distance_matrix)
    # Assume average speed of 30 km/h in city
    return total_distance / 30.0

def calculate_total_cost(route: List[Dict[str, Any]], distance: float, time: float) -> float:
    """Calculate total cost of the route"""
    # Cost factors: fuel, time, vehicle maintenance
    fuel_cost = distance * 0.1  # $0.1 per km
    time_cost = time * 15  # $15 per hour
    maintenance_cost = distance * 0.05  # $0.05 per km
    
    return fuel_cost + time_cost + maintenance_cost

def calculate_route_efficiency(route: List[Dict[str, Any]], distance: float, time: float) -> float:
    """Calculate route efficiency score"""
    # Efficiency based on distance, time, and priority coverage
    priority_score = sum(location.get('priority', 1) for location in route) / len(route)
    distance_efficiency = max(0, 100 - distance * 2)  # Penalty for long distances
    time_efficiency = max(0, 100 - time * 10)  # Penalty for long times
    
    efficiency = (priority_score * 20 + distance_efficiency * 0.4 + time_efficiency * 0.4)
    return min(100, max(0, efficiency))

def generate_route_recommendations(
    route: List[Dict[str, Any]],
    distance: float,
    time: float,
    efficiency: float
) -> List[str]:
    """Generate recommendations for the route"""
    recommendations = []
    
    if efficiency > 80:
        recommendations.append("Excellent route efficiency!")
    elif efficiency > 60:
        recommendations.append("Good route efficiency")
    else:
        recommendations.append("Consider route optimization for better efficiency")
    
    if distance > 50:
        recommendations.append("Long route detected - consider splitting into multiple trips")
    
    if time > 6:
        recommendations.append("Long route time - ensure volunteer availability")
    
    # Check for priority locations
    high_priority_locations = [loc for loc in route if loc.get('priority', 1) >= 4]
    if high_priority_locations:
        recommendations.append(f"Route includes {len(high_priority_locations)} high-priority locations")
    
    return recommendations

def generate_alternative_routes(
    locations: List[Location],
    start_location: Location,
    distance_matrix: List[List[float]]
) -> List[Dict[str, Any]]:
    """Generate alternative routes"""
    alternatives = []
    
    # Alternative 1: Prioritize by priority
    priority_sorted = sorted(locations, key=lambda x: x.priority, reverse=True)
    alt_route = generate_route_for_locations(priority_sorted, start_location, distance_matrix)
    alternatives.append({
        'name': 'Priority-based Route',
        'route': alt_route,
        'description': 'Route optimized by location priority'
    })
    
    # Alternative 2: Shortest distance
    distance_sorted = sorted(locations, key=lambda x: distance_matrix[0][locations.index(x) + 1])
    alt_route = generate_route_for_locations(distance_sorted, start_location, distance_matrix)
    alternatives.append({
        'name': 'Shortest Distance Route',
        'route': alt_route,
        'description': 'Route optimized by shortest total distance'
    })
    
    return alternatives

def generate_route_for_locations(locations: List[Location], start_location: Location, distance_matrix: List[List[float]]) -> List[Dict[str, Any]]:
    """Generate route for a specific order of locations"""
    route = []
    
    # Add start location
    route.append({
        'location_id': start_location.id,
        'location_name': start_location.name,
        'location_type': start_location.location_type,
        'latitude': start_location.latitude,
        'longitude': start_location.longitude
    })
    
    # Add locations in order
    for location in locations:
        route.append({
            'location_id': location.id,
            'location_name': location.name,
            'location_type': location.location_type,
            'latitude': location.latitude,
            'longitude': location.longitude
        })
    
    return route

def create_assignment_matrix(volunteers: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> List[List[float]]:
    """Create assignment matrix between volunteers and tasks"""
    matrix = []
    
    for volunteer in volunteers:
        volunteer_row = []
        for task in tasks:
            # Calculate assignment score based on distance, skills, availability
            distance = calculate_distance(
                volunteer.get('latitude', 0),
                volunteer.get('longitude', 0),
                task.get('latitude', 0),
                task.get('longitude', 0)
            )
            
            skill_match = calculate_skill_match(volunteer, task)
            availability_match = calculate_availability_match(volunteer, task)
            
            score = (skill_match * 0.4 + availability_match * 0.3 + (100 - distance) * 0.3)
            volunteer_row.append(score)
        
        matrix.append(volunteer_row)
    
    return matrix

def calculate_skill_match(volunteer: Dict[str, Any], task: Dict[str, Any]) -> float:
    """Calculate skill match between volunteer and task"""
    volunteer_skills = volunteer.get('skills', [])
    task_skills = task.get('required_skills', [])
    
    if not task_skills:
        return 100  # No specific skills required
    
    matches = sum(1 for skill in task_skills if skill in volunteer_skills)
    return (matches / len(task_skills)) * 100

def calculate_availability_match(volunteer: Dict[str, Any], task: Dict[str, Any]) -> float:
    """Calculate availability match between volunteer and task"""
    volunteer_availability = volunteer.get('availability', [])
    task_time = task.get('scheduled_time', '')
    
    # Mock availability check
    return 100 if volunteer.get('available', True) else 0

def solve_assignment_problem(
    matrix: List[List[float]],
    volunteers: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Solve assignment problem using Hungarian algorithm (simplified)"""
    assignments = []
    
    # Simple greedy assignment
    used_tasks = set()
    
    for i, volunteer in enumerate(volunteers):
        best_task_index = -1
        best_score = -1
        
        for j, task in enumerate(tasks):
            if j not in used_tasks and matrix[i][j] > best_score:
                best_score = matrix[i][j]
                best_task_index = j
        
        if best_task_index != -1:
            used_tasks.add(best_task_index)
            assignments.append({
                'volunteer_id': volunteer['id'],
                'volunteer_name': volunteer['name'],
                'task_id': tasks[best_task_index]['id'],
                'task_name': tasks[best_task_index]['name'],
                'assignment_score': best_score,
                'estimated_time': tasks[best_task_index].get('estimated_time', '2 hours')
            })
    
    return assignments

def find_unassigned_tasks(assignments: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find tasks that couldn't be assigned"""
    assigned_task_ids = {assignment['task_id'] for assignment in assignments}
    unassigned = [task for task in tasks if task['id'] not in assigned_task_ids]
    return unassigned

def calculate_assignment_efficiency(assignments: List[Dict[str, Any]]) -> float:
    """Calculate overall assignment efficiency"""
    if not assignments:
        return 0
    
    total_score = sum(assignment['assignment_score'] for assignment in assignments)
    return total_score / len(assignments)

def generate_assignment_recommendations(assignments: List[Dict[str, Any]], unassigned_tasks: List[Dict[str, Any]]) -> List[str]:
    """Generate recommendations for volunteer assignments"""
    recommendations = []
    
    if len(assignments) > 0:
        avg_score = calculate_assignment_efficiency(assignments)
        if avg_score > 80:
            recommendations.append("Excellent volunteer assignments!")
        elif avg_score > 60:
            recommendations.append("Good volunteer assignments")
        else:
            recommendations.append("Consider reassigning volunteers for better efficiency")
    
    if unassigned_tasks:
        recommendations.append(f"{len(unassigned_tasks)} tasks remain unassigned")
        recommendations.append("Consider recruiting additional volunteers")
    
    return recommendations

def analyze_route_efficiency(route_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze route efficiency"""
    total_distance = sum(location.get('distance_to_next', 0) for location in route_data)
    total_time = sum(location.get('time_at_location', 0) for location in route_data)
    
    return {
        'total_distance': total_distance,
        'total_time': total_time,
        'efficiency_score': max(0, 100 - (total_distance * 0.5 + total_time * 2)),
        'optimization_potential': 'high' if total_distance > 30 else 'medium'
    }

def analyze_route_cost(route_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze route cost"""
    total_distance = sum(location.get('distance_to_next', 0) for location in route_data)
    fuel_cost = total_distance * 0.1
    time_cost = sum(location.get('time_at_location', 0) for location in route_data) * 15
    
    return {
        'fuel_cost': fuel_cost,
        'time_cost': time_cost,
        'total_cost': fuel_cost + time_cost,
        'cost_per_km': (fuel_cost + time_cost) / max(1, total_distance)
    }

def analyze_route_time(route_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze route time"""
    total_time = sum(location.get('time_at_location', 0) for location in route_data)
    travel_time = sum(location.get('travel_time', 0) for location in route_data)
    
    return {
        'total_time': total_time,
        'travel_time': travel_time,
        'service_time': total_time - travel_time,
        'time_efficiency': max(0, 100 - (total_time * 5))
    }

def analyze_environmental_impact(route_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze environmental impact"""
    total_distance = sum(location.get('distance_to_next', 0) for location in route_data)
    co2_emissions = total_distance * 0.12  # kg CO2 per km
    
    return {
        'total_distance': total_distance,
        'co2_emissions_kg': co2_emissions,
        'environmental_score': max(0, 100 - co2_emissions * 2)
    }

def generate_route_improvements(analysis_results: Dict[str, Any], analysis_type: str) -> List[str]:
    """Generate route improvement suggestions"""
    improvements = []
    
    if analysis_type == "efficiency":
        if analysis_results.get('efficiency_score', 0) < 70:
            improvements.append("Consider route optimization to improve efficiency")
        if analysis_results.get('total_distance', 0) > 50:
            improvements.append("Reduce total distance by clustering nearby locations")
    
    elif analysis_type == "cost":
        if analysis_results.get('total_cost', 0) > 100:
            improvements.append("Optimize route to reduce fuel and time costs")
        if analysis_results.get('cost_per_km', 0) > 2:
            improvements.append("Consider more efficient vehicle or route planning")
    
    elif analysis_type == "time":
        if analysis_results.get('total_time', 0) > 8:
            improvements.append("Split route into multiple trips to reduce time")
        if analysis_results.get('time_efficiency', 0) < 60:
            improvements.append("Optimize time allocation between locations")
    
    elif analysis_type == "environmental":
        if analysis_results.get('co2_emissions_kg', 0) > 10:
            improvements.append("Reduce CO2 emissions by optimizing route")
        if analysis_results.get('environmental_score', 0) < 70:
            improvements.append("Consider eco-friendly transportation options")
    
    return improvements

def calculate_environmental_impact(route_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate environmental impact of the route"""
    total_distance = sum(location.get('distance_to_next', 0) for location in route_data)
    
    return {
        'co2_emissions_kg': total_distance * 0.12,
        'fuel_consumption_liters': total_distance * 0.08,
        'environmental_score': max(0, 100 - total_distance * 0.5),
        'sustainability_rating': 'excellent' if total_distance < 20 else 'good' if total_distance < 40 else 'fair'
    }

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
