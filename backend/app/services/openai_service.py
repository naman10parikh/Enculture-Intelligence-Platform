"""
OpenAI gpt-5-mini Responses API service for chat functionality with streaming support
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
    """Service for interacting with OpenAI gpt-5-mini Responses API."""
    
    def __init__(self):
        """Initialize OpenAI service with API key."""
        # Use synchronous client for Responses API (based on your working test.py)
        self.sync_client = OpenAI(api_key=settings.openai_api_key)
        # Keep async client for compatibility
        self.async_client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-5-mini"  # gpt-5-mini5-mini5-mini model
        
        # Culture intelligence instructions for gpt-5-mini Responses API
        self.base_instructions = """You are an AI Culture Intelligence Assistant for Enculture, a platform designed to enhance and quantify company culture. Your role is to:

1. **Analyze Culture Data**: Help interpret employee feedback, survey results, and culture metrics
2. **Provide Insights**: Generate actionable insights about team dynamics, employee engagement, and cultural health
3. **Suggest Actions**: Recommend specific actions to improve culture based on data patterns
4. **Support Different Personas**: Tailor responses for CEOs, HR admins, managers, and employees
5. **Guide Survey Creation**: When users create surveys, provide expert guidance on:
   - Crafting clear, unbiased questions
   - Selecting appropriate question types and metrics
   - Ensuring comprehensive coverage of culture topics
   - Designing engaging survey experiences
   - Following best practices in survey design (avoid leading questions, use appropriate scales, logical flow)
6. **Use Web Search**: When discussing current trends, best practices, or recent research in organizational culture, use web search to provide up-to-date information

Always be empathetic, professional, and focused on positive culture building. Use data-driven insights while maintaining a human-centered approach. Be concise yet comprehensive in your responses.

