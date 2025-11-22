"""
Food Forecasting Module using Prophet
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from prophet import Prophet
from prophet.plot import plot_plotly
import plotly.graph_objs as go
import logging
from datetime import datetime, timedelta
import json
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ForecastRequest(BaseModel):
    historical_data: List[Dict[str, Any]]  # [{"date": "2024-01-01", "value": 100}, ...]
    forecast_days: int = 30
    food_type: Optional[str] = None
    location: Optional[str] = None

class ForecastResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    trend: str  # increasing, decreasing, stable
    confidence: float
    recommendations: List[str]
    chart_data: Dict[str, Any]

class DemandAnalysisRequest(BaseModel):
    location: str
    food_types: List[str]
    time_period: str  # daily, weekly, monthly

class DemandAnalysisResponse(BaseModel):
    location: str
    analysis: Dict[str, Any]
    recommendations: List[str]
    heatmap_data: Dict[str, Any]

@router.post("/demand", response_model=ForecastResponse)
async def forecast_food_demand(
    request: ForecastRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Forecast food demand using Prophet time series analysis
    """
    try:
        # Validate input data
        if len(request.historical_data) < 7:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 7 days of historical data required"
            )
        
        # Convert historical data to DataFrame
        df = pd.DataFrame(request.historical_data)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['value']
        df = df[['ds', 'y']].dropna()
        
        # Initialize Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05
        )
        
        # Add custom seasonalities for food patterns
        if request.food_type:
            model.add_seasonality(
                name='food_seasonality',
                period=7,  # Weekly pattern
                fourier_order=3
            )
        
        # Fit the model
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=request.forecast_days)
        
        # Make predictions
        forecast = model.predict(future)
        
        # Extract predictions
        predictions = []
        for i in range(len(df), len(forecast)):
            pred_date = forecast.iloc[i]['ds']
            pred_value = forecast.iloc[i]['yhat']
            pred_lower = forecast.iloc[i]['yhat_lower']
            pred_upper = forecast.iloc[i]['yhat_upper']
            
            predictions.append({
                'date': pred_date.strftime('%Y-%m-%d'),
                'predicted_demand': round(pred_value, 2),
                'lower_bound': round(pred_lower, 2),
                'upper_bound': round(pred_upper, 2),
                'confidence_interval': round(pred_upper - pred_lower, 2)
            })
        
        # Analyze trend
        recent_trend = forecast['yhat'].tail(7).mean() - forecast['yhat'].tail(14).head(7).mean()
        if recent_trend > 0.1:
            trend = "increasing"
        elif recent_trend < -0.1:
            trend = "decreasing"
        else:
            trend = "stable"
        
        # Calculate confidence score
        confidence = min(95, max(60, 100 - (forecast['yhat_upper'] - forecast['yhat_lower']).mean()))
        
        # Generate recommendations
        recommendations = generate_recommendations(trend, confidence, request.food_type)
        
        # Prepare chart data for frontend
        chart_data = {
            'historical': [
                {'date': row['ds'].strftime('%Y-%m-%d'), 'value': row['y']} 
                for _, row in df.iterrows()
            ],
            'forecast': predictions,
            'trend_line': [
                {'date': row['ds'].strftime('%Y-%m-%d'), 'value': row['yhat']} 
                for _, row in forecast.iterrows()
            ]
        }
        
        logger.info(f"Food demand forecast completed for user {current_user['uid']}")
        
        return ForecastResponse(
            predictions=predictions,
            trend=trend,
            confidence=round(confidence, 2),
            recommendations=recommendations,
            chart_data=chart_data
        )
        
    except Exception as e:
        logger.error(f"Forecast failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast failed: {str(e)}"
        )

