"""
AI Chatbot Module with Multilingual Support
"""

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import json
import re
import os
from dependencies import get_current_user

# Import translation and AI libraries
try:
    from deep_translator import GoogleTranslator
    import whisper
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
    TRANSLATOR_AVAILABLE = True
except ImportError:
    # Mock imports for demo
    class MockGoogleTranslator:
        def __init__(self, source='auto', target='en'):
            self.source = source
            self.target = target
        def translate(self, text):
            return f"Translated: {text}"
    
    class MockWhisper:
        def load_model(self, model_size):
            return self
        def transcribe(self, audio_path):
            return {'text': 'Mock transcription'}
    
    class MockGenai:
        def configure(self, api_key):
            pass
        def GenerativeModel(self, model_name):
            return MockModel()
    
    class MockModel:
        def generate_content(self, prompt, **kwargs):
            return type('obj', (object,), {'text': f"Gemini Response: {prompt}"})
    
    GoogleTranslator = MockGoogleTranslator
    whisper = MockWhisper()
    genai = MockGenai()
    TRANSLATOR_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    language: Optional[str] = "en"
    context: Optional[Dict[str, Any]] = None
    user_type: Optional[str] = None  # donor, ngo, volunteer

class ChatResponse(BaseModel):
    response: str
    language: str
    confidence: float
    suggestions: List[str]
    context: Dict[str, Any]

class VoiceTranscriptionRequest(BaseModel):
    audio_file: str  # Base64 encoded audio
    language: Optional[str] = "en"

class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    language: str
    confidence: float

class TranslationRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class TranslationResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    confidence: float

class ChatbotAnalysisRequest(BaseModel):
    conversation_history: List[Dict[str, Any]]
    analysis_type: str = "sentiment"  # sentiment, intent, topic

class ChatbotAnalysisResponse(BaseModel):
    analysis_results: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]

# Initialize AI components
# Note: GoogleTranslator is instantiated per translation with specific source/target
whisper_model = None
gemini_model = None

def initialize_ai_components():
    """Initialize AI components"""
    global whisper_model, gemini_model
    
    try:
        # Initialize Whisper for speech-to-text
        whisper_model = whisper.load_model("base")
        
        # Initialize Gemini AI
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            gemini_model = genai.GenerativeModel('gemini-pro')
            logger.info("Gemini AI initialized successfully")
        else:
            logger.warning("GEMINI_API_KEY not found, using mock responses")
            gemini_model = None
        
        logger.info("AI components initialized successfully")
    except Exception as e:
        logger.warning(f"AI components initialization failed, using mock: {str(e)}")
        whisper_model = None
        gemini_model = None

# Initialize on startup
initialize_ai_components()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatMessage,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Chat with AI assistant
    """
    try:
        # Detect language if not provided
        if not request.language or request.language == "auto":
            detected_language = detect_language(request.message)
        else:
            detected_language = request.language
        
        # Translate to English if needed
        if detected_language != "en":
            translated_message = translate_text(request.message, detected_language, "en")
        else:
            translated_message = request.message
        
        # Generate AI response
        ai_response = generate_ai_response(translated_message, request.context, request.user_type)
        
        # Translate response back to original language
        if detected_language != "en":
            final_response = translate_text(ai_response, "en", detected_language)
        else:
            final_response = ai_response
        
        # Generate suggestions
        suggestions = generate_chat_suggestions(final_response, request.user_type)
        
        # Prepare context
        context = {
            'user_id': current_user['uid'],
            'timestamp': datetime.now().isoformat(),
            'original_language': detected_language,
            'user_type': request.user_type,
            'message_length': len(request.message)
        }
        
        logger.info(f"Chat response generated for user {current_user['uid']}")
        
        return ChatResponse(
            response=final_response,
            language=detected_language,
            confidence=0.85,  # Mock confidence
            suggestions=suggestions,
            context=context
        )
        
    except Exception as e:
        logger.error(f"Chat failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )

@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    file: UploadFile = File(...),
    language: str = "en",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Transcribe voice to text using Whisper
    """
    try:
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an audio file"
            )
        
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe audio
            if whisper_model:
                result = whisper_model.transcribe(temp_file_path, language=language)
                transcription = result['text']
                confidence = 0.9  # Mock confidence
            else:
                # Mock transcription
                transcription = "Mock transcription of audio file"
                confidence = 0.7
            
            logger.info(f"Voice transcription completed for user {current_user['uid']}")
            
            return VoiceTranscriptionResponse(
                transcription=transcription,
                language=language,
                confidence=confidence
            )
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
        
    except Exception as e:
        logger.error(f"Voice transcription failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice transcription failed: {str(e)}"
        )

