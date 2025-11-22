# AAHARNET.AI Backend

AI-Powered Food Redistribution Platform Backend built with FastAPI, Firebase, and AI/ML models.

## 🚀 Features

- **Authentication**: Firebase Authentication integration
- **Food Forecasting**: Prophet-based demand and surplus prediction
- **Computer Vision**: TensorFlow-based shelf-life estimation
- **Geospatial Analysis**: Heatmaps and smart matching
- **Route Optimization**: OR-Tools for volunteer delivery optimization
- **AI Chatbot**: Multilingual support with translation
- **Emergency Response**: Disaster response and resource allocation

## 🛠️ Tech Stack

- **Framework**: FastAPI
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI/ML**: Prophet, TensorFlow, OR-Tools, Whisper, Transformers
- **Translation**: Google Translate API
- **Geospatial**: GeoPandas, Folium

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smartfood-connect/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Firebase credentials and API keys
   ```

5. **Run the application**
   ```bash
   python main.py
   ```

The API will be available at `http://127.0.0.1:8000`

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Enable Authentication
4. Generate service account credentials
5. Add credentials to `.env` file

### API Keys (Optional)

- **OpenWeather**: For weather data in forecasting
- **Mapbox**: For enhanced mapping features
- **ReliefWeb**: For disaster data

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

## 🏗️ Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── env.example            # Environment variables template
├── config/
│   └── firebase_config.py # Firebase configuration
├── routes/
│   ├── auth_routes.py     # Authentication endpoints
│   ├── forecast_routes.py # Food forecasting endpoints
│   ├── vision_routes.py   # Computer vision endpoints
│   ├── geo_routes.py      # Geospatial endpoints
│   ├── volunteer_routes.py # Route optimization endpoints
│   ├── chatbot_routes.py  # AI chatbot endpoints
│   └── emergency_routes.py # Emergency response endpoints
└── utils/
    └── firebase_helpers.py # Firebase utility functions
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Food Forecasting
- `POST /api/forecast/demand` - Forecast food demand
- `POST /api/forecast/surplus` - Forecast food surplus
- `POST /api/forecast/analysis` - Analyze demand patterns

### Computer Vision
- `POST /api/vision/shelf_life` - Analyze food freshness
- `POST /api/vision/batch_analysis` - Batch food analysis
- `POST /api/vision/iot_analysis` - IoT sensor analysis

### Geospatial
- `POST /api/geo/heatmap` - Generate heatmap data
- `POST /api/geo/nearby` - Find nearby users
- `POST /api/geo/matching` - Find optimal matches
- `POST /api/geo/analysis` - Geospatial analysis

### Route Optimization
- `POST /api/volunteer/optimize` - Optimize volunteer routes
- `POST /api/volunteer/assign` - Assign volunteers to tasks
- `POST /api/volunteer/analyze` - Analyze route performance

### AI Chatbot
- `POST /api/chatbot/chat` - Chat with AI assistant
- `POST /api/chatbot/transcribe` - Voice transcription
- `POST /api/chatbot/translate` - Text translation
- `POST /api/chatbot/analyze` - Conversation analysis

### Emergency Response
- `POST /api/emergency/alert` - Create emergency alert
- `GET /api/emergency/alerts` - Get active alerts
- `POST /api/emergency/disaster-data` - Get disaster data
- `POST /api/emergency/allocate-resources` - Allocate resources
- `POST /api/emergency/response-plan` - Generate response plan

## 🧪 Testing

Run tests with pytest:
```bash
pytest tests/
```

## 🚀 Deployment

### Local Development
```bash
python main.py
```

### Production with Gunicorn
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker (Optional)
```bash
docker build -t aaharnet-backend .
docker run -p 8000:8000 aaharnet-backend
```

## 🔒 Security

- Firebase JWT token verification
- Rate limiting with SlowAPI
- CORS protection
- Input validation with Pydantic

## 📊 Monitoring

- Health check endpoint: `GET /health`
- API documentation: `GET /docs`
- Logging configured for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.
