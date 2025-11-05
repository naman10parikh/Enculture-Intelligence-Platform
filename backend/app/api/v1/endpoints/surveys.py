"""
Survey management endpoints
"""

import json
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.models.survey import (
    Survey,
    CreateSurveyRequest,
    PublishSurveyRequest,
    SubmitSurveyResponseRequest,
    SurveyResponse
)
from app.services.websocket_manager import websocket_manager
from app.services.survey_service import survey_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Use persistent survey service instead of in-memory storage
# surveys_storage and survey_responses now handled by survey_service


@router.post("/create", response_model=Survey)
async def create_survey(request: CreateSurveyRequest, raw_request: Request = None):
    """Create a new survey"""
    try:
        if raw_request:
            body = await raw_request.body()
            logger.info(f"Raw request body: {body.decode()}")
        logger.info(f"Creating survey with data: {request.model_dump()}")
        survey = await survey_service.create_survey(request)
        logger.info(f"Created survey {survey.id}: {survey.name}")
        return survey
        
    except RequestValidationError as e:
        logger.error(f"Validation error creating survey: {e}")
        logger.error(f"Request validation details: {e.errors()}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {e.errors()}"
        )
    except Exception as e:
        logger.error(f"Error creating survey: {e}")
        logger.error(f"Request data: {request}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create survey: {str(e)}"
        )


@router.post("/publish")
async def publish_survey(request: PublishSurveyRequest):
    """Publish a survey and send notifications to target audience"""
    try:
        survey_id = request.survey_id
        
        # Get survey from persistent storage
        survey = await survey_service.get_survey(survey_id)
        if not survey:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        # Update survey status
        survey.status = "published"
        survey.published_at = datetime.now()
        survey.configuration.target_audience = request.target_audience
        
        # Save updated survey
        await survey_service.update_survey(survey_id, survey)
        
        # Send real-time notifications to target audience
        survey_data = {
            "id": survey.id,
            "name": survey.name,
            "context": survey.context,
            "questions": [
                {
                    "id": q.id,
                    "question": q.question,
                    "response_type": q.response_type,
                    "options": q.options,
                    "mandatory": q.mandatory
                }
                for q in survey.questions
            ],
            "branding": {
                "primary_color": survey.branding.primary_color,
                "background_color": survey.branding.background_color,
                "font_family": survey.branding.font_family
            },
            "configuration": {
                "anonymous": survey.configuration.anonymous,
                "deadline": survey.configuration.deadline.isoformat() if survey.configuration.deadline else None
            }
        }
        
        # Send notifications via WebSocket
        notifications_sent = await websocket_manager.send_survey_notification(
            survey_data, 
            request.target_audience
        )
        
        logger.info(f"Published survey {survey_id} to {len(request.target_audience)} users, {notifications_sent} notifications sent")
        
        return {
            "success": True,
            "survey_id": survey_id,
            "notifications_sent": notifications_sent,
            "target_audience_count": len(request.target_audience)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing survey: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish survey: {str(e)}"
        )


@router.get("/list")
async def list_surveys():
    """Get all surveys"""
    try:
        # Use persistent storage to list surveys
        surveys = await survey_service.list_surveys()
        
        surveys_list = []
        for survey in surveys:
            responses = await survey_service.get_responses_for_survey(survey.id)
            surveys_list.append({
                "id": survey.id,
                "name": survey.name,
                "status": survey.status,
                "created_by": survey.created_by,
                "created_at": survey.created_at.isoformat(),
                "question_count": len(survey.questions),
                "response_count": len(responses),
                "target_audience": survey.configuration.target_audience if survey.configuration else []
            })
        
        return {"surveys": surveys_list}
        
    except Exception as e:
        logger.error(f"Error listing surveys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list surveys: {str(e)}"
        )


@router.get("/{survey_id}")
async def get_survey(survey_id: str):
    """Get a specific survey by ID"""
    try:
        survey = await survey_service.get_survey(survey_id)
        if not survey:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        return survey
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting survey {survey_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get survey: {str(e)}"
        )


@router.post("/submit-response")
async def submit_survey_response(request: SubmitSurveyResponseRequest):
    """Submit a response to a survey"""
    try:
        survey_id = request.survey_id
        
        # Check if survey exists using persistent storage
        survey = await survey_service.get_survey(survey_id)
        if not survey:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        response_id = f"response_{datetime.now().timestamp()}"
        survey_response = SurveyResponse(
            id=response_id,
            survey_id=survey_id,
            user_id=request.user_id,
            responses=request.responses,
            submitted_at=datetime.now()
        )
        
        # Use persistent storage for responses
        await survey_service.add_survey_response(survey_response)
        
        logger.info(f"Received survey response {response_id} for survey {survey_id} from user {request.user_id}")
        
        return {
            "success": True,
            "response_id": response_id,
            "survey_id": survey_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting survey response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit survey response: {str(e)}"
        )


@router.get("/{survey_id}/responses")
async def get_survey_responses(survey_id: str):
    """Get all responses for a survey"""
    try:
        # Check if survey exists using persistent storage
        survey = await survey_service.get_survey(survey_id)
        if not survey:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        # Get responses from persistent storage
        responses = await survey_service.get_responses_for_survey(survey_id)
        response_list = []
        
        for response in responses:
            response_list.append({
                "id": response.id,
                "user_id": response.user_id,
                "responses": response.responses,
                "submitted_at": response.submitted_at.isoformat()
            })
        
        return {
            "survey_id": survey_id,
            "response_count": len(response_list),
            "responses": response_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting survey responses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get survey responses: {str(e)}"
        )
