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
            
            # Simulate streaming by yielding word-based chunks for smooth effect
            words = response_text.split()
            current_chunk = ""
            
            for i, word in enumerate(words):
                current_chunk += word + " "
                
                # Yield chunks of ~3-4 words for smooth streaming effect
                if (i + 1) % 3 == 0 or i == len(words) - 1:
                    if current_chunk.strip():
                        yield current_chunk.strip() + " "
                        current_chunk = ""
                        # Shorter delay for smoother streaming
                        await asyncio.sleep(0.05)
            
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

    async def enhance_survey_name(self, basic_name: str, context: str = "") -> str:
        """
        Enhance a basic survey name using AI to make it more engaging and professional.
        
        Args:
            basic_name: The basic survey name
            context: Optional context about the survey
            
        Returns:
            Enhanced survey name
        """
        try:
            user_input = f"""Enhance this survey name to make it more engaging and professional: "{basic_name}"
            
Survey context: {context[:200] if context else 'General culture assessment'}

Requirements:
- Keep it concise (max 8 words)
- Make it engaging and actionable
- Professional tone suitable for workplace
- Avoid generic terms like "survey" unless necessary
- Focus on the value/outcome for participants

Return only the enhanced name, no quotes or explanations."""

            instructions = """You are an expert in organizational communication and survey design. Create compelling, professional survey titles that encourage participation and clearly communicate value to respondents."""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            return response.output_text.strip().strip('"\'')
            
        except Exception as e:
            logger.error(f"Error enhancing survey name: {str(e)}")
            return basic_name  # Return original if enhancement fails

    async def enhance_survey_context(self, basic_context: str, survey_name: str = "") -> str:
        """
        Enhance survey context with AI-powered insights, statistics, and structure.
        
        Args:
            basic_context: The basic context description
            survey_name: Optional survey name for context
            
        Returns:
            Enhanced context with structure and insights
        """
        try:
            user_input = f"""Enhance this survey context to make it more comprehensive and engaging:

Basic context: "{basic_context}"
Survey name: "{survey_name}"

Please enhance it by:
1. Adding relevant industry statistics and research
2. Improving structure and clarity
3. Including compelling business case
4. Adding specific objectives and expected outcomes
5. Mentioning data confidentiality and usage

Keep it professional but engaging, around 150-200 words."""

            instructions = """You are an organizational development expert with deep knowledge of workplace culture research. Enhance survey contexts with relevant statistics, clear objectives, and compelling business cases. Use current industry data and best practices to create engaging, informative descriptions that encourage participation."""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    tools=[{"type": "web_search_preview"}]  # Enable web search for statistics
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            return response.output_text.strip()
            
        except Exception as e:
            logger.error(f"Error enhancing survey context: {str(e)}")
            return basic_context  # Return original if enhancement fails

    async def generate_survey_classifiers(self, context: str, survey_name: str = "") -> List[Dict[str, Any]]:
        """
        Generate intelligent survey classifiers based on context.
        
        Args:
            context: Survey context
            survey_name: Survey name for additional context
            
        Returns:
            List of classifier objects with names and values
        """
        try:
            user_input = f"""Based on this survey context, generate 4-6 intelligent demographic/categorical classifiers that would be useful for analyzing results:

Survey: "{survey_name}"
Context: "{context}"

Return a JSON array where each classifier has:
- name: Classifier name (e.g., "Department", "Experience Level")
- values: Array of 3-5 realistic options for that classifier

Focus on classifiers that will enable meaningful data segmentation for culture analysis. Consider department, tenure, role level, location, team size, etc. Make values realistic for modern organizations."""

            instructions = """You are a data analytics expert specializing in organizational surveys. Generate practical, meaningful classifiers that enable rich data analysis. Ensure classifiers are inclusive, non-discriminatory, and provide actionable segmentation for culture insights."""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            # Parse JSON response
            classifiers = json.loads(response.output_text)
            return classifiers
            
        except Exception as e:
            logger.error(f"Error generating classifiers: {str(e)}")
            # Return default classifiers
            return [
                {"name": "Department", "values": ["Engineering", "Marketing", "Sales", "HR", "Operations"]},
                {"name": "Experience Level", "values": ["Entry Level", "Mid Level", "Senior", "Leadership"]},
                {"name": "Team Size", "values": ["Individual", "Small Team (2-5)", "Medium Team (6-15)", "Large Team (16+)"]},
                {"name": "Work Location", "values": ["Remote", "Hybrid", "In-Office", "Field/Travel"]}
            ]

    async def generate_advanced_formula(self, description: str, classifier_names: List[str] = None) -> str:
        """
        Generate an advanced analytics formula for metrics calculation.
        
        Args:
            description: Description of what the metric should measure
            classifier_names: List of available classifiers
            
        Returns:
            Analytics formula string
        """
        try:
            classifiers_text = ", ".join(classifier_names) if classifier_names else "Department, Experience Level, Team Size"
            
            user_input = f"""Create an advanced analytics formula for this metric:
Description: "{description}"
Available classifiers: {classifiers_text}

Generate a formula that:
1. Calculates meaningful insights from survey responses
2. Incorporates relevant classifiers for segmentation
3. Uses statistical methods (averages, percentages, correlations)
4. Provides actionable business insights

Return only the formula expression, make it readable and professional.
Example format: "(Avg(Satisfaction_Score) WHERE Department='Engineering') / (Avg(Satisfaction_Score) OVERALL) * 100"
"""

            instructions = """You are a data science expert specializing in organizational analytics. Create sophisticated yet interpretable formulas that provide meaningful business insights from survey data. Focus on practical metrics that leaders can act upon."""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            return response.output_text.strip()
            
        except Exception as e:
            logger.error(f"Error generating formula: {str(e)}")
            # Return a default formula
            return f"AVG(Response_Score) BY {classifier_names[0] if classifier_names else 'Department'}"

    async def generate_survey_questions(
        self,
        survey_context: str,
        num_questions: int = 5,
        question_types: Optional[List[str]] = None,
        metrics: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate enhanced survey questions based on context and metrics.
        
        Args:
            survey_context: Context for the survey
            num_questions: Number of questions to generate
            question_types: Types of questions (multiple_choice, scale, text, yes_no)
            metrics: List of metrics these questions should support
            
        Returns:
            List of generated questions
        """
        if question_types is None:
            question_types = ["multiple_choice", "scale", "text", "yes_no"]
        
        metrics_text = ", ".join(metrics) if metrics else "employee satisfaction, engagement, culture health"
        
        user_input = f"""Generate {num_questions} high-quality survey questions for organizational culture assessment.

Context: {survey_context}
Question types to include: {', '.join(question_types)}
Metrics to support: {metrics_text}

Requirements:
- Questions should be clear, unbiased, and actionable
- Mix of quantitative (scale/choice) and qualitative (text) questions
- Include both current state and aspirational questions
- Ensure cultural sensitivity and inclusivity
- Support data analysis for the specified metrics

Return a JSON array where each question has:
- text: The question text
- type: Question type (multiple_choice, scale, text, yes_no)
- options: Array of options (for multiple_choice, or scale labels)
- required: Boolean indicating if required
- linkedMetric: Suggested metric this question supports

Focus on questions that generate actionable insights for improving workplace culture."""

        instructions = """You are a world-class organizational psychologist and survey design expert. Create research-backed questions that measure culture effectively while being engaging for participants. Ensure questions are scientifically sound and will produce actionable business insights."""

        try:
            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    tools=[{"type": "web_search_preview"}]  # Enable web search for best practices
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            # Parse JSON response
            content = response.output_text
            questions = json.loads(content)
            return questions
            
        except Exception as e:
            logger.error(f"Error generating survey questions with gpt-4.1: {str(e)}")
            # Return fallback questions
            return [
                {
                    "text": "How would you rate your overall job satisfaction?",
                    "type": "scale",
                    "options": ["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"],
                    "required": True,
                    "linkedMetric": "Employee Satisfaction"
                },
                {
                    "text": "What aspects of our company culture do you value most?",
                    "type": "text",
                    "options": [],
                    "required": False,
                    "linkedMetric": "Culture Strengths"
                }
            ]


# Global service instance
openai_service = OpenAIService()
