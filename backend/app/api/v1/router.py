"""
Main API v1 router
"""

from fastapi import APIRouter

from app.api.v1.endpoints import chat

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
