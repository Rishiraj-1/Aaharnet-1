"""
AAHARNET.AI Backend - FastAPI Application
AI-Powered Food Redistribution Platform
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables FIRST (before importing routes that use Firebase)
load_dotenv()

# Import route modules (after loading .env)
from routes import auth_routes, forecast_routes, vision_routes, geo_routes, chatbot_routes, volunteer_routes, emergency_routes
from dependencies import get_current_user

# Initialize FastAPI app
app = FastAPI(
    title="AAHARNET.AI API",
    description="AI-Powered Food Redistribution Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Rate limiting
# Monkey-patch starlette.config to handle encoding errors in .env file
import starlette.config
_original_read_file = starlette.config.Config._read_file

def _patched_read_file(self, file_name):
    try:
        return _original_read_file(self, file_name)
    except UnicodeDecodeError:
        # If encoding fails, return empty dict (we already loaded .env with python-dotenv)
        return {}

starlette.config.Config._read_file = _patched_read_file

limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
        "https://your-frontend-domain.vercel.app"  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: get_current_user is now defined in dependencies.py to avoid circular imports

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "AAHARNET.AI Backend API",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AAHARNET.AI Backend"}

# Include all route modules
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(forecast_routes.router, prefix="/api/forecast", tags=["AI Forecasting"])
app.include_router(vision_routes.router, prefix="/api/vision", tags=["Computer Vision"])
app.include_router(geo_routes.router, prefix="/api/geo", tags=["Geospatial"])
app.include_router(chatbot_routes.router, prefix="/api/chatbot", tags=["AI Chatbot"])
app.include_router(volunteer_routes.router, prefix="/api/volunteer", tags=["Volunteer Management"])
app.include_router(emergency_routes.router, prefix="/api/emergency", tags=["Emergency Response"])

# All dependencies are now in dependencies.py

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
