"""
Simple test survey endpoint to verify routing
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_survey_endpoint():
    """Test endpoint to verify surveys routing works"""
    return {"message": "Survey endpoints are working!"}