@router.post("/translate", response_model=TranslationResponse)
async def translate_text_endpoint(
    request: TranslationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Translate text between languages
    """
    try:
        # Translate text
        translated_text = translate_text(
            request.text,
            request.source_language,
            request.target_language
        )
        
        # Calculate confidence (mock)
        confidence = 0.9 if len(request.text) > 10 else 0.8
        
        return TranslationResponse(
            translated_text=translated_text,
            source_language=request.source_language,
            target_language=request.target_language,
            confidence=confidence
        )
        
    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )

@router.post("/analyze", response_model=ChatbotAnalysisResponse)
async def analyze_conversation(
    request: ChatbotAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze conversation for sentiment, intent, and topics
    """
    try:
        # Analyze conversation
        if request.analysis_type == "sentiment":
            analysis_results = analyze_sentiment(request.conversation_history)
        elif request.analysis_type == "intent":
            analysis_results = analyze_intent(request.conversation_history)
        elif request.analysis_type == "topic":
            analysis_results = analyze_topics(request.conversation_history)
        else:
            analysis_results = analyze_sentiment(request.conversation_history)
        
        # Generate insights
        insights = generate_conversation_insights(analysis_results, request.analysis_type)
        
        # Generate recommendations
        recommendations = generate_conversation_recommendations(analysis_results, request.analysis_type)
        
        return ChatbotAnalysisResponse(
            analysis_results=analysis_results,
            insights=insights,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"Conversation analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversation analysis failed: {str(e)}"
        )

@router.post("/gemini/generate-content")
async def generate_gemini_content(
    prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate content using Gemini AI with custom parameters
    """
    try:
        if not gemini_model:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini AI not available"
            )
        
        # Generate content with custom parameters
        response = gemini_model.generate_content(
            prompt,
            generation_config={
                'max_output_tokens': max_tokens,
                'temperature': temperature,
            },
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        return {
            "content": response.text,
            "prompt": prompt,
            "parameters": {
                "max_tokens": max_tokens,
                "temperature": temperature
            },
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Gemini content generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Content generation failed: {str(e)}"
        )

@router.post("/gemini/summarize")
async def summarize_with_gemini(
    text: str,
    max_length: int = 200,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Summarize text using Gemini AI
    """
    try:
        if not gemini_model:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini AI not available"
            )
        
        prompt = f"Please summarize the following text in approximately {max_length} characters:\n\n{text}"
        
        response = gemini_model.generate_content(prompt)
        
        return {
            "original_text": text,
            "summary": response.text,
            "original_length": len(text),
            "summary_length": len(response.text),
            "compression_ratio": len(response.text) / len(text)
        }
        
    except Exception as e:
        logger.error(f"Gemini summarization failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization failed: {str(e)}"
        )

@router.post("/gemini/extract-insights")
async def extract_insights_with_gemini(
    data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Extract insights from data using Gemini AI
    """
    try:
        if not gemini_model:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini AI not available"
            )
        
        # Create context-specific prompt based on data type
        if 'donation_data' in data:
            prompt = f"""Analyze the following food donation data and provide insights:

{json.dumps(data['donation_data'], indent=2)}

Please provide:
1. Key trends and patterns
2. Recommendations for improvement
3. Potential issues or concerns
4. Opportunities for optimization

Focus on food waste reduction and hunger relief impact."""
        
        elif 'volunteer_data' in data:
            prompt = f"""Analyze the following volunteer activity data and provide insights:

{json.dumps(data['volunteer_data'], indent=2)}

Please provide:
1. Volunteer engagement patterns
2. Efficiency metrics
3. Areas for improvement
4. Recognition opportunities

Focus on volunteer satisfaction and impact maximization."""
        
        else:
            prompt = f"""Analyze the following data and provide insights:

{json.dumps(data, indent=2)}

Please provide:
1. Key findings
2. Trends and patterns
3. Recommendations
4. Action items

Focus on actionable insights for food redistribution and hunger relief."""
        
        response = gemini_model.generate_content(prompt)
        
        return {
            "data_analyzed": data,
            "insights": response.text,
            "analysis_timestamp": datetime.now().isoformat(),
            "data_type": list(data.keys())[0] if data else "general"
        }
        
    except Exception as e:
        logger.error(f"Gemini insights extraction failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Insights extraction failed: {str(e)}"
        )

@router.get("/languages")
async def get_supported_languages():
    """
    Get list of supported languages
    """
    return {
        "supported_languages": [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "it", "name": "Italian"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "ru", "name": "Russian"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
            {"code": "zh", "name": "Chinese"},
            {"code": "ar", "name": "Arabic"},
            {"code": "hi", "name": "Hindi"},
            {"code": "bn", "name": "Bengali"},
            {"code": "ta", "name": "Tamil"},
            {"code": "te", "name": "Telugu"}
        ],
        "total_languages": 15
    }

def detect_language(text: str) -> str:
    """Detect language of the text"""
    try:
        # Simple language detection based on common words
        text_lower = text.lower()
        
        # English indicators
        english_words = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with']
        if any(word in text_lower for word in english_words):
            return "en"
        
        # Spanish indicators
        spanish_words = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se']
        if any(word in text_lower for word in spanish_words):
            return "es"
        
        # French indicators
        french_words = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'que', 'ne', 'se']
        if any(word in text_lower for word in french_words):
            return "fr"
        
        # Default to English
        return "en"
        
    except Exception:
        return "en"

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text between languages using deep_translator"""
    try:
        if source_lang == target_lang:
            return text
        
        # Use GoogleTranslator from deep_translator
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated = translator.translate(text)
        return translated
    except Exception as e:
        logger.warning(f"Translation failed: {str(e)}")
        return text

def create_gemini_prompt(message: str, context: Optional[Dict[str, Any]], user_type: Optional[str]) -> str:
    """Create context-aware prompt for Gemini AI"""
    
    # Base system prompt
    system_prompt = """You are AAHARNET.AI, an AI assistant for a food redistribution platform that connects food donors with NGOs and volunteers to reduce food waste and fight hunger.

Your role is to help users with:
- Food donation guidance and scheduling
- Volunteer opportunities and coordination
- NGO services and food requests
- Emergency food distribution
- Platform navigation and support

Always be helpful, empathetic, and focused on reducing food waste while helping those in need."""

    # Add user type context
    if user_type == 'donor':
        system_prompt += "\n\nThe user is a food donor. Help them with donation scheduling, finding nearby NGOs, understanding donation guidelines, and tracking their impact."
    elif user_type == 'ngo':
        system_prompt += "\n\nThe user is an NGO representative. Help them with food requests, managing beneficiaries, coordinating with volunteers, and accessing available donations."
    elif user_type == 'volunteer':
        system_prompt += "\n\nThe user is a volunteer. Help them find available tasks, schedule deliveries, track volunteer hours, and coordinate with donors and NGOs."
    
    # Add context information
    if context:
        context_info = []
        if 'location' in context:
            context_info.append(f"User location: {context['location']}")
        if 'previous_messages' in context:
            context_info.append(f"Previous conversation context: {context['previous_messages']}")
        
        if context_info:
            system_prompt += f"\n\nAdditional context: {'; '.join(context_info)}"
    
    # Create final prompt
    prompt = f"{system_prompt}\n\nUser message: {message}\n\nPlease provide a helpful response that addresses their needs while staying focused on food redistribution and hunger relief."
    
    return prompt

def generate_ai_response(message: str, context: Optional[Dict[str, Any]], user_type: Optional[str]) -> str:
    """Generate AI response using Gemini AI"""
    try:
        # Use Gemini AI if available
        if gemini_model:
            # Create context-aware prompt
            prompt = create_gemini_prompt(message, context, user_type)
            
            # Generate response with safety settings
            response = gemini_model.generate_content(
                prompt,
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            )
            return response.text
        else:
            # Fallback to mock response
            return generate_mock_response(message, user_type)
            
    except Exception as e:
        logger.warning(f"Gemini AI response generation failed: {str(e)}")
        return generate_mock_response(message, user_type)

def generate_mock_response(message: str, user_type: Optional[str]) -> str:
    """Generate mock AI response based on keywords"""
    message_lower = message.lower()
    
    # Food-related responses
    if any(word in message_lower for word in ['food', 'donate', 'donation']):
        if user_type == 'donor':
            return "I can help you with food donations! You can schedule a pickup, find nearby NGOs, or get information about donation guidelines."
        elif user_type == 'ngo':
            return "I can help you with food requests! You can create requests, find available donations, or manage your beneficiaries."
        else:
            return "I can help you with food-related questions! Are you looking to donate food, request food, or volunteer?"
    
    # Volunteer-related responses
    elif any(word in message_lower for word in ['volunteer', 'help', 'delivery']):
        return "I can help you find volunteer opportunities! You can browse available tasks, schedule deliveries, or track your volunteer hours."
    
    # Location-related responses
    elif any(word in message_lower for word in ['location', 'nearby', 'where', 'distance']):
        return "I can help you find locations! You can search for nearby donors, NGOs, or volunteers in your area."
    
    # Emergency-related responses
    elif any(word in message_lower for word in ['emergency', 'urgent', 'help', 'crisis']):
        return "For emergencies, I can help you find immediate assistance! You can access emergency food distribution or contact local relief organizations."
    
    # General help
    elif any(word in message_lower for word in ['help', 'how', 'what', 'can you']):
        return "I'm here to help! I can assist with food donations, volunteer coordination, location services, and emergency response. What would you like to know?"
    
    # Default response
    else:
        return "I understand you're looking for assistance. I can help with food donations, volunteer opportunities, location services, and emergency response. How can I assist you today?"

def generate_chat_suggestions(response: str, user_type: Optional[str]) -> List[str]:
    """Generate chat suggestions based on response and user type"""
    suggestions = []
    
    if user_type == 'donor':
        suggestions.extend([
            "Schedule a pickup",
            "Find nearby NGOs",
            "View donation history",
            "Get donation guidelines"
        ])
    elif user_type == 'ngo':
        suggestions.extend([
            "Create food request",
            "Find available donations",
            "Manage beneficiaries",
            "View request history"
        ])
    elif user_type == 'volunteer':
        suggestions.extend([
            "Browse available tasks",
            "Schedule delivery",
            "Track volunteer hours",
            "Update availability"
        ])
    else:
        suggestions.extend([
            "Learn about donations",
            "Find volunteer opportunities",
            "Contact support",
            "View platform features"
        ])
    
    return suggestions[:4]  # Limit to 4 suggestions

def analyze_sentiment(conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze sentiment of conversation"""
    sentiments = []
    
    for message in conversation_history:
        text = message.get('message', '').lower()
        
        # Simple sentiment analysis
        positive_words = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank', 'helpful']
        negative_words = ['bad', 'terrible', 'angry', 'frustrated', 'disappointed', 'problem', 'issue']
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if positive_count > negative_count:
            sentiments.append('positive')
        elif negative_count > positive_count:
            sentiments.append('negative')
        else:
            sentiments.append('neutral')
    
    # Calculate overall sentiment
    positive_count = sentiments.count('positive')
    negative_count = sentiments.count('negative')
    neutral_count = sentiments.count('neutral')
    
    total_messages = len(sentiments)
    
    return {
        'overall_sentiment': 'positive' if positive_count > negative_count else 'negative' if negative_count > positive_count else 'neutral',
        'sentiment_distribution': {
            'positive': positive_count / total_messages,
            'negative': negative_count / total_messages,
            'neutral': neutral_count / total_messages
        },
        'sentiment_score': (positive_count - negative_count) / total_messages,
        'total_messages': total_messages
    }

def analyze_intent(conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze intent of conversation"""
    intents = []
    
    for message in conversation_history:
        text = message.get('message', '').lower()
        
        # Intent classification
        if any(word in text for word in ['donate', 'donation', 'give']):
            intents.append('donation')
        elif any(word in text for word in ['request', 'need', 'food']):
            intents.append('request')
        elif any(word in text for word in ['volunteer', 'help', 'deliver']):
            intents.append('volunteer')
        elif any(word in text for word in ['location', 'nearby', 'where']):
            intents.append('location')
        elif any(word in text for word in ['emergency', 'urgent', 'crisis']):
            intents.append('emergency')
        else:
            intents.append('general')
    
    # Count intents
    intent_counts = {}
    for intent in intents:
        intent_counts[intent] = intent_counts.get(intent, 0) + 1
    
    return {
        'primary_intent': max(intent_counts, key=intent_counts.get),
        'intent_distribution': intent_counts,
        'total_intents': len(intents)
    }

def analyze_topics(conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze topics in conversation"""
    topics = []
    
    for message in conversation_history:
        text = message.get('message', '').lower()
        
        # Topic extraction
        if any(word in text for word in ['food', 'meal', 'hunger']):
            topics.append('food')
        if any(word in text for word in ['donation', 'charity', 'help']):
            topics.append('charity')
        if any(word in text for word in ['volunteer', 'service', 'community']):
            topics.append('volunteering')
        if any(word in text for word in ['location', 'address', 'place']):
            topics.append('location')
        if any(word in text for word in ['emergency', 'crisis', 'disaster']):
            topics.append('emergency')
    
    # Count topics
    topic_counts = {}
    for topic in topics:
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    
    return {
        'main_topics': list(topic_counts.keys()),
        'topic_frequency': topic_counts,
        'total_topics': len(topics)
    }

def generate_conversation_insights(analysis_results: Dict[str, Any], analysis_type: str) -> List[str]:
    """Generate insights from conversation analysis"""
    insights = []
    
    if analysis_type == "sentiment":
        sentiment = analysis_results.get('overall_sentiment', 'neutral')
        score = analysis_results.get('sentiment_score', 0)
        
        if sentiment == 'positive':
            insights.append("User shows positive sentiment throughout the conversation")
        elif sentiment == 'negative':
            insights.append("User shows negative sentiment - may need additional support")
        else:
            insights.append("User shows neutral sentiment")
        
        if abs(score) > 0.5:
            insights.append("Strong sentiment detected in conversation")
    
    elif analysis_type == "intent":
        primary_intent = analysis_results.get('primary_intent', 'general')
        insights.append(f"Primary user intent: {primary_intent}")
        
        intent_dist = analysis_results.get('intent_distribution', {})
        if len(intent_dist) > 1:
            insights.append("Multiple intents detected in conversation")
    
    elif analysis_type == "topic":
        main_topics = analysis_results.get('main_topics', [])
        insights.append(f"Main topics discussed: {', '.join(main_topics)}")
        
        if 'emergency' in main_topics:
            insights.append("Emergency-related topics detected - prioritize response")
    
    return insights

def generate_conversation_recommendations(analysis_results: Dict[str, Any], analysis_type: str) -> List[str]:
    """Generate recommendations based on conversation analysis"""
    recommendations = []
    
    if analysis_type == "sentiment":
        sentiment = analysis_results.get('overall_sentiment', 'neutral')
        
        if sentiment == 'negative':
            recommendations.append("Consider escalating to human support")
            recommendations.append("Provide additional resources and assistance")
        elif sentiment == 'positive':
            recommendations.append("Continue with current approach")
            recommendations.append("Consider asking for feedback or testimonials")
    
    elif analysis_type == "intent":
        primary_intent = analysis_results.get('primary_intent', 'general')
        
        if primary_intent == 'emergency':
            recommendations.append("Prioritize emergency response procedures")
            recommendations.append("Connect user with emergency resources immediately")
        elif primary_intent == 'donation':
            recommendations.append("Provide donation-specific guidance and resources")
        elif primary_intent == 'volunteer':
            recommendations.append("Share volunteer opportunities and information")
    
    elif analysis_type == "topic":
        main_topics = analysis_results.get('main_topics', [])
        
        if 'emergency' in main_topics:
            recommendations.append("Activate emergency response protocols")
            recommendations.append("Provide immediate assistance resources")
        
        if 'food' in main_topics:
            recommendations.append("Share food-related resources and information")
        
        if 'volunteering' in main_topics:
            recommendations.append("Connect user with volunteer opportunities")
    
    return recommendations
