"""
Computer Vision Module for Food Shelf-Life Estimation
"""

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image
import io
import tensorflow as tf
import logging
from datetime import datetime, timedelta
import json
from dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ShelfLifeRequest(BaseModel):
    food_type: str
    storage_conditions: Dict[str, float]  # temperature, humidity, etc.
    purchase_date: Optional[str] = None

class ShelfLifeResponse(BaseModel):
    freshness_score: float  # 0-100
    estimated_hours_remaining: int
    confidence: float
    recommendations: List[str]
    analysis_details: Dict[str, Any]

class BatchAnalysisRequest(BaseModel):
    images: List[str]  # Base64 encoded images
    food_types: List[str]
    storage_conditions: Dict[str, float]

class BatchAnalysisResponse(BaseModel):
    results: List[ShelfLifeResponse]
    batch_summary: Dict[str, Any]

class IoTDataRequest(BaseModel):
    temperature: float
    humidity: float
    light_exposure: float
    food_type: str
    storage_duration_hours: int

class IoTAnalysisResponse(BaseModel):
    freshness_score: float
    estimated_hours_remaining: int
    risk_factors: List[str]
    recommendations: List[str]

# Mock model class (in production, you'd load a real trained model)
class FoodFreshnessModel:
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load pre-trained model for food freshness detection"""
        try:
            # In production, load your actual trained model
            # For demo purposes, we'll use a mock model
            self.model = "mock_model_loaded"
            logger.info("Food freshness model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            self.model = None
    
    def predict_freshness(self, image: np.ndarray, food_type: str) -> Dict[str, Any]:
        """Predict food freshness from image"""
        try:
            if self.model is None:
                raise Exception("Model not loaded")
            
            # Mock prediction logic (replace with actual model inference)
            # Analyze image features
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Calculate basic image features
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            # Mock freshness calculation based on image features
            freshness_score = self.calculate_mock_freshness(brightness, contrast, food_type)
            
            # Estimate remaining hours
            hours_remaining = self.estimate_hours_remaining(freshness_score, food_type)
            
            # Calculate confidence
            confidence = min(95, max(60, 100 - abs(50 - freshness_score) * 0.5))
            
            return {
                'freshness_score': freshness_score,
                'hours_remaining': hours_remaining,
                'confidence': confidence,
                'brightness': brightness,
                'contrast': contrast
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise e
    
    def calculate_mock_freshness(self, brightness: float, contrast: float, food_type: str) -> float:
        """Mock freshness calculation (replace with actual model logic)"""
        # Different food types have different freshness indicators
        freshness_factors = {
            'apple': {'bright_factor': 0.8, 'contrast_factor': 0.6},
            'banana': {'bright_factor': 0.7, 'contrast_factor': 0.8},
            'bread': {'bright_factor': 0.9, 'contrast_factor': 0.4},
            'vegetables': {'bright_factor': 0.85, 'contrast_factor': 0.7},
            'default': {'bright_factor': 0.8, 'contrast_factor': 0.6}
        }
        
        factors = freshness_factors.get(food_type.lower(), freshness_factors['default'])
        
        # Normalize brightness and contrast
        normalized_brightness = min(100, max(0, brightness * factors['bright_factor']))
        normalized_contrast = min(100, max(0, contrast * factors['contrast_factor']))
        
        # Calculate freshness score
        freshness_score = (normalized_brightness + normalized_contrast) / 2
        
        # Add some randomness for demo purposes
        freshness_score += np.random.uniform(-5, 5)
        
        return max(0, min(100, freshness_score))
    
    def estimate_hours_remaining(self, freshness_score: float, food_type: str) -> int:
        """Estimate remaining shelf life in hours"""
        # Base shelf life by food type (in hours)
        base_shelf_life = {
            'apple': 168,  # 7 days
            'banana': 72,  # 3 days
            'bread': 120,  # 5 days
            'vegetables': 96,  # 4 days
            'default': 72
        }
        
        base_hours = base_shelf_life.get(food_type.lower(), base_shelf_life['default'])
        
        # Calculate remaining hours based on freshness score
        remaining_hours = int(base_hours * (freshness_score / 100))
        
        return max(0, remaining_hours)

# Initialize model
freshness_model = FoodFreshnessModel()

@router.post("/shelf_life", response_model=ShelfLifeResponse)
async def analyze_shelf_life(
    file: UploadFile = File(...),
    food_type: str = "apple",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze food freshness and estimate shelf life from image
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Resize image if needed
        if image_array.shape[0] > 512 or image_array.shape[1] > 512:
            image = image.resize((512, 512))
            image_array = np.array(image)
        
        # Predict freshness
        prediction = freshness_model.predict_freshness(image_array, food_type)
        
        # Generate recommendations
        recommendations = generate_freshness_recommendations(
            prediction['freshness_score'],
            prediction['hours_remaining'],
            food_type
        )
        
        # Prepare analysis details
        analysis_details = {
            'image_processed': True,
            'food_type': food_type,
            'image_size': image_array.shape,
            'brightness': prediction['brightness'],
            'contrast': prediction['contrast'],
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Shelf life analysis completed for user {current_user['uid']}")
        
        return ShelfLifeResponse(
            freshness_score=round(prediction['freshness_score'], 2),
            estimated_hours_remaining=prediction['hours_remaining'],
            confidence=round(prediction['confidence'], 2),
            recommendations=recommendations,
            analysis_details=analysis_details
        )
        
    except Exception as e:
        logger.error(f"Shelf life analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Shelf life analysis failed: {str(e)}"
        )

@router.post("/batch_analysis", response_model=BatchAnalysisResponse)
async def batch_analysis(
    request: BatchAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze multiple food items in batch
    """
    try:
        results = []
        
        for i, (image_b64, food_type) in enumerate(zip(request.images, request.food_types)):
            try:
                # Decode base64 image
                import base64
                image_data = base64.b64decode(image_b64)
                image = Image.open(io.BytesIO(image_data))
                image_array = np.array(image)
                
                # Resize if needed
                if image_array.shape[0] > 512 or image_array.shape[1] > 512:
                    image = image.resize((512, 512))
                    image_array = np.array(image)
                
                # Predict freshness
                prediction = freshness_model.predict_freshness(image_array, food_type)
                
                # Generate recommendations
                recommendations = generate_freshness_recommendations(
                    prediction['freshness_score'],
                    prediction['hours_remaining'],
                    food_type
                )
                
                result = ShelfLifeResponse(
                    freshness_score=round(prediction['freshness_score'], 2),
                    estimated_hours_remaining=prediction['hours_remaining'],
                    confidence=round(prediction['confidence'], 2),
                    recommendations=recommendations,
                    analysis_details={
                        'item_index': i,
                        'food_type': food_type,
                        'image_size': image_array.shape
                    }
                )
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to analyze item {i}: {str(e)}")
                # Add error result
                results.append(ShelfLifeResponse(
                    freshness_score=0,
                    estimated_hours_remaining=0,
                    confidence=0,
                    recommendations=["Analysis failed"],
                    analysis_details={'error': str(e)}
                ))
        
        # Generate batch summary
        batch_summary = {
            'total_items': len(results),
            'successful_analyses': len([r for r in results if r.freshness_score > 0]),
            'average_freshness': np.mean([r.freshness_score for r in results if r.freshness_score > 0]),
            'items_needing_attention': len([r for r in results if r.freshness_score < 50]),
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        return BatchAnalysisResponse(
            results=results,
            batch_summary=batch_summary
        )
        
    except Exception as e:
        logger.error(f"Batch analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch analysis failed: {str(e)}"
        )

@router.post("/iot_analysis", response_model=IoTAnalysisResponse)
async def analyze_iot_data(
    request: IoTDataRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze food freshness based on IoT sensor data
    """
    try:
        # Analyze environmental factors
        risk_factors = []
        freshness_score = 100
        
        # Temperature analysis
        if request.temperature > 25:
            risk_factors.append("High temperature detected")
            freshness_score -= 20
        elif request.temperature < 0:
            risk_factors.append("Freezing temperature detected")
            freshness_score -= 15
        
        # Humidity analysis
        if request.humidity > 80:
            risk_factors.append("High humidity detected")
            freshness_score -= 15
        elif request.humidity < 30:
            risk_factors.append("Low humidity detected")
            freshness_score -= 10
        
        # Light exposure analysis
        if request.light_exposure > 1000:  # lux
            risk_factors.append("Excessive light exposure")
            freshness_score -= 10
        
        # Storage duration impact
        duration_factor = min(0.5, request.storage_duration_hours / 168)  # 1 week = 168 hours
        freshness_score -= duration_factor * 30
        
        # Food type specific adjustments
        food_type_factors = {
            'apple': 0.9,
            'banana': 0.7,
            'bread': 0.8,
            'vegetables': 0.85,
            'default': 0.8
        }
        
        factor = food_type_factors.get(request.food_type.lower(), food_type_factors['default'])
        freshness_score *= factor
        
        # Ensure score is within bounds
        freshness_score = max(0, min(100, freshness_score))
        
        # Estimate remaining hours
        base_hours = {
            'apple': 168,
            'banana': 72,
            'bread': 120,
            'vegetables': 96,
            'default': 72
        }
        
        remaining_hours = int(base_hours.get(request.food_type.lower(), base_hours['default']) * (freshness_score / 100))
        
        # Generate recommendations
        recommendations = generate_iot_recommendations(risk_factors, request)
        
        return IoTAnalysisResponse(
            freshness_score=round(freshness_score, 2),
            estimated_hours_remaining=max(0, remaining_hours),
            risk_factors=risk_factors,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"IoT analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"IoT analysis failed: {str(e)}"
        )

def generate_freshness_recommendations(freshness_score: float, hours_remaining: int, food_type: str) -> List[str]:
    """Generate recommendations based on freshness analysis"""
    recommendations = []
    
    if freshness_score >= 80:
        recommendations.append("Food is very fresh - can be stored for longer")
        recommendations.append("Suitable for donation to NGOs")
    elif freshness_score >= 60:
        recommendations.append("Food is moderately fresh - use within estimated time")
        recommendations.append("Consider donating to nearby NGOs")
    elif freshness_score >= 40:
        recommendations.append("Food is showing signs of aging - use soon")
        recommendations.append("Priority for immediate donation")
    else:
        recommendations.append("Food is not fresh - consider composting or immediate use")
        recommendations.append("Not suitable for donation")
    
    if hours_remaining < 24:
        recommendations.append("URGENT: Use or donate within 24 hours")
    
    # Food type specific recommendations
    if food_type.lower() in ['banana', 'apple']:
        recommendations.append("Store in cool, dry place")
    elif food_type.lower() == 'bread':
        recommendations.append("Store in airtight container")
    elif food_type.lower() == 'vegetables':
        recommendations.append("Store in refrigerator crisper")
    
    return recommendations

def generate_iot_recommendations(risk_factors: List[str], request: IoTDataRequest) -> List[str]:
    """Generate recommendations based on IoT data analysis"""
    recommendations = []
    
    if "High temperature detected" in risk_factors:
        recommendations.append("Move food to cooler storage area")
        recommendations.append("Consider refrigeration")
    
    if "High humidity detected" in risk_factors:
        recommendations.append("Improve ventilation in storage area")
        recommendations.append("Use dehumidifier if available")
    
    if "Low humidity detected" in risk_factors:
        recommendations.append("Increase humidity in storage area")
        recommendations.append("Use humidifier or water trays")
    
    if "Excessive light exposure" in risk_factors:
        recommendations.append("Move food away from direct light")
        recommendations.append("Use opaque storage containers")
    
    if request.storage_duration_hours > 72:
        recommendations.append("Food has been stored for extended period - check freshness")
    
    # General recommendations
    recommendations.append("Monitor environmental conditions regularly")
    recommendations.append("Implement automated alerts for critical conditions")
    
    return recommendations
