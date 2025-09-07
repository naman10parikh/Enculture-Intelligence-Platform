"""
Tests for chat API endpoints
"""

import json
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from main import app

client = TestClient(app)


class TestChatEndpoints:
    """Test cases for chat endpoints."""
    
    def test_health_endpoint(self):
        """Test the main health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "enculture-backend"
        assert "version" in data
    
    @patch('app.services.openai_service.openai_service.get_chat_completion')
    def test_chat_health_endpoint(self, mock_completion):
        """Test the chat service health endpoint."""
        mock_completion.return_value = "Health check response"
        
        response = client.get("/api/v1/chat/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "chat-service"
        assert data["openai_connection"] == "active"
    
    @patch('app.services.openai_service.openai_service.get_chat_completion')
    def test_chat_completion_endpoint(self, mock_completion):
        """Test the chat completion endpoint."""
        mock_completion.return_value = "This is a test response from the AI."
        
        payload = {
            "messages": [
                {"role": "user", "content": "Hello, how are you?"}
            ],
            "persona": "employee",
            "use_tools": False,
            "stream": False
        }
        
        response = client.post("/api/v1/chat/completion", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert data["persona"] == "employee"
        assert "usage" in data
    
    def test_chat_completion_invalid_payload(self):
        """Test chat completion with invalid payload."""
        payload = {
            "invalid_field": "invalid_value"
        }
        
        response = client.post("/api/v1/chat/completion", json=payload)
        assert response.status_code == 422  # Validation error
    
    @patch('app.services.openai_service.openai_service.generate_survey_questions')
    def test_generate_survey_endpoint(self, mock_generate):
        """Test the survey generation endpoint."""
        mock_questions = [
            {
                "question": "How satisfied are you with team communication?",
                "type": "rating",
                "options": ["1", "2", "3", "4", "5"],
                "required": True
            },
            {
                "question": "What improvements would you suggest?",
                "type": "text",
                "options": None,
                "required": False
            }
        ]
        mock_generate.return_value = mock_questions
        
        payload = {
            "context": "Team communication assessment",
            "num_questions": 2,
            "question_types": ["rating", "text"],
            "persona": "hr_admin"
        }
        
        response = client.post("/api/v1/chat/generate-survey", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "questions" in data
        assert len(data["questions"]) == 2
        assert data["context"] == payload["context"]
        assert data["total_questions"] == 2
    
    def test_generate_survey_invalid_context(self):
        """Test survey generation with missing context."""
        payload = {
            "num_questions": 5
            # Missing required "context" field
        }
        
        response = client.post("/api/v1/chat/generate-survey", json=payload)
        assert response.status_code == 422  # Validation error
    
    @patch('app.services.openai_service.openai_service.chat_completion_streaming')
    def test_chat_stream_endpoint(self, mock_streaming):
        """Test the streaming chat endpoint."""
        # Mock the async generator
        async def mock_stream():
            yield "Hello"
            yield " there"
            yield "!"
        
        mock_streaming.return_value = mock_stream()
        
        payload = {
            "messages": [
                {"role": "user", "content": "Hello"}
            ],
            "persona": "manager",
            "use_tools": True,
            "stream": True
        }
        
        response = client.post("/api/v1/chat/stream", json=payload)
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    
    def test_chat_stream_invalid_messages(self):
        """Test streaming with invalid message format."""
        payload = {
            "messages": [
                {"invalid_field": "test"}  # Missing required fields
            ]
        }
        
        response = client.post("/api/v1/chat/stream", json=payload)
        assert response.status_code == 422  # Validation error


class TestChatModels:
    """Test Pydantic models for chat endpoints."""
    
    def test_chat_message_validation(self):
        """Test ChatMessage model validation."""
        from app.models.chat import ChatMessage
        
        # Valid message
        message = ChatMessage(role="user", content="Hello")
        assert message.role == "user"
        assert message.content == "Hello"
        
        # Test with timestamp
        message_with_time = ChatMessage(
            role="assistant", 
            content="Hi there!", 
            timestamp="2023-10-01T12:00:00"
        )
        assert message_with_time.timestamp == "2023-10-01T12:00:00"
    
    def test_chat_request_validation(self):
        """Test ChatRequest model validation."""
        from app.models.chat import ChatRequest, ChatMessage
        
        messages = [
            ChatMessage(role="user", content="Hello"),
            ChatMessage(role="assistant", content="Hi!")
        ]
        
        request = ChatRequest(
            messages=messages,
            persona="employee",
            use_tools=True,
            stream=True
        )
        
        assert len(request.messages) == 2
        assert request.persona == "employee"
        assert request.use_tools is True
        assert request.stream is True
    
    def test_survey_question_validation(self):
        """Test SurveyQuestion model validation."""
        from app.models.chat import SurveyQuestion
        
        question = SurveyQuestion(
            question="How satisfied are you?",
            type="rating",
            options=["1", "2", "3", "4", "5"],
            required=True,
            classifier="satisfaction",
            metrics=["engagement_score"]
        )
        
        assert question.question == "How satisfied are you?"
        assert question.type == "rating"
        assert len(question.options) == 5
        assert question.required is True


class TestErrorHandling:
    """Test error handling scenarios."""
    
    @patch('app.services.openai_service.openai_service.get_chat_completion')
    def test_openai_service_error(self, mock_completion):
        """Test handling of OpenAI service errors."""
        mock_completion.side_effect = Exception("OpenAI API error")
        
        payload = {
            "messages": [
                {"role": "user", "content": "Hello"}
            ]
        }
        
        response = client.post("/api/v1/chat/completion", json=payload)
        assert response.status_code == 500
        
        data = response.json()
        assert "detail" in data
        assert "Failed to process chat completion request" in data["detail"]
    
    @patch('app.services.openai_service.openai_service.get_chat_completion')
    def test_chat_health_failure(self, mock_completion):
        """Test chat health endpoint when service fails."""
        mock_completion.side_effect = Exception("Connection failed")
        
        response = client.get("/api/v1/chat/health")
        assert response.status_code == 503
        
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "error" in data
