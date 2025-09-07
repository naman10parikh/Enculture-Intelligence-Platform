from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from app.models.chat_thread import (
    ChatThread,
    ChatThreadResponse,
    ChatThreadsListResponse,
    CreateChatThreadRequest,
    AddMessageRequest,
    UpdateChatTitleRequest,
    SearchChatsRequest,
    GenerateTitleRequest,
    MessageRole
)
from app.services.chat_thread_service import ChatThreadService

router = APIRouter()

# Dependency to get chat thread service
def get_chat_thread_service() -> ChatThreadService:
    return ChatThreadService()


@router.post("/threads", response_model=ChatThreadResponse)
async def create_chat_thread(
    request: CreateChatThreadRequest,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Create a new chat thread"""
    thread = await service.create_thread(title=request.title)
    return ChatThreadResponse.from_thread(thread)


@router.get("/threads", response_model=ChatThreadsListResponse)
async def get_chat_threads(
    limit: int = 50,
    offset: int = 0,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Get all chat threads with pagination"""
    return await service.get_all_threads(limit=limit, offset=offset)


@router.get("/threads/recent", response_model=List[ChatThreadResponse])
async def get_recent_threads(
    limit: int = 10,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Get recent chat threads for sidebar"""
    return await service.get_recent_threads(limit=limit)


@router.get("/threads/{thread_id}", response_model=ChatThread)
async def get_chat_thread(
    thread_id: str,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Get a specific chat thread with all messages"""
    thread = await service.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    return thread


@router.post("/threads/{thread_id}/messages")
async def add_message_to_thread(
    thread_id: str,
    request: AddMessageRequest,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Add a message to a chat thread"""
    message = await service.add_message(thread_id, request.role, request.content)
    if not message:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    return {"message": "Message added successfully", "message_id": message.id}


@router.put("/threads/{thread_id}/title")
async def update_thread_title(
    thread_id: str,
    request: UpdateChatTitleRequest,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Update the title of a chat thread"""
    success = await service.update_thread_title(thread_id, request.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    return {"message": "Title updated successfully"}


@router.delete("/threads/{thread_id}")
async def delete_chat_thread(
    thread_id: str,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Delete (deactivate) a chat thread"""
    success = await service.delete_thread(thread_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    return {"message": "Chat thread deleted successfully"}


@router.post("/threads/search", response_model=List[ChatThreadResponse])
async def search_chat_threads(
    request: SearchChatsRequest,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Search chat threads by content"""
    return await service.search_threads(request.query, request.limit)


@router.post("/threads/generate-title")
async def generate_thread_title(
    request: GenerateTitleRequest,
    service: ChatThreadService = Depends(get_chat_thread_service)
):
    """Generate an AI-based title for a chat thread"""
    title = await service.generate_thread_title(request.first_message, request.ai_response)
    return {"title": title}
