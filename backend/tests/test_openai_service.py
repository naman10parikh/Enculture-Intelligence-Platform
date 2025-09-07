"""
Tests for OpenAI service
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.openai_service import OpenAIService


class MockChoice:
    """Mock choice object for OpenAI response."""
    def __init__(self, content="", tool_calls=None):
        self.delta = MagicMock()
        self.delta.content = content
        self.delta.tool_calls = tool_calls or []
        self.message = MagicMock()
        self.message.content = content


class MockChunk:
    """Mock chunk object for streaming response."""
    def __init__(self, content="", tool_calls=None):
        self.choices = [MockChoice(content, tool_calls)]


@pytest.fixture
def openai_service():
    """Create OpenAI service instance for testing."""
    with patch('app.services.openai_service.AsyncOpenAI'):
        service = OpenAIService()
        return service


class TestOpenAIService:
    """Test cases for OpenAI service."""
    
    @pytest.mark.asyncio
    async def test_chat_completion_streaming(self, openai_service):
        """Test streaming chat completion."""
        # Mock streaming response
        mock_chunks = [
            MockChunk("Hello"),
            MockChunk(" there"),
            MockChunk("!")
        ]
        
        async def mock_stream():
            for chunk in mock_chunks:
                yield chunk
        
        openai_service.client.chat.completions.create = AsyncMock()
        openai_service.client.chat.completions.create.return_value = mock_stream()
        
        messages = [{"role": "user", "content": "Hello"}]
        
        result = []
        async for chunk in openai_service.chat_completion_streaming(messages):
            result.append(chunk)
        
        assert result == ["Hello", " there", "!"]
        
        # Verify the OpenAI client was called correctly
        openai_service.client.chat.completions.create.assert_called_once()
        call_args = openai_service.client.chat.completions.create.call_args
        assert call_args[1]["stream"] is True
        assert len(call_args[1]["messages"]) == 2  # System + user message
    
    @pytest.mark.asyncio
    async def test_chat_completion_with_persona(self, openai_service):
        """Test chat completion with persona context."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Response for CEO"
        
        openai_service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        messages = [{"role": "user", "content": "What's our culture status?"}]
        result = await openai_service.get_chat_completion(messages, persona="ceo")
        
        assert result == "Response for CEO"
        
        # Check that persona was included in system message
        call_args = openai_service.client.chat.completions.create.call_args
        system_message = call_args[1]["messages"][0]
        assert system_message["role"] == "system"
        assert "CEO" in system_message["content"]
    
    @pytest.mark.asyncio
    async def test_generate_survey_questions(self, openai_service):
        """Test survey question generation."""
        mock_response = MagicMock()
        mock_questions = [
            {
                "question": "How satisfied are you with communication?",
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
        mock_response.choices[0].message.content = str(mock_questions).replace("'", '"')
        
        openai_service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        with patch('json.loads', return_value=mock_questions):
            result = await openai_service.generate_survey_questions(
                survey_context="Team communication",
                num_questions=2,
                question_types=["rating", "text"]
            )
        
        assert len(result) == 2
        assert result[0]["question"] == "How satisfied are you with communication?"
        assert result[1]["type"] == "text"
    
    @pytest.mark.asyncio
    async def test_web_search_placeholder(self, openai_service):
        """Test web search functionality (placeholder implementation)."""
        result = await openai_service._perform_web_search("team engagement", 3)
        
        assert len(result) == 5  # Default num_results
        assert all(isinstance(item, str) for item in result)
        assert any("team engagement" in item.lower() for item in result)
    
    @pytest.mark.asyncio
    async def test_streaming_with_tools(self, openai_service):
        """Test streaming with tool calls."""
        # Mock tool call chunk
        tool_call = MagicMock()
        tool_call.function.name = "web_search"
        tool_call.function.arguments = '{"query": "culture trends"}'
        
        mock_chunks = [
            MockChunk("Here are some insights"),
            MockChunk("", tool_calls=[tool_call]),
            MockChunk(" about culture trends.")
        ]
        
        async def mock_stream():
            for chunk in mock_chunks:
                yield chunk
        
        openai_service.client.chat.completions.create = AsyncMock()
        openai_service.client.chat.completions.create.return_value = mock_stream()
        
        with patch.object(openai_service, '_perform_web_search', 
                         return_value=["Search result 1", "Search result 2"]):
            
            messages = [{"role": "user", "content": "Tell me about culture trends"}]
            
            result = []
            async for chunk in openai_service.chat_completion_streaming(
                messages, use_tools=True
            ):
                result.append(chunk)
        
        # Should include original content, search results, and continuation
        assert len(result) > 3
        assert "Here are some insights" in result
        assert any("Web Search Results" in chunk for chunk in result)
    
    @pytest.mark.asyncio
    async def test_error_handling_in_streaming(self, openai_service):
        """Test error handling in streaming."""
        openai_service.client.chat.completions.create = AsyncMock()
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        messages = [{"role": "user", "content": "Hello"}]
        
        result = []
        async for chunk in openai_service.chat_completion_streaming(messages):
            result.append(chunk)
        
        assert len(result) == 1
        assert "error" in result[0].lower()
        assert "apologize" in result[0].lower()
    
    @pytest.mark.asyncio
    async def test_error_handling_in_completion(self, openai_service):
        """Test error handling in regular completion."""
        openai_service.client.chat.completions.create = AsyncMock()
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        messages = [{"role": "user", "content": "Hello"}]
        result = await openai_service.get_chat_completion(messages)
        
        assert "error" in result.lower()
        assert "apologize" in result.lower()
    
    @pytest.mark.asyncio
    async def test_survey_generation_error_handling(self, openai_service):
        """Test error handling in survey generation."""
        openai_service.client.chat.completions.create = AsyncMock()
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        result = await openai_service.generate_survey_questions("Test context")
        
        assert result == []  # Should return empty list on error


class TestOpenAIServiceConfiguration:
    """Test OpenAI service configuration."""
    
    def test_service_initialization(self):
        """Test service initialization with correct settings."""
        with patch('app.services.openai_service.AsyncOpenAI') as mock_client:
            with patch('app.services.openai_service.settings') as mock_settings:
                mock_settings.openai_api_key = "test-key"
                mock_settings.openai_model = "gpt-4"
                mock_settings.openai_max_tokens = 2048
                mock_settings.openai_temperature = 0.7
                
                service = OpenAIService()
                
                # Check that client was initialized with API key
                mock_client.assert_called_once_with(api_key="test-key")
                
                # Check that settings were applied
                assert service.model == "gpt-4"
                assert service.max_tokens == 2048
                assert service.temperature == 0.7
    
    def test_web_search_tool_definition(self, openai_service):
        """Test that web search tool is properly defined."""
        tool = openai_service.web_search_tool
        
        assert tool["type"] == "function"
        assert tool["function"]["name"] == "web_search"
        assert "description" in tool["function"]
        assert "parameters" in tool["function"]
        
        # Check required parameters
        params = tool["function"]["parameters"]
        assert "query" in params["required"]
        assert params["properties"]["query"]["type"] == "string"
    
    def test_system_prompt_content(self, openai_service):
        """Test that system prompt contains expected content."""
        prompt = openai_service.system_prompt
        
        # Check for key concepts
        assert "Culture Intelligence Assistant" in prompt
        assert "Enculture" in prompt
        assert "personas" in prompt.lower()
        assert "web search" in prompt.lower()
        assert "data-driven" in prompt.lower()
