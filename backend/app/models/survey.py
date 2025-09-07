"""
Survey-related Pydantic models
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class SurveyQuestion(BaseModel):
    id: str
    question: str
    response_type: str  # text, multiple_choice, rating, etc.
    options: Optional[List[str]] = None
    mandatory: bool = True
    metrics: List[str] = []
    classifiers: Dict[str, str] = {}


class SurveyConfiguration(BaseModel):
    background_image: Optional[str] = None
    languages: List[str] = ["English"]
    target_audience: List[str] = []
    release_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    anonymous: bool = True


class SurveyBranding(BaseModel):
    primary_color: str = "#8B5CF6"
    background_color: str = "#FAFBFF"
    font_family: str = "Inter"


class Survey(BaseModel):
    id: str
    name: str
    context: str
    desired_outcomes: List[str] = []
    classifiers: List[Dict[str, Any]] = []
    metrics: List[Dict[str, Any]] = []
    questions: List[SurveyQuestion] = []
    configuration: SurveyConfiguration = SurveyConfiguration()
    branding: SurveyBranding = SurveyBranding()
    status: str = "draft"  # draft, published, completed
    created_by: str
    created_at: datetime
    published_at: Optional[datetime] = None
    

class CreateSurveyRequest(BaseModel):
    name: str
    context: str
    desired_outcomes: List[str] = []
    classifiers: List[Dict[str, Any]] = []
    metrics: List[Dict[str, Any]] = []
    questions: List[SurveyQuestion] = []
    configuration: SurveyConfiguration = SurveyConfiguration()
    branding: SurveyBranding = SurveyBranding()
    created_by: str


class PublishSurveyRequest(BaseModel):
    survey_id: str
    target_audience: List[str]  # List of user IDs to send survey to


class SurveyResponse(BaseModel):
    id: str
    survey_id: str
    user_id: str
    responses: Dict[str, Any]  # question_id -> response
    submitted_at: datetime
    

class SubmitSurveyResponseRequest(BaseModel):
    survey_id: str
    user_id: str
    responses: Dict[str, Any]


class SurveyNotification(BaseModel):
    type: str = "survey_notification"
    survey: Survey
    message: str
    timestamp: datetime