@router.post("/surplus", response_model=ForecastResponse)
async def forecast_food_surplus(
    request: ForecastRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Forecast food surplus to optimize donation timing
    """
    try:
        # Similar to demand forecast but focused on surplus patterns
        df = pd.DataFrame(request.historical_data)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['value']
        df = df[['ds', 'y']].dropna()
        
        # Initialize Prophet model with different parameters for surplus
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            seasonality_mode='additive',
            changepoint_prior_scale=0.1
        )
        
        # Fit and predict
        model.fit(df)
        future = model.make_future_dataframe(periods=request.forecast_days)
        forecast = model.predict(future)
        
        # Extract predictions
        predictions = []
        for i in range(len(df), len(forecast)):
            pred_date = forecast.iloc[i]['ds']
            pred_value = forecast.iloc[i]['yhat']
            pred_lower = forecast.iloc[i]['yhat_lower']
            pred_upper = forecast.iloc[i]['yhat_upper']
            
            predictions.append({
                'date': pred_date.strftime('%Y-%m-%d'),
                'predicted_surplus': round(pred_value, 2),
                'lower_bound': round(pred_lower, 2),
                'upper_bound': round(pred_upper, 2),
                'confidence_interval': round(pred_upper - pred_lower, 2)
            })
        
        # Analyze surplus trend
        recent_surplus = forecast['yhat'].tail(7).mean()
        if recent_surplus > df['y'].mean() * 1.2:
            trend = "high_surplus"
        elif recent_surplus < df['y'].mean() * 0.8:
            trend = "low_surplus"
        else:
            trend = "normal"
        
        confidence = min(95, max(60, 100 - (forecast['yhat_upper'] - forecast['yhat_lower']).mean()))
        
        # Generate surplus-specific recommendations
        recommendations = generate_surplus_recommendations(trend, confidence, request.food_type)
        
        # Prepare chart data
        chart_data = {
            'historical': [
                {'date': row['ds'].strftime('%Y-%m-%d'), 'value': row['y']} 
                for _, row in df.iterrows()
            ],
            'forecast': predictions,
            'trend_line': [
                {'date': row['ds'].strftime('%Y-%m-%d'), 'value': row['yhat']} 
                for _, row in forecast.iterrows()
            ]
        }
        
        return ForecastResponse(
            predictions=predictions,
            trend=trend,
            confidence=round(confidence, 2),
            recommendations=recommendations,
            chart_data=chart_data
        )
        
    except Exception as e:
        logger.error(f"Surplus forecast failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Surplus forecast failed: {str(e)}"
        )

@router.post("/analysis", response_model=DemandAnalysisResponse)
async def analyze_demand_patterns(
    request: DemandAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze demand patterns for specific location and food types
    """
    try:
        # Generate mock analysis data (in production, this would query real data)
        analysis = {
            'peak_hours': ['08:00-10:00', '18:00-20:00'],
            'peak_days': ['Monday', 'Friday'],
            'seasonal_patterns': {
                'spring': 'high',
                'summer': 'medium',
                'autumn': 'high',
                'winter': 'low'
            },
            'food_type_preferences': {
                'vegetables': 0.4,
                'fruits': 0.3,
                'grains': 0.2,
                'dairy': 0.1
            }
        }
        
        recommendations = [
            f"Schedule donations during peak hours: {', '.join(analysis['peak_hours'])}",
            f"Focus on {analysis['peak_days'][0]} and {analysis['peak_days'][1]} for maximum impact",
            "Consider seasonal variations in food availability",
            "Optimize inventory based on food type preferences"
        ]
        
        # Generate heatmap data for visualization
        heatmap_data = generate_demand_heatmap(request.location, request.food_types)
        
        return DemandAnalysisResponse(
            location=request.location,
            analysis=analysis,
            recommendations=recommendations,
            heatmap_data=heatmap_data
        )
        
    except Exception as e:
        logger.error(f"Demand analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demand analysis failed: {str(e)}"
        )

def generate_recommendations(trend: str, confidence: float, food_type: Optional[str]) -> List[str]:
    """Generate recommendations based on forecast results"""
    recommendations = []
    
    if trend == "increasing":
        recommendations.append("Demand is increasing - consider increasing inventory")
        recommendations.append("Plan for higher volunteer capacity")
    elif trend == "decreasing":
        recommendations.append("Demand is decreasing - optimize inventory levels")
        recommendations.append("Consider promotional activities")
    else:
        recommendations.append("Demand is stable - maintain current operations")
    
    if confidence < 70:
        recommendations.append("Low confidence in forecast - gather more historical data")
    
    if food_type:
        recommendations.append(f"Consider seasonal patterns for {food_type}")
    
    return recommendations

def generate_surplus_recommendations(trend: str, confidence: float, food_type: Optional[str]) -> List[str]:
    """Generate recommendations for surplus management"""
    recommendations = []
    
    if trend == "high_surplus":
        recommendations.append("High surplus predicted - increase donation outreach")
        recommendations.append("Consider emergency food distribution")
        recommendations.append("Contact additional NGOs for surplus pickup")
    elif trend == "low_surplus":
        recommendations.append("Low surplus predicted - optimize food usage")
        recommendations.append("Consider alternative sourcing")
    else:
        recommendations.append("Normal surplus levels - maintain current donation schedule")
    
    if confidence < 70:
        recommendations.append("Low confidence in surplus forecast - monitor closely")
    
    return recommendations

def generate_demand_heatmap(location: str, food_types: List[str]) -> Dict[str, Any]:
    """Generate heatmap data for demand visualization"""
    # Mock heatmap data (in production, this would be real data)
    hours = [f"{h:02d}:00" for h in range(24)]
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    heatmap_data = []
    for day in days:
        for hour in hours:
            # Generate mock demand values
            base_demand = 50
            hour_factor = 1.5 if hour in ['08:00', '09:00', '18:00', '19:00'] else 1.0
            day_factor = 1.3 if day in ['Monday', 'Friday'] else 1.0
            
            demand = int(base_demand * hour_factor * day_factor * np.random.uniform(0.8, 1.2))
            
            heatmap_data.append({
                'day': day,
                'hour': hour,
                'demand': demand
            })
    
    return {
        'data': heatmap_data,
        'max_demand': max(item['demand'] for item in heatmap_data),
        'min_demand': min(item['demand'] for item in heatmap_data)
    }
