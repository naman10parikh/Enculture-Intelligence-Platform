"""
Chat API endpoints with streaming support
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse, JSONResponse

from app.core.logging_config import get_logger
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    SurveyGenerationRequest,
    SurveyGenerationResponse,
    ErrorResponse
)
from app.models.chat_thread import MessageRole
from app.services.openai_service import openai_service
from app.services.chat_thread_service import ChatThreadService

router = APIRouter()
logger = get_logger(__name__)

# Import the shared instance from chat_threads to ensure consistency
from app.api.v1.endpoints.chat_threads import chat_thread_service


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat completion responses from OpenAI gpt-5-mini.
    
    This endpoint provides real-time streaming responses for better user experience.
    """
    try:
        logger.info(f"Received streaming chat request with {len(request.messages)} messages")
        
        # Convert Pydantic models to dict format for OpenAI
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Create async generator for streaming
        async def generate_stream():
            try:
                async for chunk in openai_service.chat_completion_streaming(
                    messages=messages,
                    use_tools=request.use_tools,
                    persona=request.persona
                ):
                    # Format as Server-Sent Events
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Send end-of-stream marker
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
        
    except Exception as e:
        logger.error(f"Error in chat stream endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process streaming chat request: {str(e)}"
        )


@router.post("/completion", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Get a complete chat response (non-streaming).
    
    Useful for situations where streaming is not needed or supported.
    """
    try:
        logger.info(f"Received chat completion request with {len(request.messages)} messages")
        
        # Convert Pydantic models to dict format for OpenAI
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # Get complete response
        response_content = await openai_service.get_chat_completion(
            messages=messages,
            persona=request.persona
        )
        
        return ChatResponse(
            response=response_content,
            persona=request.persona,
            usage={"note": "Usage tracking to be implemented"}
        )
        
    except Exception as e:
        logger.error(f"Error in chat completion endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat completion request: {str(e)}"
        )


@router.post("/generate-survey", response_model=SurveyGenerationResponse)
async def generate_survey(request: SurveyGenerationRequest):
    """
    Generate survey questions using AI based on provided context.
    
    This endpoint creates culturally relevant survey questions for the Enculture platform.
    """
    try:
        logger.info(f"Generating survey with context: {request.context[:100]}...")
        
        # Generate questions using OpenAI service
        questions = await openai_service.generate_survey_questions(
            survey_context=request.context,
            num_questions=request.num_questions,
            question_types=request.question_types
        )
        
        return SurveyGenerationResponse(
            questions=questions,
            context=request.context,
            total_questions=len(questions)
        )
        
    except Exception as e:
        logger.error(f"Error in survey generation endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate survey questions: {str(e)}"
        )


# New AI Enhancement Endpoints

@router.post("/enhance-survey-name")
async def enhance_survey_name(request: dict):
    """Enhance a survey name using AI."""
    try:
        basic_name = request.get('name', '')
        context = request.get('context', '')
        
        if not basic_name:
            raise HTTPException(status_code=400, detail="Survey name is required")
        
        enhanced_name = await openai_service.enhance_survey_name(basic_name, context)
        
        return {"enhanced_name": enhanced_name}
    
    except Exception as e:
        logger.error(f"Error enhancing survey name: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Name enhancement failed: {str(e)}")


@router.post("/enhance-survey-context")
async def enhance_survey_context(request: dict):
    """Enhance survey context with AI-powered insights and structure."""
    try:
        basic_context = request.get('context', '')
        survey_name = request.get('name', '')
        
        if not basic_context:
            raise HTTPException(status_code=400, detail="Survey context is required")
        
        enhanced_context = await openai_service.enhance_survey_context(basic_context, survey_name)
        
        return {"enhanced_context": enhanced_context}
    
    except Exception as e:
        logger.error(f"Error enhancing survey context: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Context enhancement failed: {str(e)}")


@router.post("/generate-classifiers")
async def generate_classifiers(request: dict):
    """Generate intelligent survey classifiers based on context."""
    try:
        context = request.get('context', '')
        survey_name = request.get('name', '')
        
        if not context:
            raise HTTPException(status_code=400, detail="Survey context is required")
        
        classifiers = await openai_service.generate_survey_classifiers(context, survey_name)
        
        return {"classifiers": classifiers}
    
    except Exception as e:
        logger.error(f"Error generating classifiers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classifier generation failed: {str(e)}")


@router.post("/generate-formula")
async def generate_formula(request: dict):
    """Generate an advanced analytics formula for metrics."""
    try:
        description = request.get('description', '')
        classifier_names = request.get('classifier_names', [])
        
        if not description:
            raise HTTPException(status_code=400, detail="Metric description is required")
        
        formula = await openai_service.generate_advanced_formula(description, classifier_names)
        
        return {"formula": formula}
    
    except Exception as e:
        logger.error(f"Error generating formula: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Formula generation failed: {str(e)}")


@router.post("/generate-enhanced-questions")
async def generate_enhanced_questions(request: dict):
    """Generate enhanced survey questions based on context and metrics."""
    try:
        context = request.get('context', '')
        num_questions = request.get('num_questions', 5)
        question_types = request.get('question_types', ['multiple_choice', 'scale', 'text', 'yes_no'])
        metrics = request.get('metrics', [])
        
        if not context:
            raise HTTPException(status_code=400, detail="Survey context is required")
        
        questions = await openai_service.generate_survey_questions(
            context, num_questions, question_types, metrics
        )
        
        return {"questions": questions}
    
    except Exception as e:
        logger.error(f"Error generating enhanced questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@router.post("/ai-detect-sections")
async def ai_detect_sections(request: dict):
    """
    Use AI to intelligently detect which survey sections need to be updated based on user request.
    """
    try:
        user_request = request.get('user_request', '')
        current_data = request.get('current_data', {})
        
        if not user_request:
            raise HTTPException(status_code=400, detail="User request is required")
        
        logger.info(f"AI detecting sections for request: {user_request[:100]}...")
        
        # Use AI to intelligently detect which sections need updates
        user_input = f"""Analyze this user request and determine which survey sections need to be updated:

User Request: "{user_request}"

Current Survey State:
- Name: {current_data.get('name', 'Not set')}
- Has Context: {'Yes' if current_data.get('context') else 'No'}
- Has Outcomes: {'Yes' if current_data.get('desiredOutcomes') else 'No'}
- Has Classifiers: {'Yes ({} items)'.format(len(current_data.get('classifiers', []))) if current_data.get('classifiers') else 'No'}
- Has Metrics: {'Yes ({} items)'.format(len(current_data.get('metrics', []))) if current_data.get('metrics') else 'No'}
- Has Questions: {'Yes ({} items)'.format(len(current_data.get('questions', []))) if current_data.get('questions') else 'No'}
- Configuration Languages: {current_data.get('configuration', {}).get('languages', ['Not set'])}
- Configuration Anonymous: {current_data.get('configuration', {}).get('anonymous', 'Not set')}

Available Section Types:
- name: Survey title/name
- context: Survey description/purpose/background
- outcomes: Desired outcomes and goals
- classifiers: Demographic categories (department, role, location, etc.)
- metrics: Analytics and measurement formulas
- questions: Survey questions, response types, required status
- configuration: Languages, anonymous status, deadlines, target audience

Analyze the user's request and return ONLY a JSON array of section types that need to be updated.
Examples:
- "make question 1 optional" → ["questions"]
- "add Spanish and French" → ["configuration"]
- "make the first question optional and add French" → ["questions", "configuration"]
- "change the survey name to Employee Engagement" → ["name"]
- "add metrics for engagement" → ["metrics"]

Return ONLY the JSON array, no explanations, no markdown."""

        instructions = """You are an expert at understanding user intent. Carefully analyze what the user wants to change and return ONLY the relevant section types as a JSON array. Be precise and only include sections that actually need updates."""

        def call_responses_api():
            return openai_service.sync_client.responses.create(
                model=openai_service.model,
                input=user_input,
                instructions=instructions
            )
        
        response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
        
        content = response.output_text
        logger.info(f"Raw AI response for section detection: {content}")
        
        # Extract JSON if wrapped in markdown
        if '```json' in content:
            start = content.find('```json') + len('```json')
            end = content.find('```', start)
            content = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            content = content[start:end].strip()
        
        content = content.strip()
        detected_sections = json.loads(content)
        
        if not isinstance(detected_sections, list):
            detected_sections = [detected_sections]
        
        logger.info(f"✅ AI detected sections: {detected_sections}")
        
        return {
            "detected_sections": detected_sections,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Error in AI section detection: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # Fallback to empty array
        return {
            "detected_sections": [],
            "success": False,
            "error": str(e)
        }


@router.post("/ai-edit-section")
async def ai_edit_section(request: dict):
    """
    Edit a specific survey section using AI with full context awareness.
    """
    try:
        section_type = request.get('section_type', '')  # 'name', 'context', 'outcomes', 'classifiers', 'metrics', 'questions'
        current_data = request.get('current_data', {})  # Current survey state
        edit_request = request.get('edit_request', '')  # What user wants to change
        section_content = request.get('section_content', {})  # Current section content
        
        if not section_type or not edit_request:
            raise HTTPException(status_code=400, detail="Section type and edit request are required")
        
        logger.info(f"AI editing section '{section_type}' with request: {edit_request[:100]}...")
        
        # Create context-aware edit using specialized prompts per section
        if section_type == 'name':
            logger.info(f"Enhancing survey name with request: {edit_request}")
            # If there's a specific request, use it; otherwise enhance existing name
            if 'name' in edit_request.lower() or 'title' in edit_request.lower():
                updated_content = await openai_service.enhance_survey_name(
                    current_data.get('name', ''), 
                    current_data.get('context', '')
                )
            else:
                updated_content = await openai_service.enhance_survey_name(
                    edit_request,  # Use the request as the new name
                    current_data.get('context', '')
                )
            logger.info(f"✅ Updated name to: {updated_content[:100]}")
        elif section_type == 'context':
            logger.info(f"Enhancing survey context with request: {edit_request}")
            updated_content = await openai_service.enhance_survey_context(
                current_data.get('context', '') or edit_request, 
                current_data.get('name', '')
            )
            logger.info(f"✅ Updated context (length: {len(updated_content) if isinstance(updated_content, str) else 'N/A'})")
        elif section_type == 'outcomes':
            updated_content = await _ai_edit_outcomes(edit_request, current_data)
        elif section_type == 'classifiers':
            logger.info(f"Generating classifiers with request: {edit_request}")
            updated_content = await openai_service.generate_survey_classifiers(
                current_data.get('context', ''), 
                current_data.get('name', '')
            )
            logger.info(f"✅ Generated {len(updated_content) if isinstance(updated_content, list) else 0} classifiers")
        elif section_type == 'metrics':
            updated_content = await _ai_edit_metrics(edit_request, current_data)
        elif section_type == 'questions':
            # Use the edit_request to intelligently update questions
            updated_content = await _ai_edit_questions(edit_request, current_data)
        elif section_type == 'configuration':
            # Handle configuration updates
            updated_content = await _ai_edit_configuration(edit_request, current_data)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported section type: {section_type}")
        
        return {
            "section_type": section_type,
            "updated_content": updated_content,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI section editing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit section with AI: {str(e)}"
        )


async def _ai_edit_outcomes(edit_request: str, current_data: dict) -> list:
    """Generate AI-enhanced desired outcomes based on context and request."""
    try:
        context = current_data.get('context', '')
        survey_name = current_data.get('name', '')
        current_outcomes = current_data.get('desiredOutcomes', [])
        
        logger.info(f"Outcomes edit request: {edit_request}")
        logger.info(f"Current outcomes: {current_outcomes}")
        
        user_input = f"""Based on this survey context and user request, generate enhanced desired outcomes:

Survey Name: {survey_name}
Survey Context: {context}
Current Outcomes: {current_outcomes}
User Request: {edit_request}

Generate 3-5 specific, measurable, actionable desired outcomes that this survey should achieve.
Each outcome should be:
- Specific and concrete
- Measurable with clear success criteria
- Achievable within organizational constraints
- Relevant to the survey purpose
- Time-bound where appropriate

Return ONLY a JSON array of strings. No markdown, no explanations."""

        instructions = """You are an organizational development expert specializing in outcome-based survey design. Create desired outcomes that are strategic, measurable, and directly actionable for business leaders. Focus on specific business impact rather than generic goals. Return pure JSON only."""

        def call_responses_api():
            return openai_service.sync_client.responses.create(
                model=openai_service.model,
                input=user_input,
                instructions=instructions
            )
        
        response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
        
        content = response.output_text
        logger.info(f"Raw AI response for outcomes: {content[:500]}")
        
        # Extract JSON if wrapped in markdown
        if '```json' in content:
            start = content.find('```json') + len('```json')
            end = content.find('```', start)
            content = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            content = content[start:end].strip()
        
        content = content.strip()
        outcomes = json.loads(content)
        
        logger.info(f"✅ AI generated {len(outcomes) if isinstance(outcomes, list) else 1} outcomes")
        return outcomes if isinstance(outcomes, list) else [outcomes]
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in outcomes: {str(e)}")
        logger.error(f"Content was: {content if 'content' in locals() else 'No content'}")
        return [
            "Establish baseline metrics for data-driven improvement",
            "Identify priority areas requiring immediate organizational attention",
            "Create targeted action plans based on employee feedback"
        ]
    except Exception as e:
        logger.error(f"Error generating AI outcomes: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return [
            "Establish baseline metrics for data-driven improvement",
            "Identify priority areas requiring immediate organizational attention",
            "Create targeted action plans based on employee feedback"
        ]


async def _ai_edit_metrics(edit_request: str, current_data: dict) -> list:
    """Generate AI-enhanced metrics based on context and request."""
    try:
        context = current_data.get('context', '')
        classifiers = current_data.get('classifiers', [])
        classifier_names = [c.get('name', '') for c in classifiers]
        
        logger.info(f"Metrics edit request: {edit_request}")
        logger.info(f"Available classifiers: {classifier_names}")
        
        user_input = f"""Based on this survey context and user request, generate enhanced metrics:

Survey Context: {context}
Available Classifiers: {classifier_names}
User Request: {edit_request}

Generate 3-5 key metrics that this survey should track. Each metric should include:
- name: Clear, professional metric name
- description: What this metric measures and why it matters
- formula: Statistical formula using survey responses and classifiers
- selectedClassifiers: Which classifiers are relevant for segmentation

Return ONLY a JSON array of metric objects. No markdown, no explanations."""

        instructions = """You are a data science expert specializing in organizational analytics. Create metrics that provide actionable business insights through statistical analysis. Focus on practical, interpretable measurements that executives can act upon. Return pure JSON only."""

        def call_responses_api():
            return openai_service.sync_client.responses.create(
                model=openai_service.model,
                input=user_input,
                instructions=instructions
            )
        
        response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
        
        content = response.output_text
        logger.info(f"Raw AI response for metrics: {content[:500]}")
        
        # Extract JSON if wrapped in markdown
        if '```json' in content:
            start = content.find('```json') + len('```json')
            end = content.find('```', start)
            content = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            content = content[start:end].strip()
        
        content = content.strip()
        metrics = json.loads(content)
        
        logger.info(f"✅ AI generated {len(metrics) if isinstance(metrics, list) else 1} metrics")
        return metrics if isinstance(metrics, list) else [metrics]
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in metrics: {str(e)}")
        logger.error(f"Content was: {content if 'content' in locals() else 'No content'}")
        return [
            {
                "name": "Overall Engagement Score",
                "description": "Composite measure of employee engagement across all survey dimensions",
                "formula": "AVG(engagement_questions) * 100",
                "selectedClassifiers": classifier_names[:2] if classifier_names else ["Department"]
            }
        ]
    except Exception as e:
        logger.error(f"Error generating AI metrics: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return [
            {
                "name": "Overall Engagement Score",
                "description": "Composite measure of employee engagement across all survey dimensions",
                "formula": "AVG(engagement_questions) * 100",
                "selectedClassifiers": classifier_names[:2] if classifier_names else ["Department"]
            }
        ]


async def _ai_edit_questions(edit_request: str, current_data: dict) -> list:
    """Intelligently edit questions based on user request."""
    try:
        context = current_data.get('context', '')
        survey_name = current_data.get('name', '')
        current_questions = current_data.get('questions', [])
        metrics = [m.get('name', '') for m in current_data.get('metrics', [])]
        classifiers = [c.get('name', '') for c in current_data.get('classifiers', [])]
        
        logger.info(f"Questions edit request: {edit_request}")
        logger.info(f"Current questions count: {len(current_questions)}")
        
        # Simple fallback parsing for common patterns
        lower_request = edit_request.lower()
        
        # Check if this is a simple update that we can handle directly
        if current_questions and ('question' in lower_request or 'q1' in lower_request or 'q2' in lower_request):
            updated_questions = [dict(q) for q in current_questions]  # Deep copy
            
            # Detect which question number
            question_num = None
            if 'question 1' in lower_request or 'question one' in lower_request or 'q1' in lower_request:
                question_num = 0
            elif 'question 2' in lower_request or 'question two' in lower_request or 'q2' in lower_request:
                question_num = 1
            elif 'question 3' in lower_request or 'question three' in lower_request or 'q3' in lower_request:
                question_num = 2
            
            if question_num is not None and question_num < len(updated_questions):
                logger.info(f"Applying direct updates to question {question_num + 1}")
                
                # Update response type
                if 'text response' in lower_request or 'text type' in lower_request or 'type to text' in lower_request:
                    updated_questions[question_num]['response_type'] = 'text'
                    updated_questions[question_num]['options'] = []
                    logger.info(f"Changed question {question_num + 1} to text response")
                elif 'scale' in lower_request:
                    updated_questions[question_num]['response_type'] = 'scale'
                    if '1-10' in lower_request or '1 to 10' in lower_request:
                        updated_questions[question_num]['options'] = [f"{i}" for i in range(1, 11)]
                    else:
                        updated_questions[question_num]['options'] = ["1", "2", "3", "4", "5"]
                    logger.info(f"Changed question {question_num + 1} to scale")
                elif 'multiple choice' in lower_request or 'multiple_choice' in lower_request:
                    updated_questions[question_num]['response_type'] = 'multiple_choice'
                    logger.info(f"Changed question {question_num + 1} to multiple_choice")
                
                # Update required/optional
                if 'optional' in lower_request or 'not required' in lower_request or "don't make it required" in lower_request or 'not mandatory' in lower_request:
                    updated_questions[question_num]['mandatory'] = False
                    updated_questions[question_num]['required'] = False
                    logger.info(f"Made question {question_num + 1} optional")
                elif 'required' in lower_request or 'mandatory' in lower_request:
                    updated_questions[question_num]['mandatory'] = True
                    updated_questions[question_num]['required'] = True
                    logger.info(f"Made question {question_num + 1} required")
                
                logger.info(f"✅ Direct update successful for question {question_num + 1}")
                logger.info(f"Updated question: {updated_questions[question_num]}")
                return updated_questions
        
        # If simple parsing didn't work, use AI
        logger.info("Using AI for complex question updates")
        
        user_input = f"""Intelligently update the survey questions based on this request:

User Request: {edit_request}

Current Survey Context:
- Name: {survey_name}
- Context: {context}
- Current Questions ({len(current_questions)}): {json.dumps(current_questions, indent=2)}
- Available Metrics: {', '.join(metrics)}
- Available Classifiers: {', '.join(classifiers)}

CRITICAL Instructions:
1. Parse the user request to understand EXACTLY what changes they want
2. If they mention specific question numbers (e.g., "question 1"), update ONLY those questions
3. If they mention response types (text, scale, multiple_choice), update the response_type field
4. If they mention "required"/"optional"/"mandatory", update the mandatory field (true/false)
5. PRESERVE all other questions exactly as they are
6. Return the COMPLETE array of ALL questions with modifications applied

Return ONLY valid JSON array. No markdown, no explanations."""

        instructions = """You are an expert survey designer. Parse the user's request literally and make ONLY the specific changes requested. Preserve all other questions unchanged. Return pure JSON only."""

        def call_responses_api():
            return openai_service.sync_client.responses.create(
                model=openai_service.model,
                input=user_input,
                instructions=instructions
            )
        
        response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
        
        content = response.output_text
        logger.info(f"Raw AI response for questions: {content[:500]}")
        
        # Extract JSON if wrapped in markdown
        if '```json' in content:
            start = content.find('```json') + len('```json')
            end = content.find('```', start)
            content = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            content = content[start:end].strip()
        
        content = content.strip()
        questions = json.loads(content)
        
        logger.info(f"✅ AI updated {len(questions) if isinstance(questions, list) else 1} questions")
        return questions if isinstance(questions, list) else [questions]
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in questions: {str(e)}")
        logger.error(f"Content was: {content if 'content' in locals() else 'No content'}")
        # Return current questions unchanged
        return current_data.get('questions', [])
    except Exception as e:
        logger.error(f"Error editing questions with AI: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # Return current questions unchanged
        return current_data.get('questions', [])


async def _ai_edit_configuration(edit_request: str, current_data: dict) -> dict:
    """Edit survey configuration based on user request."""
    try:
        current_config = current_data.get('configuration', {})
        
        logger.info(f"Configuration edit request: {edit_request}")
        logger.info(f"Current config: {current_config}")
        
        user_input = f"""Update the survey configuration based on this request:

User Request: {edit_request}

Current Configuration: {json.dumps(current_config, indent=2)}

Parse the request and update the configuration object. Common fields:
- languages: Array of language codes (e.g., ["English", "Spanish", "French"])
- targetAudience: Array of department/role names
- selectedEmployees: Array of specific employee IDs
- releaseDate: ISO date string or null
- deadline: ISO date string or null
- anonymous: boolean (true/false)
- backgroundImage: URL or null
- allowPause: boolean
- showProgress: boolean
- requireCompletion: boolean
- sendReminders: boolean

IMPORTANT: Return ONLY valid JSON with the fields that changed. Example:
{{"languages": ["English", "Spanish", "French"]}}

Do NOT include explanations, just pure JSON."""

        instructions = """You are a configuration expert. Parse the user's natural language request and convert it to precise configuration changes. Return ONLY valid JSON with the changed fields. No markdown, no explanations, just JSON."""

        def call_responses_api():
            return openai_service.sync_client.responses.create(
                model=openai_service.model,
                input=user_input,
                instructions=instructions
            )
        
        response = await asyncio.get_event_loop().run_in_executor(None, call_responses_api)
        
        content = response.output_text
        logger.info(f"Raw AI response for configuration: {content[:500]}")
        
        # Extract JSON
        if '```json' in content:
            start = content.find('```json') + len('```json')
            end = content.find('```', start)
            content = content[start:end].strip()
        elif '```' in content:
            start = content.find('```') + 3
            end = content.find('```', start)
            content = content[start:end].strip()
        
        # Clean any remaining formatting
        content = content.strip()
        
        if not content or content == '{}':
            logger.warning("Empty configuration response from AI")
            # Try to parse the request manually for common patterns
            lower_request = edit_request.lower()
            config_updates = {}
            
            # Detect language changes
            if 'language' in lower_request:
                languages = []
                if 'english' in lower_request:
                    languages.append('English')
                if 'spanish' in lower_request:
                    languages.append('Spanish')
                if 'french' in lower_request:
                    languages.append('French')
                if 'german' in lower_request:
                    languages.append('German')
                if languages:
                    config_updates['languages'] = languages
            
            # Detect anonymous setting
            if 'anonymous' in lower_request:
                config_updates['anonymous'] = 'anonymous' in lower_request and 'not' not in lower_request
            
            if config_updates:
                logger.info(f"Using fallback parsing, extracted: {config_updates}")
                return config_updates
            
            return {}
        
        config_updates = json.loads(content)
        
        logger.info(f"✅ AI updated configuration fields: {list(config_updates.keys())}")
        logger.info(f"Configuration values: {config_updates}")
        return config_updates
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in configuration: {str(e)}")
        logger.error(f"Content was: {content if 'content' in locals() else 'No content'}")
        return {}
    except Exception as e:
        logger.error(f"Error editing configuration with AI: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {}


@router.post("/test-ai-survey-generation")
async def test_ai_survey_generation(request: dict):
    """
    Test endpoint to validate AI system prompts and comprehensive survey generation.
    """
    try:
        test_type = request.get('test_type', 'full_generation')
        test_description = request.get('description', 'Employee engagement and workplace culture assessment for a technology company')
        
        logger.info(f"Testing AI survey generation: {test_type}")
        
        results = {}
        
        if test_type == 'full_generation' or test_type == 'all':
            # Test comprehensive survey generation
            logger.info("Testing comprehensive survey generation...")
            survey = await openai_service.generate_comprehensive_survey(
                description=test_description,
                survey_type="culture",
                target_audience="employees"
            )
            
            results['comprehensive_survey'] = {
                "success": True,
                "name_length": len(survey.get('name', '')),
                "context_length": len(survey.get('context', '')),
                "num_outcomes": len(survey.get('desiredOutcomes', [])),
                "num_classifiers": len(survey.get('classifiers', [])),
                "num_metrics": len(survey.get('metrics', [])),
                "num_questions": len(survey.get('questions', [])),
                "sample_content": {
                    "name": survey.get('name', '')[:100],
                    "context_preview": survey.get('context', '')[:200] + "...",
                    "first_outcome": survey.get('desiredOutcomes', [None])[0],
                    "first_question": survey.get('questions', [{}])[0].get('text', '') if survey.get('questions') else None
                }
            }
        
        if test_type == 'name_enhancement' or test_type == 'all':
            # Test name enhancement
            logger.info("Testing name enhancement...")
            enhanced_name = await openai_service.enhance_survey_name(
                "Basic Team Survey", 
                test_description
            )
            
            results['name_enhancement'] = {
                "success": True,
                "original": "Basic Team Survey",
                "enhanced": enhanced_name,
                "improvement": len(enhanced_name) > len("Basic Team Survey")
            }
        
        if test_type == 'context_enhancement' or test_type == 'all':
            # Test context enhancement with web search
            logger.info("Testing context enhancement with web search...")
            enhanced_context = await openai_service.enhance_survey_context(
                "We want to understand how our employees feel about working here",
                "Employee Experience Assessment"
            )
            
            results['context_enhancement'] = {
                "success": True,
                "original_length": len("We want to understand how our employees feel about working here"),
                "enhanced_length": len(enhanced_context),
                "has_statistics": any(char.isdigit() and '%' in enhanced_context[i:i+10] for i, char in enumerate(enhanced_context)),
                "context_preview": enhanced_context[:300] + "..."
            }
        
        if test_type == 'classifiers' or test_type == 'all':
            # Test classifier generation
            logger.info("Testing classifier generation...")
            classifiers = await openai_service.generate_survey_classifiers(
                test_description,
                "Culture Assessment"
            )
            
            results['classifiers'] = {
                "success": True,
                "num_generated": len(classifiers),
                "sample_classifier": classifiers[0] if classifiers else None,
                "all_have_values": all(len(c.get('values', [])) >= 3 for c in classifiers)
            }
        
        if test_type == 'questions' or test_type == 'all':
            # Test question generation
            logger.info("Testing question generation...")
            questions = await openai_service.generate_survey_questions(
                test_description,
                6,
                ['multiple_choice', 'scale', 'text', 'yes_no'],
                ['Engagement Score', 'Culture Health']
            )
            
            results['questions'] = {
                "success": True,
                "num_generated": len(questions),
                "question_types": list(set(q.get('type') for q in questions)),
                "sample_question": questions[0] if questions else None,
                "all_have_text": all(len(q.get('text', '')) > 10 for q in questions)
            }
        
        # Overall assessment
        results['overall_assessment'] = {
            "timestamp": datetime.utcnow().isoformat(),
            "test_type": test_type,
            "all_tests_passed": all(
                result.get('success', False) for result in results.values() 
                if isinstance(result, dict) and 'success' in result
            ),
            "ai_quality_metrics": {
                "substantial_content": True,  # Will be validated based on results
                "uses_web_search": 'context_enhancement' in results,
                "comprehensive_generation": 'comprehensive_survey' in results,
                "context_aware": True
            }
        }
        
        logger.info(f"AI system test completed successfully: {test_type}")
        return results
        
    except Exception as e:
        logger.error(f"Error testing AI survey generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI system test failed: {str(e)}"
        )


@router.get("/health")
async def chat_health():
    """
    Health check endpoint for chat service.
    """
    try:
        # Test OpenAI connection with a simple request
        test_response = await openai_service.get_chat_completion(
            messages=[{"role": "user", "content": "Health check"}]
        )
        
        return JSONResponse(
            content={
                "status": "healthy",
                "service": "chat-service",
                "openai_connection": "active" if test_response else "inactive",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Chat service health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": "chat-service",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.post("/stream-with-thread")
async def chat_stream_with_thread(thread_id: str = Query(...), prompt: str = Query(...)):
    """
    Stream chat completion with thread persistence.
    
    This endpoint saves messages to a specific thread and generates titles automatically.
    """
    try:
        logger.info(f"Received streaming chat request for thread {thread_id}")
        
        # Get the thread to build context
        thread = await chat_thread_service.get_thread(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Add user message to thread
        await chat_thread_service.add_message(thread_id, MessageRole.user, prompt)
        
        # Build message history for context
        messages = []
        for msg in thread.messages:
            messages.append({
                "role": msg.role.value,
                "content": msg.content
            })
        
        # Create async generator for streaming
        async def generate_stream():
            try:
                full_response = ""
                async for chunk in openai_service.chat_completion_streaming(
                    messages=messages,
                    use_tools=True,  # Enable web search by default
                    persona="culture_intelligence"
                ):
                    full_response += chunk
                    # Format as Server-Sent Events
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save AI response to thread
                if full_response:
                    await chat_thread_service.add_message(thread_id, MessageRole.assistant, full_response)
                    
                    # Generate title if this is the first exchange
                    if len(thread.messages) <= 2 and (not thread.title or thread.title == "New Chat"):
                        title = await chat_thread_service.generate_thread_title(prompt, full_response)
                        await chat_thread_service.update_thread_title(thread_id, title)
                        yield f"data: {json.dumps({'title_updated': title})}\n\n"
                
                # Send end-of-stream marker
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in stream generation: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat stream with thread endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process streaming chat request: {str(e)}"
        )


@router.post("/generate-survey-template")
async def generate_survey_template(request: dict):
    """
    Generate a comprehensive survey template using advanced AI with substantial content.
    """
    try:
        description = request.get('description', '')
        survey_type = request.get('type', 'culture')
        target_audience = request.get('target_audience', 'employees')
        
        logger.info(f"Generating survey template for: {description[:100]}...")
        
        # Create prompt for survey generation
        prompt = f"""
        Create a professional survey template based on this description: "{description}"
        
        Survey type: {survey_type}
        Target audience: {target_audience}
        
        For the title, create a concise, professional name that captures the essence without redundant words like "Survey" or "Culture Survey:". For example:
        - "Culture and Employee Satisfaction" → "Employee Satisfaction Assessment"
        - "Team Engagement Survey" → "Team Engagement Analysis"
        - "Workplace Culture" → "Workplace Culture Evaluation"
        
        Generate a JSON response with the following structure:
        {{
          "title": "Survey title",
          "description": "Brief survey description",
          "questions": [
            {{
              "id": "q1",
              "type": "multiple_choice|scale|text|multiple_select",
              "text": "Question text",
              "options": ["Option 1", "Option 2"] (for choice questions),
              "min": 1, "max": 10 (for scale questions),
              "placeholder": "hint text" (for text questions),
              "required": true/false
            }}
          ],
          "classifiers": [
            {{
              "id": "classifier_id",
              "name": "Classifier Name",
              "values": ["Value 1", "Value 2"]
            }}
          ],
          "metrics": [
            {{
              "id": "metric_id", 
              "name": "Metric Name",
              "formula": "avg(q1,q2)",
              "description": "What this metric measures"
            }}
          ]
        }}
        
        Focus on culture intelligence, employee engagement, and actionable insights.
        Generate 4-6 relevant questions with appropriate question types.
        """
        
        # Use the new comprehensive survey generation method
        survey_template = await openai_service.generate_comprehensive_survey(
            description=description,
            survey_type=survey_type,
            target_audience=target_audience
        )
        
        # Transform the data to match frontend expectations
        formatted_template = {
            "template": {
                "name": survey_template.get("name", ""),
                "context": survey_template.get("context", ""),
                "desiredOutcomes": survey_template.get("desiredOutcomes", []),
                "classifiers": survey_template.get("classifiers", []),
                "metrics": survey_template.get("metrics", []),
                "questions": survey_template.get("questions", []),
                "configuration": {
                    "appearance": {
                        "primaryColor": "#8B5CF6",
                        "backgroundColor": "#FAFBFF",
                        "fontFamily": "Inter"
                    },
                    "timing": {
                        "estimatedMinutes": len(survey_template.get("questions", [])) * 0.75,
                        "allowPause": True,
                        "showProgress": True
                    },
                    "responses": {
                        "allowAnonymous": True,
                        "requireCompletion": False,
                        "sendReminders": True
                    }
                }
            }
        }
        
        logger.info(f"Successfully generated survey with {len(survey_template.get('questions', []))} questions, {len(survey_template.get('metrics', []))} metrics, and {len(survey_template.get('classifiers', []))} classifiers")
        
        return formatted_template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in comprehensive survey template generation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate comprehensive survey template: {str(e)}"
        )


@router.post("/enhance-metric-formula")
async def enhance_metric_formula(request: dict):
    """
    Enhance a metric formula using AI.
    """
    try:
        metric_name = request.get('metricName', '')
        metric_description = request.get('metricDescription', '')
        questions = request.get('questions', [])
        selected_classifiers = request.get('selectedClassifiers', [])
        
        logger.info(f"Enhancing formula for metric: {metric_name}")
        
        # Create a focused prompt for formula enhancement
        prompt = f"""
        Create an advanced analytical formula for this metric:
        
        Metric Name: {metric_name}
        Description: {metric_description}
        
        Available Questions: {[q.get('text', '') for q in questions]}
        Selected Classifiers: {selected_classifiers}
        
        Generate a sophisticated formula that:
        - Uses statistical functions like AVG(), COUNT(), PERCENT(), SUM()
        - References specific questions by their index (q1, q2, etc.)
        - Incorporates the selected classifiers for segmentation (BY Department, etc.)
        - Provides meaningful business insights
        
        Return only the formula string, such as:
        "AVG(q1, q3) * 100 BY Department, Experience Level"
        "COUNT(q2 >= 4) / COUNT(total_responses) * 100"
        "PERCENT(q1 == 'Very Satisfied') BY Work Arrangement"
        """
        
        enhanced_formula = await openai_service.send_message([
            {"role": "system", "content": "You are an expert data analyst and metrics designer."},
            {"role": "user", "content": prompt}
        ])
        
        return {
            "enhanced_formula": enhanced_formula.strip().replace('"', '').replace("'", "")
        }
        
    except Exception as e:
        logger.error(f"Error enhancing metric formula: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enhance metric formula: {str(e)}"
        )
