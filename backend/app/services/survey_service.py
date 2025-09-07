"""
Survey Service - Handles survey creation, storage, and response management
"""

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.survey import Survey, CreateSurveyRequest, SurveyResponse

logger = logging.getLogger(__name__)

class SurveyService:
    def __init__(self):
        self.data_dir = Path("data")
        self.data_dir.mkdir(exist_ok=True)
        self.surveys_file = self.data_dir / "surveys.json"
        self.responses_file = self.data_dir / "survey_responses.json"
        
        # Initialize files if they don't exist
        if not self.surveys_file.exists():
            self._save_surveys({})
        if not self.responses_file.exists():
            self._save_responses({})

    def _load_surveys(self) -> Dict[str, Any]:
        """Load surveys from JSON file"""
        try:
            with open(self.surveys_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading surveys: {e}")
            return {}

    def _save_surveys(self, surveys: Dict[str, Any]):
        """Save surveys to JSON file"""
        try:
            with open(self.surveys_file, 'w') as f:
                json.dump(surveys, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving surveys: {e}")

    def _load_responses(self) -> Dict[str, Any]:
        """Load survey responses from JSON file"""
        try:
            with open(self.responses_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading responses: {e}")
            return {}

    def _save_responses(self, responses: Dict[str, Any]):
        """Save survey responses to JSON file"""
        try:
            with open(self.responses_file, 'w') as f:
                json.dump(responses, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving responses: {e}")

    async def create_survey(self, request: CreateSurveyRequest) -> Survey:
        """Create a new survey"""
        try:
            # Generate survey ID
            survey_id = f"survey_{datetime.now().timestamp()}"
            
            # Create survey object
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
            
            # Save to storage
            surveys = self._load_surveys()
            surveys[survey_id] = survey.model_dump()
            self._save_surveys(surveys)
            
            logger.info(f"Created survey: {survey_id}")
            return survey
            
        except Exception as e:
            logger.error(f"Error creating survey: {e}")
            raise

    async def get_survey(self, survey_id: str) -> Optional[Survey]:
        """Get a survey by ID"""
        try:
            surveys = self._load_surveys()
            if survey_id in surveys:
                survey_data = surveys[survey_id]
                return Survey(**survey_data)
            return None
        except Exception as e:
            logger.error(f"Error getting survey {survey_id}: {e}")
            return None

    async def update_survey(self, survey_id: str, survey: Survey) -> Survey:
        """Update an existing survey"""
        try:
            surveys = self._load_surveys()
            surveys[survey_id] = survey.model_dump()
            self._save_surveys(surveys)
            
            logger.info(f"Updated survey: {survey_id}")
            return survey
            
        except Exception as e:
            logger.error(f"Error updating survey {survey_id}: {e}")
            raise

    async def list_surveys(self, created_by: Optional[str] = None) -> List[Survey]:
        """List all surveys, optionally filtered by creator"""
        try:
            surveys = self._load_surveys()
            survey_list = []
            
            for survey_data in surveys.values():
                if created_by is None or survey_data.get('created_by') == created_by:
                    survey_list.append(Survey(**survey_data))
            
            return survey_list
            
        except Exception as e:
            logger.error(f"Error listing surveys: {e}")
            return []

    async def add_survey_response(self, response: SurveyResponse) -> SurveyResponse:
        """Add a survey response"""
        try:
            responses = self._load_responses()
            
            # Group responses by survey_id
            if response.survey_id not in responses:
                responses[response.survey_id] = []
            
            responses[response.survey_id].append(response.model_dump())
            self._save_responses(responses)
            
            logger.info(f"Added response for survey: {response.survey_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error adding survey response: {e}")
            raise

    async def get_responses_for_survey(self, survey_id: str) -> List[SurveyResponse]:
        """Get all responses for a specific survey"""
        try:
            responses = self._load_responses()
            
            if survey_id in responses:
                return [SurveyResponse(**resp) for resp in responses[survey_id]]
            return []
            
        except Exception as e:
            logger.error(f"Error getting responses for survey {survey_id}: {e}")
            return []

    async def get_survey_stats(self, survey_id: str) -> Dict[str, Any]:
        """Get statistics for a survey"""
        try:
            responses = await self.get_responses_for_survey(survey_id)
            survey = await self.get_survey(survey_id)
            
            if not survey:
                return {}
            
            stats = {
                "survey_id": survey_id,
                "survey_name": survey.name,
                "total_responses": len(responses),
                "created_by": survey.created_by,
                "created_at": survey.created_at,
                "status": survey.status,
                "question_count": len(survey.questions)
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting survey stats {survey_id}: {e}")
            return {}

# Create global instance
survey_service = SurveyService()
