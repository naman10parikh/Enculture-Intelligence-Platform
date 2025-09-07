"""
OpenAI gpt-4.1 Responses API service for chat functionality with streaming support
"""

import json
import logging
import asyncio
from typing import AsyncGenerator, Dict, List, Optional, Any

import openai
from openai import OpenAI, AsyncOpenAI

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class OpenAIService:
    """Service for interacting with OpenAI gpt-4.1 Responses API."""
    
    def __init__(self):
        """Initialize OpenAI service with API key."""
        # Use synchronous client for Responses API (based on your working test.py)
        self.sync_client = OpenAI(api_key=settings.openai_api_key)
        # Keep async client for compatibility
        self.async_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4.1"  # Using gpt-4.1 model
        
        # Culture intelligence instructions for gpt-4.1 Responses API
        self.base_instructions = """You are an AI Culture Intelligence Assistant for Enculture, a platform designed to enhance and quantify company culture. Your role is to:

1. **Analyze Culture Data**: Help interpret employee feedback, survey results, and culture metrics
2. **Provide Insights**: Generate actionable insights about team dynamics, employee engagement, and cultural health
3. **Suggest Actions**: Recommend specific actions to improve culture based on data patterns
4. **Support Different Personas**: Tailor responses for CEOs, HR admins, managers, and employees
5. **Use Web Search**: When discussing current trends, best practices, or recent research in organizational culture, use web search to provide up-to-date information

Always be empathetic, professional, and focused on positive culture building. Use data-driven insights while maintaining a human-centered approach. Be concise yet comprehensive in your responses."""

    async def chat_completion_streaming(
        self,
        messages: List[Dict[str, str]],
        use_tools: bool = True,
        persona: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming chat completion using gpt-4.1 Responses API.
        
        Args:
            messages: List of chat messages
            use_tools: Whether to enable web search tools
            persona: User persona (CEO, HR admin, manager, employee)
        
        Yields:
            Streaming response chunks
        """
        try:
            # Extract the last user message as input
            user_input = ""
            if messages and messages[-1].get("role") == "user":
                user_input = messages[-1]["content"]
            else:
                user_input = "Hello, how can you help with culture intelligence?"
            
            # Build conversation context from previous messages
            conversation_context = ""
            if len(messages) > 1:
                context_messages = messages[:-1]  # All except the last user message
                conversation_context = "\n\nConversation context:\n"
                for msg in context_messages[-5:]:  # Last 5 messages for context
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    conversation_context += f"{role.title()}: {content}\n"
            
            # Build instructions with persona context
            instructions = self.base_instructions
            if persona:
                instructions += f"\n\nCurrent user persona: {persona}. Tailor your response appropriately for this role."
            if conversation_context:
                instructions += conversation_context
            
            # Prepare tools for web search
            tools = []
            if use_tools:
                tools.append({"type": "web_search_preview"})
            
            logger.info(f"Initiating gpt-4.1 Responses API call with web search: {use_tools}")
            
            # Use synchronous client in async context (based on your working test.py)
            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    # reasoning={"effort": "medium"},
                    tools=tools if tools else None,
                    parallel_tool_calls=True
                )
            
            # Run the synchronous call in a thread pool
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            # Get the response text
            response_text = response.output_text
            
            # Clean up any unicode escapes in the response
            response_text = (response_text
                .replace('\\u2019', "'")     # Right single quotation mark
                .replace('\\u201c', '"')     # Left double quotation mark  
                .replace('\\u201d', '"')     # Right double quotation mark
                .replace('\\u2013', '–')     # En dash
                .replace('\\u2014', '—')     # Em dash
                .replace('\\u2026', '...')   # Horizontal ellipsis
                .replace('\\u00a0', ' ')     # Non-breaking space
                .replace('\u2019', "'")      # Handle actual unicode chars too
                .replace('\u201c', '"')
                .replace('\u201d', '"')
                .replace('\u2013', '–')
                .replace('\u2014', '—')
                .replace('\u2026', '...')
                .replace('\u00a0', ' '))
            
            # Simulate streaming by yielding sentence-based chunks to preserve markdown
            sentences = response_text.split('. ')
            current_chunk = ""
            
            for i, sentence in enumerate(sentences):
                if i < len(sentences) - 1:
                    current_chunk += sentence + ". "
                else:
                    current_chunk += sentence  # Last sentence might not end with period
                
                # Yield chunks every 2-3 sentences or when we hit markdown breaks
                if (i + 1) % 2 == 0 or i == len(sentences) - 1 or '\n#' in sentence:
                    if current_chunk.strip():
                        yield current_chunk
                        current_chunk = ""
                        # Small delay to simulate streaming
                        await asyncio.sleep(0.15)
            
        except Exception as e:
            logger.error(f"Error in gpt-4.1 Responses API: {str(e)}")
            yield f"I apologize, but I encountered an error while processing your request. Please try again. Error: {str(e)}"

    async def _perform_web_search(self, query: str, num_results: int = 5) -> List[str]:
        """
        Perform web search (placeholder implementation).
        In production, this would integrate with a search API like Google Custom Search or Bing.
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            List of search result summaries
        """
        # Placeholder implementation - in production, integrate with actual search API
        return [
            f"Latest research on {query} shows improved outcomes with data-driven approaches",
            f"Industry trends in {query} indicate focus on employee wellbeing and engagement",
            f"Best practices for {query} include regular feedback loops and transparent communication",
            f"Case studies demonstrate that {query} initiatives increase retention by 25%",
            f"Expert recommendations for {query} emphasize leadership involvement and measurement"
        ]

    async def get_chat_completion(
        self,
        messages: List[Dict[str, str]],
        persona: Optional[str] = None
    ) -> str:
        """
        Get a complete chat response using gpt-4.1 Responses API (non-streaming).
        
        Args:
            messages: List of chat messages
            persona: User persona
            
        Returns:
            Complete response text
        """
        try:
            # Extract the last user message as input
            user_input = ""
            if messages and messages[-1].get("role") == "user":
                user_input = messages[-1]["content"]
            else:
                user_input = "Hello, how can you help with culture intelligence?"
            
            # Build conversation context from previous messages
            conversation_context = ""
            if len(messages) > 1:
                context_messages = messages[:-1]  # All except the last user message
                conversation_context = "\n\nConversation context:\n"
                for msg in context_messages[-5:]:  # Last 5 messages for context
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    conversation_context += f"{role.title()}: {content}\n"
            
            # Build instructions with persona context
            instructions = self.base_instructions
            if persona:
                instructions += f"\n\nCurrent user persona: {persona}. Tailor your response appropriately for this role."
            if conversation_context:
                instructions += conversation_context
            
            # Use synchronous client in async context
            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    # reasoning={"effort": "medium"},
                    tools=[{"type": "web_search_preview"}],
                    parallel_tool_calls=True
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            return response.output_text
            
        except Exception as e:
            logger.error(f"Error in gpt-4.1 chat completion: {str(e)}")
            return "I apologize, but I encountered an error while processing your request. Please try again."

    async def generate_survey_questions(
        self,
        survey_context: str,
        num_questions: int = 5,
        question_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate survey questions based on context using gpt-4.1 Responses API.
        
        Args:
            survey_context: Context for the survey
            num_questions: Number of questions to generate
            question_types: Types of questions (multiple_choice, text, rating, etc.)
            
        Returns:
            List of generated questions
        """
        if question_types is None:
            question_types = ["multiple_choice", "rating", "text"]
        
        user_input = f"""Generate {num_questions} survey questions for a culture intelligence survey with the following context: {survey_context}

Question types to include: {', '.join(question_types)}

Return a JSON array where each question has:
- question: The question text
- type: Question type (multiple_choice, rating, text, etc.)
- options: Array of options (for multiple choice/rating)
- required: Boolean indicating if required

Focus on questions that will provide actionable culture insights."""

        instructions = """You are a survey design expert specializing in organizational culture assessment. Create well-structured, insightful survey questions that will help organizations understand and improve their culture. Ensure questions are clear, unbiased, and will generate actionable data."""

        try:
            # Use synchronous client in async context
            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    # reasoning={"effort": "low"}  # Lower effort for survey generation
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            # Parse JSON response
            content = response.output_text
            questions = json.loads(content)
            return questions
            
        except Exception as e:
            logger.error(f"Error generating survey questions with gpt-4.1: {str(e)}")
            return []


# Global service instance
openai_service = OpenAIService()
