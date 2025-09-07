"""
Survey management endpoints
"""

import json
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

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

# In-memory storage for demo (replace with database in production)
surveys_storage: dict = {}
survey_responses: dict = {}


@router.post("/create", response_model=Survey)
async def create_survey(request: CreateSurveyRequest):
    """Create a new survey"""
    try:
        survey_id = f"survey_{datetime.now().timestamp()}"
        
        survey = Survey(
            id=survey_id,
            name=request.name,
            context=request.context,
            desired_outcomes=request.desired_outcomes,
            classifiers=request.classifiers,
            metrics=request.metrics,
            questions=request.questions,
            configuration=request.configuration,
            branding=request.branding,
            created_by=request.created_by,
            created_at=datetime.now(),
            status="draft"
        )
        
        surveys_storage[survey_id] = survey
        logger.info(f"Created survey {survey_id}: {survey.name}")
        
        return survey
        
    except Exception as e:
        logger.error(f"Error creating survey: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create survey: {str(e)}"
        )


@router.post("/publish")
async def publish_survey(request: PublishSurveyRequest):
    """Publish a survey and send notifications to target audience"""
    try:
        survey_id = request.survey_id
        
        if survey_id not in surveys_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        # Update survey status
        survey = surveys_storage[survey_id]
        survey.status = "published"
        survey.published_at = datetime.now()
        survey.configuration.target_audience = request.target_audience
        
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
        surveys_list = []
        for survey in surveys_storage.values():
            surveys_list.append({
                "id": survey.id,
                "name": survey.name,
                "status": survey.status,
                "created_by": survey.created_by,
                "created_at": survey.created_at.isoformat(),
                "question_count": len(survey.questions),
                "response_count": len(survey_responses.get(survey.id, {}))
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
        if survey_id not in surveys_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        survey = surveys_storage[survey_id]
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
        
        if survey_id not in surveys_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        # Initialize responses storage for this survey if needed
        if survey_id not in survey_responses:
            survey_responses[survey_id] = {}
        
        response_id = f"response_{datetime.now().timestamp()}"
        survey_response = SurveyResponse(
            id=response_id,
            survey_id=survey_id,
            user_id=request.user_id,
            responses=request.responses,
            submitted_at=datetime.now()
        )
        
        survey_responses[survey_id][response_id] = survey_response
        
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
        if survey_id not in surveys_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Survey not found"
            )
        
        responses = survey_responses.get(survey_id, {})
        response_list = []
        
        for response in responses.values():
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
