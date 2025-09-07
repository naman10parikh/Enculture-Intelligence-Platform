"""
Chat API endpoints with streaming support
"""

import json
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse

from app.core.logging_config import get_logger
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    SurveyGenerationRequest,
    SurveyGenerationResponse,
    ErrorResponse
)
from app.services.openai_service import openai_service

router = APIRouter()
logger = get_logger(__name__)


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat completion responses from OpenAI GPT-5.
    
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
