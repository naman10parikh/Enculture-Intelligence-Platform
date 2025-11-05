from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessage(BaseModel):
    id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    

class ChatThread(BaseModel):
    id: str
    title: Optional[str] = None
    user_id: Optional[str] = None  # Add user_id for profile isolation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[ChatMessage] = []
    is_active: bool = True


class CreateChatThreadRequest(BaseModel):
    title: Optional[str] = None
    user_id: Optional[str] = None


class AddMessageRequest(BaseModel):
    role: MessageRole
    content: str


class UpdateChatTitleRequest(BaseModel):
    title: str


class ChatThreadResponse(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int
    is_active: bool
    
    @classmethod
    def from_thread(cls, thread: ChatThread) -> "ChatThreadResponse":
        return cls(
            id=thread.id,
            title=thread.title,
            created_at=thread.created_at,
            updated_at=thread.updated_at,
            message_count=len(thread.messages),
            is_active=thread.is_active
        )


class ChatThreadsListResponse(BaseModel):
    threads: List[ChatThreadResponse]
    total: int


class SearchChatsRequest(BaseModel):
    query: str
    limit: int = 20


class GenerateTitleRequest(BaseModel):
    first_message: str
    ai_response: str