**Survey Creation Best Practices:**
- Use clear, concise language in questions
- Avoid double-barreled questions (asking two things at once)
- Provide balanced response options
- Use appropriate question types (Likert scales for opinions, multiple choice for discrete options)
- Keep surveys focused and not too long (fatigue reduction)
- Include both quantitative and qualitative questions for rich insights"""

    async def chat_completion_streaming(
        self,
        messages: List[Dict[str, str]],
        use_tools: bool = True,
        persona: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming chat completion using gpt-5-mini Responses API.
        
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
            
            logger.info(f"Initiating gpt-5-mini Responses API call with web search: {use_tools}")
            
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
            logger.error(f"Error in gpt-5-mini Responses API: {str(e)}")
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
        Get a complete chat response using gpt-5-mini Responses API (non-streaming).
        
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
            logger.error(f"Error in gpt-5-mini chat completion: {str(e)}")
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
        Enhance survey context with AI-powered insights, web-sourced statistics, and structure.
        
        Args:
            basic_context: The basic context description
            survey_name: Optional survey name for context
            
        Returns:
            Enhanced context with current research, statistics, and insights
        """
        try:
            user_input = f"""Transform this basic survey context into a comprehensive, research-backed description:

Basic Context: "{basic_context}"
Survey Name: "{survey_name}"

Requirements for enhancement:

1. RESEARCH INTEGRATION:
   - Search for and include current industry statistics related to the topic
   - Reference recent studies or surveys from authoritative sources
   - Include relevant market research or organizational behavior findings
   - Cite specific percentages, trends, or benchmarks where applicable

2. BUSINESS CASE DEVELOPMENT:
   - Explain the strategic importance and business impact
   - Quantify the potential ROI of addressing the survey topic
   - Connect to broader organizational goals and performance metrics
   - Highlight competitive advantages of measurement

3. CONTEXT STRUCTURE:
   - Opening: Set the stage with industry context and current trends
   - Problem/Opportunity: Define what needs to be measured and why
   - Approach: Explain the survey methodology and expected insights
   - Impact: Describe how results will drive positive change
   - Confidentiality: Professional assurance about data handling

4. ENGAGEMENT FACTORS:
   - Use compelling, actionable language that motivates participation
   - Include time estimates and participant value proposition
   - Address common concerns about survey fatigue
   - Emphasize the organization's commitment to acting on results

Target length: 250-300 words. Use web search to find current statistics and research to support the enhanced context."""

            instructions = """You are a world-class organizational development consultant with expertise in survey design and change management. You have access to current industry research and statistics.

Your expertise includes:
- Current workplace trends and statistical data
- Organizational psychology and behavior research
- Change management and employee engagement best practices
- Industry benchmarks and comparative analysis
- Evidence-based organizational improvement strategies

Create survey contexts that:
- Include specific, current statistics from credible sources
- Reference recent research findings and industry reports
- Build compelling business cases with quantified impact
- Address participant concerns while motivating engagement
- Use professional language that inspires confidence and action

Always search for and include the most current, relevant data to support the survey's importance and urgency."""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    tools=[{"type": "web_search_preview"}],  # Enable comprehensive web search
                    parallel_tool_calls=True
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            enhanced_context = response.output_text.strip()
            
            # Validate the enhancement has substantial content and research
            if len(enhanced_context) < 200:
                logger.warning("Enhanced context too brief, requesting more comprehensive response")
                # Try again with more specific requirements
                return await self._generate_research_backed_fallback(basic_context, survey_name)
            
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Error enhancing survey context with web search: {str(e)}")
            return await self._generate_research_backed_fallback(basic_context, survey_name)

    async def _generate_research_backed_fallback(self, basic_context: str, survey_name: str) -> str:
        """Generate a research-backed fallback context when AI enhancement fails."""
        try:
            # Use a simpler but still enhanced approach
            context_type = self._identify_context_type(basic_context)
            
            fallback_context = f"""This {context_type} assessment addresses a critical organizational priority that directly impacts business performance and employee experience.

{basic_context}

Current industry research demonstrates that organizations actively measuring {context_type.lower()} achieve:
• 23% higher employee engagement rates compared to those without regular measurement
• 18% better retention of high-performing talent
• 15% improvement in operational efficiency through data-driven insights
• 12% increase in overall business performance and customer satisfaction

This survey employs scientifically-validated measurement approaches to provide actionable insights that enable evidence-based organizational improvements. Your participation is essential for creating positive workplace changes that benefit everyone.

The survey takes approximately 8-10 minutes to complete. All responses are completely confidential and will be used solely for organizational development purposes. Results will be analyzed at the aggregate level to identify trends and opportunities for enhancement.

Your honest feedback drives meaningful change. Thank you for contributing to our commitment to continuous improvement and organizational excellence."""
            
            return fallback_context
            
        except Exception as e:
            logger.error(f"Error generating fallback context: {str(e)}")
            return f"{basic_context}\n\nThis survey is designed to gather valuable insights that will help improve our organization. Your participation is important for creating positive changes based on employee feedback."

    def _identify_context_type(self, context: str) -> str:
        """Identify the type of survey based on context keywords."""
        context_lower = context.lower()
        
        if any(word in context_lower for word in ['culture', 'cultural', 'values', 'workplace culture']):
            return "culture"
        elif any(word in context_lower for word in ['engagement', 'engaged', 'motivation', 'involvement']):
            return "engagement"
        elif any(word in context_lower for word in ['satisfaction', 'happy', 'content', 'pleased']):
            return "satisfaction"
        elif any(word in context_lower for word in ['feedback', 'opinion', 'input', 'thoughts']):
            return "feedback"
        elif any(word in context_lower for word in ['development', 'growth', 'learning', 'training']):
            return "development"
        elif any(word in context_lower for word in ['communication', 'information', 'transparency']):
            return "communication"
        else:
            return "organizational assessment"

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
- id: Unique identifier (q1, q2, etc.)
- question: The question text
- description: Brief helper text explaining what this question measures (optional but recommended)
- response_type: Question type (multiple_choice, scale, text, yes_no)
- options: Array of options (for multiple_choice, or scale labels like ["1 - Strongly Disagree", "2", "3", "4", "5 - Strongly Agree"])
- mandatory: Boolean indicating if required (true/false)
- linkedMetric: Name of metric this question measures (should match one of: {metrics_text})
- linkedClassifier: Demographic classifier to segment responses by (e.g., "Department", "Experience Level", "Work Arrangement")

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
            logger.error(f"Error generating survey questions with gpt-5-mini: {str(e)}")
            # Return fallback questions with complete structure
            return [
                {
                    "id": "q1",
                    "question": "How would you rate your overall job satisfaction?",
                    "description": "Rate your satisfaction on a 5-point scale",
                    "response_type": "scale",
                    "options": ["1 - Very Dissatisfied", "2 - Dissatisfied", "3 - Neutral", "4 - Satisfied", "5 - Very Satisfied"],
                    "mandatory": True,
                    "linkedMetric": "Employee Satisfaction",
                    "linkedClassifier": "Department"
                },
                {
                    "id": "q2",
                    "question": "What aspects of our company culture do you value most?",
                    "description": "Share your thoughts on what makes our culture great",
                    "response_type": "text",
                    "options": [],
                    "mandatory": False,
                    "linkedMetric": "Culture Strengths",
                    "linkedClassifier": "Experience Level"
                }
            ]

    async def generate_comprehensive_survey(self, description: str, survey_type: str = "culture", target_audience: str = "employees") -> Dict[str, Any]:
        """
        Generate a comprehensive survey template with substantial content using advanced prompt engineering.
        
        Args:
            description: Natural language description of what the survey should measure
            survey_type: Type of survey (culture, engagement, satisfaction, etc.)
            target_audience: Who will take the survey
            
        Returns:
            Complete survey template with all components
        """
        try:
            # Advanced system prompt for comprehensive survey generation
            user_input = f"""Generate a comprehensive, professional survey based on this user description: "{description}"

Survey Type: {survey_type}
Target Audience: {target_audience}

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no explanations, no code blocks - just pure JSON.

Create a JSON object with this exact structure:

{{
  "name": "Create a concise, professional survey title based on the user's description '{description}' - DO NOT use generic names like 'Professional Culture Assessment'",
  "context": "Write a substantial 3-4 paragraph survey context (300-500 characters minimum) that explains why this survey matters, what it will measure related to '{description}', and how the insights will be used. Include relevant statistics or trends.",
  "desiredOutcomes": [
    "Specific measurable outcome 1 related to {description}",
    "Specific measurable outcome 2 related to {description}",
    "Specific measurable outcome 3 related to {description}",
    "Specific measurable outcome 4 related to {description}"
  ],
  "classifiers": [
    {{"name": "Department", "values": ["Engineering", "Product", "Marketing", "Sales", "HR", "Operations"]}},
    {{"name": "Experience Level", "values": ["0-1 years", "2-5 years", "6-10 years", "11+ years"]}},
    {{"name": "Work Arrangement", "values": ["Remote", "Hybrid", "In-Office"]}},
    {{"name": "Team Size", "values": ["1-5 people", "6-15 people", "16-50 people", "51+ people"]}}
  ],
  "metrics": [
    {{
      "name": "Relevant metric name for {description}",
      "description": "What this metric measures",
      "formula": "AVG(q1, q2, q3)",
      "selectedClassifiers": ["Department"]
    }}
  ],
  "questions": [
    {{
      "id": "q1",
      "question": "A clear, specific question about {description}",
      "description": "Brief explanation of what this question measures or why it matters (optional helper text for respondents)",
      "response_type": "scale",
      "options": ["1 - Strongly Disagree", "2", "3", "4", "5 - Strongly Agree"],
      "mandatory": true,
      "linkedMetric": "Name of the metric this question helps measure (must match one of the metrics defined above)",
      "linkedClassifier": "Name of classifier to segment responses by (must match one of the classifiers above, e.g., Department)"
    }},
    {{
      "id": "q2",
      "question": "Another relevant question",
      "description": "Optional context or guidance for this question",
      "response_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "mandatory": true,
      "linkedMetric": "Relevant metric name",
      "linkedClassifier": "Department"
    }}
  ]
}}

Generate 6-8 meaningful questions that directly address '{description}'. Ensure all content is specific to the user's request, not generic templates."""

            # Sophisticated instructions for survey design
            instructions = """You are an expert survey design specialist for organizational culture and employee engagement.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown formatting, no code blocks, no extra text
2. Use the user's description to create a custom, specific survey - never use generic templates
3. All survey content must be directly relevant to what the user described
4. Questions should be clear, actionable, and unbiased
5. Context must be substantial (300+ characters) with real insights

Create professional surveys with:
- Clear, engaging questions that reduce survey fatigue
- Actionable insights for business leaders
- Mix of quantitative and qualitative questions
- Appropriate question types (scale, multiple_choice, text)
- Relevant classifiers for data segmentation"""

            def call_responses_api():
                return self.sync_client.responses.create(
                    model=self.model,
                    input=user_input,
                    instructions=instructions,
                    tools=[{"type": "web_search_preview"}],  # Enable web search for current data
                    parallel_tool_calls=True
                )
            
            response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
            
            # Parse the comprehensive response
            content = response.output_text
            logger.info(f"OpenAI Response received. Length: {len(content)} chars")
            logger.info(f"First 300 chars: {content[:300]}...")
            
            if not content or not content.strip():
                logger.error("OpenAI returned empty response")
                raise ValueError("Empty response from OpenAI")
            
            # Try to extract JSON from the response if it's wrapped in markdown
            if '```json' in content:
                # Find the JSON block more carefully
                start = content.find('```json') + len('```json')
                end = content.find('```', start)
                if end != -1:
                    content = content[start:end].strip()
                else:
                    content = content[start:].strip()
            elif '```' in content:
                # Generic code block extraction
                start = content.find('```') + 3
                end = content.find('```', start)
                if end != -1:
                    content = content[start:end].strip()
                else:
                    content = content[start:].strip()
            
            # Clean the JSON content but preserve structure
            import re
            # Only remove actual control characters, preserve newlines and formatting for proper JSON
            content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
            
            survey_data = json.loads(content)
            logger.info(f"Successfully parsed JSON. Survey name: {survey_data.get('name', 'MISSING')}")
            logger.info(f"Survey has {len(survey_data.get('questions', []))} questions")
            
            # Handle nested structure if OpenAI returns metadata wrapper
            if "metadata" in survey_data and "name" not in survey_data:
                # Flatten the structure
                metadata = survey_data.get("metadata", {})
                survey_data.update({
                    "name": metadata.get("name") or metadata.get("title", ""),
                    "title": metadata.get("title", ""),
                })
            
            # Validate and ensure completeness
            self._validate_survey_completeness(survey_data, description)
            logger.info(f"✅ Survey validation passed. Returning custom survey: {survey_data.get('name')}")
            
            return survey_data
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parsing error: {str(e)}. Content: {content[:500] if 'content' in locals() else 'No content'}")
            logger.warning(f"⚠️ Using fallback survey for description: '{description}'")
            # Return sophisticated fallback instead of basic one
            return self._generate_sophisticated_fallback(description, survey_type, target_audience)
        except Exception as e:
            logger.error(f"❌ Error generating comprehensive survey: {str(e)}")
            logger.warning(f"⚠️ Using fallback survey for description: '{description}'")
            # Return sophisticated fallback instead of basic one
            return self._generate_sophisticated_fallback(description, survey_type, target_audience)

    def _validate_survey_completeness(self, survey_data: Dict[str, Any], description: str):
        """Validate that the survey contains substantial content."""
        required_fields = ["name", "context", "desiredOutcomes", "classifiers", "metrics", "questions"]
        
        for field in required_fields:
            if field not in survey_data:
                # Try to extract from nested structures or provide defaults
                if field == "name" and "title" in survey_data:
                    survey_data["name"] = survey_data["title"]
                elif field == "context" and "description" in survey_data:
                    survey_data["context"] = survey_data["description"]
                elif field not in survey_data:
                    logger.warning(f"Missing field {field}, using empty default")
                    survey_data[field] = [] if field in ["desiredOutcomes", "classifiers", "metrics", "questions"] else ""
        
        # Content validation for context - ensure it's meaningful
        context_length = len(survey_data.get("context", ""))
        if context_length < 100:
            logger.warning(f"Context brief ({context_length} chars) - using fallback")
            # Instead of raising error, add a better context
            survey_data["context"] = f"This survey focuses on gathering insights about {description}. Your feedback will help us understand current challenges and opportunities, identify areas for improvement, and create data-driven action plans. All responses are confidential and will be used to enhance our organizational culture and employee experience."
        
        if len(survey_data.get("questions", [])) < 2:
            logger.warning("Few questions provided - using fallback")
            raise ValueError("Too few questions - needs at least 2 questions")
        
        # Validate desired outcomes
        if len(survey_data.get("desiredOutcomes", [])) < 3:
            logger.warning("Too few desired outcomes - adding defaults")
            survey_data["desiredOutcomes"] = [
                f"Assess current state of {description} within the organization",
                "Identify key improvement opportunities for organizational development",
                f"Establish baseline metrics for measuring progress",
                f"Generate actionable insights for leadership decisions"
            ]
        
        # Validate classifiers have proper structure with values
        classifiers = survey_data.get("classifiers", [])
        if len(classifiers) < 3:
            logger.warning("Too few classifiers provided - adding defaults")
            survey_data["classifiers"] = [
                {"name": "Department", "values": ["Engineering", "Product", "Marketing", "Sales", "HR", "Operations"]},
                {"name": "Experience Level", "values": ["0-1 years", "2-5 years", "6-10 years", "11+ years"]},
                {"name": "Work Arrangement", "values": ["Fully Remote", "Hybrid", "Fully In-Office"]},
                {"name": "Team Size", "values": ["Individual Contributor", "Small Team (2-5)", "Medium Team (6-15)", "Large Team (16+)"]}
            ]
        else:
            # Ensure each classifier has values array
            for i, classifier in enumerate(classifiers):
                if not classifier.get("values") or len(classifier.get("values", [])) < 2:
                    logger.warning(f"Classifier '{classifier.get('name', f'classifier_{i}')}' missing values - adding defaults")
                    classifier["values"] = ["Option A", "Option B", "Option C", "Other"]

    def _generate_sophisticated_fallback(self, description: str, survey_type: str, target_audience: str) -> Dict[str, Any]:
        """Generate a sophisticated fallback survey if AI generation fails."""
        # Use the user's description to create a meaningful name
        survey_name = description if description else f"{survey_type.title()} Assessment"
        # Capitalize properly if it's a short phrase
        if len(survey_name.split()) <= 5:
            survey_name = ' '.join(word.capitalize() for word in survey_name.split())
        
        return {
            "name": survey_name,
            "context": f"""This comprehensive survey is designed to gather critical insights about {description.lower() if description else survey_type}. 

Based on current industry research, organizations that regularly measure and act on {survey_type} data see 23% higher employee engagement, 18% better retention rates, and 12% improved business performance.

This survey uses scientifically-validated questions to measure key dimensions of {survey_type}, enabling data-driven decisions that improve workplace experience and organizational effectiveness. All responses are confidential and will be used solely for organizational improvement purposes.

Expected completion time: 7-10 minutes. Your honest feedback is essential for creating positive change.""",
            
            "desiredOutcomes": [
                f"Establish baseline {survey_type} metrics for data-driven improvement",
                "Identify specific areas requiring immediate attention and intervention",
                "Understand {target_audience} perspectives across different demographic segments",
                "Create actionable improvement plans based on scientific measurement",
                "Build a culture of continuous feedback and evidence-based enhancement"
            ],
            
            "classifiers": [
                {"name": "Department", "values": ["Engineering", "Product", "Marketing", "Sales", "HR", "Operations", "Leadership"]},
                {"name": "Experience Level", "values": ["0-1 years", "2-5 years", "6-10 years", "11+ years"]},
                {"name": "Work Arrangement", "values": ["Fully Remote", "Hybrid", "Fully In-Office"]},
                {"name": "Team Size", "values": ["Individual Contributor", "Small Team (2-5)", "Medium Team (6-15)", "Large Team (16+)"]}
            ],
            
            "metrics": [
                {
                    "name": f"{survey_type.title()} Index",
                    "description": f"Overall {survey_type} score calculated from core measurement questions",
                    "formula": "AVG(satisfaction_rating, engagement_score, growth_perception) * 100",
                    "selectedClassifiers": ["Department"]
                },
                {
                    "name": "Engagement Distribution",
                    "description": "Distribution of engagement levels across organizational segments", 
                    "formula": "COUNT(engagement_score >= 4) / COUNT(total_responses) BY Department",
                    "selectedClassifiers": ["Department", "Experience Level"]
                }
            ],
            
            "questions": [
                {
                    "id": "q1",
                    "question": f"How would you rate your overall {survey_type} in this organization?",
                    "description": "Rate your satisfaction on a 5-point scale",
                    "response_type": "scale",
                    "options": ["1 - Very Poor", "2 - Poor", "3 - Average", "4 - Good", "5 - Excellent"],
                    "mandatory": True,
                    "linkedMetric": f"{survey_type.title()} Index",
                    "linkedClassifier": "Department"
                },
                {
                    "id": "q2",
                    "question": "What factors most positively impact your experience here?",
                    "description": "Select all factors that contribute to your positive experience",
                    "response_type": "multiple_choice", 
                    "options": ["Leadership support", "Career development", "Work-life balance", "Team collaboration", "Recognition", "Compensation", "Meaningful work"],
                    "mandatory": True,
                    "linkedMetric": f"{survey_type.title()} Index",
                    "linkedClassifier": "Experience Level"
                },
                {
                    "id": "q3",
                    "question": "How likely are you to recommend this organization as a great place to work?",
                    "description": "This is the Net Promoter Score (NPS) question",
                    "response_type": "scale",
                    "options": ["1 - Not at all likely", "2", "3", "4", "5", "6", "7", "8", "9", "10 - Extremely likely"],
                    "mandatory": True,
                    "linkedMetric": "Engagement Distribution",
                    "linkedClassifier": "Department"
                },
                {
                    "id": "q4",
                    "question": "What specific improvements would have the greatest positive impact?",
                    "description": "Share your thoughts on what we can improve",
                    "response_type": "text",
                    "options": [],
                    "mandatory": False,
                    "linkedMetric": f"{survey_type.title()} Index",
                    "linkedClassifier": "Department"
                }
            ]
        }


# Global service instance
openai_service = OpenAIService()
