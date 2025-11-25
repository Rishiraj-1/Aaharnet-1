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
from contextlib import asynccontextmanager
import uvicorn
import os
import signal
import sys
from dotenv import load_dotenv
import warnings
import logging
import sys
from io import StringIO

# Suppress dotenv parsing warnings (non-critical - problematic lines are just skipped)
warnings.filterwarnings('ignore', message='.*Python-dotenv could not parse.*')

# Suppress dotenv logger warnings
dotenv_logger = logging.getLogger('dotenv.main')
dotenv_logger.setLevel(logging.ERROR)  # Only show errors, not warnings

# Load environment variables FIRST (before importing routes that use Firebase)
# Temporarily suppress stderr to hide dotenv parsing warnings
old_stderr = sys.stderr
sys.stderr = StringIO()
try:
    load_dotenv(verbose=False)
finally:
    sys.stderr = old_stderr

# Import route modules (after loading .env)
from routes import auth_routes, forecast_routes, vision_routes, geo_routes, chatbot_routes, volunteer_routes, emergency_routes, donation_routes
from dependencies import get_current_user

# Auto-seed data on startup (only if collections are empty)
import logging
import os

logger = logging.getLogger(__name__)

def auto_seed_on_startup():
    """Automatically seed mock data on startup if collections are empty"""
    # Auto-seeding is now disabled by default to prevent server from getting stuck
    # Use the manual "Seed Data" button in the frontend instead
    try:
        # Only auto-seed if explicitly enabled via environment variable
        auto_seed_enabled = os.getenv("AUTO_SEED_ENABLED", "false").lower() == "true"
        
        if auto_seed_enabled:
            logger.info("Auto-seed is enabled via AUTO_SEED_ENABLED=true")
            logger.info("Checking if data seeding is needed...")
            from utils.auto_seed import auto_seed_data
            auto_seed_data()
        else:
            logger.info("Auto-seed is disabled by default. Use the 'Seed Data' button in the frontend for manual seeding.")
    except Exception as e:
        logger.warning(f"Auto-seed on startup failed (non-critical): {str(e)}")
        # Don't fail startup if seeding fails

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Application startup...")
    auto_seed_on_startup()
    logger.info("Application startup complete.")
    
    yield
    
    # Shutdown
    logger.info("Shutting down server gracefully...")
    try:
        # Close any open connections or cleanup resources
        # Firebase client doesn't need explicit cleanup
        logger.info("Server shutdown complete")
    except Exception as e:
        logger.warning(f"Error during shutdown cleanup: {str(e)}")

# Initialize FastAPI app with lifespan handler
app = FastAPI(
    title="AAHARNET.AI API",
    description="AI-Powered Food Redistribution Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
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
app.include_router(donation_routes.router, prefix="/api", tags=["Donations"])

# All dependencies are now in dependencies.py

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    logger.info("\nReceived shutdown signal. Stopping server...")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    if hasattr(signal, 'SIGINT'):
        signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Use reload=False for more reliable shutdown on Windows
        # Set reload=True only if you need auto-reload during development
        use_reload = os.getenv("UVICORN_RELOAD", "false").lower() == "true"
        
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8000,
            reload=use_reload,
            log_level="info",
            timeout_keep_alive=5,  # Reduce keep-alive timeout
            timeout_graceful_shutdown=5,  # Graceful shutdown timeout
            access_log=False  # Disable access logs for faster shutdown
        )
    except KeyboardInterrupt:
        logger.info("\nServer stopped by user (Ctrl+C)")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        sys.exit(1)
