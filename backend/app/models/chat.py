"""
Chat-related Pydantic models for API requests and responses
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Individual chat message model."""
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class ChatRequest(BaseModel):
    """Request model for chat completion."""
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    persona: Optional[str] = Field(None, description="User persona (CEO, HR admin, manager, employee)")
    use_tools: bool = Field(True, description="Whether to enable web search tools")
    stream: bool = Field(True, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Response model for chat completion."""
    response: str = Field(..., description="AI response content")
    persona: Optional[str] = Field(None, description="User persona used")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage information")


class SurveyGenerationRequest(BaseModel):
    """Request model for survey question generation."""
    context: str = Field(..., description="Context for the survey")
    num_questions: int = Field(5, description="Number of questions to generate")
    question_types: Optional[List[str]] = Field(
        default=["multiple_choice", "rating", "text"],
        description="Types of questions to generate"
    )
    persona: Optional[str] = Field(None, description="Target persona for survey")


class SurveyQuestion(BaseModel):
    """Individual survey question model."""
    question: str = Field(..., description="Question text")
    type: str = Field(..., description="Question type")
    options: Optional[List[str]] = Field(None, description="Options for multiple choice questions")
    required: bool = Field(True, description="Whether question is required")
    classifier: Optional[str] = Field(None, description="Question classifier/category")
    metrics: Optional[List[str]] = Field(None, description="Associated metrics")


class SurveyGenerationResponse(BaseModel):
    """Response model for survey generation."""
    questions: List[SurveyQuestion] = Field(..., description="Generated survey questions")
    context: str = Field(..., description="Survey context used")
    total_questions: int = Field(..., description="Total number of questions generated")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    timestamp: str = Field(..., description="Response timestamp")


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[str] = Field(None, description="Error code")
