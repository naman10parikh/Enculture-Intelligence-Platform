"""
Main API v1 router
"""

from fastapi import APIRouter

from app.api.v1.endpoints import chat, chat_threads, websocket, surveys, test_surveys

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(chat_threads.router, prefix="/chat-threads", tags=["chat-threads"])
api_router.include_router(websocket.router, prefix="/notifications", tags=["websocket"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
api_router.include_router(test_surveys.router, prefix="/test-surveys", tags=["test-surveys"])
