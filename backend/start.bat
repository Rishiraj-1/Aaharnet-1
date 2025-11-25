@echo off
REM AAHARNET.AI Backend Startup Script for Windows

echo Starting AAHARNET.AI Backend...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo .env file not found. Creating from template...
    copy env.example .env
    echo Please edit .env file with your Firebase credentials and API keys
    echo Then run this script again.
    exit /b 1
)

REM Start the FastAPI server
echo Starting FastAPI server...
echo API Documentation: http://127.0.0.1:8000/docs
echo Health Check: http://127.0.0.1:8000/health
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

