import json
import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict
from openai import OpenAI

from app.models.chat_thread import (
    ChatThread, 
    ChatMessage, 
    MessageRole,
    ChatThreadResponse,
    ChatThreadsListResponse
)
from app.core.config import get_settings


class ChatThreadService:
    def __init__(self):
        self.settings = get_settings()
        self.data_dir = Path("data")
        self.threads_file = self.data_dir / "chat_threads.json"
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize OpenAI client for title generation
        self.openai_client = OpenAI(api_key=self.settings.openai_api_key)
        
        # In-memory storage (will be persisted to file)
        self._threads: Dict[str, ChatThread] = {}
        self._load_threads()

    def _load_threads(self):
        """Load chat threads from file storage"""
        if self.threads_file.exists():
            try:
                with open(self.threads_file, 'r') as f:
                    data = json.load(f)
                    for thread_data in data.values():
                        # Convert datetime strings back to datetime objects
                        thread_data['created_at'] = datetime.fromisoformat(thread_data['created_at'])
                        thread_data['updated_at'] = datetime.fromisoformat(thread_data['updated_at'])
                        
                        # Convert message timestamps
                        for msg in thread_data.get('messages', []):
                            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
                        
                        thread = ChatThread(**thread_data)
                        self._threads[thread.id] = thread
            except Exception as e:
                print(f"Error loading threads: {e}")
                self._threads = {}

    def _save_threads(self):
        """Save chat threads to file storage"""
        try:
            data = {}
            for thread_id, thread in self._threads.items():
                thread_dict = thread.dict()
                # Convert datetime objects to strings for JSON serialization
                thread_dict['created_at'] = thread.created_at.isoformat()
                thread_dict['updated_at'] = thread.updated_at.isoformat()
                
                # Convert message timestamps
                for msg in thread_dict.get('messages', []):
                    msg['timestamp'] = datetime.fromisoformat(msg['timestamp']).isoformat() if isinstance(msg['timestamp'], str) else msg['timestamp'].isoformat()
                
                data[thread_id] = thread_dict
            
            with open(self.threads_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving threads: {e}")

    async def create_thread(self, title: Optional[str] = None) -> ChatThread:
        """Create a new chat thread"""
        thread_id = str(uuid.uuid4())
        thread = ChatThread(
            id=thread_id,
            title=title or "New Chat",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            messages=[],
            is_active=True
        )
        
        self._threads[thread_id] = thread
        self._save_threads()
        return thread

    async def get_thread(self, thread_id: str) -> Optional[ChatThread]:
        """Get a specific chat thread"""
        return self._threads.get(thread_id)

    async def get_all_threads(self, limit: int = 50, offset: int = 0) -> ChatThreadsListResponse:
        """Get all chat threads, sorted by most recent"""
        active_threads = [t for t in self._threads.values() if t.is_active]
        sorted_threads = sorted(active_threads, key=lambda x: x.updated_at, reverse=True)
        
        # Apply pagination
        paginated_threads = sorted_threads[offset:offset + limit]
        
        thread_responses = [ChatThreadResponse.from_thread(t) for t in paginated_threads]
        
        return ChatThreadsListResponse(
            threads=thread_responses,
            total=len(active_threads)
        )

    async def add_message(self, thread_id: str, role: MessageRole, content: str) -> Optional[ChatMessage]:
        """Add a message to a chat thread"""
        thread = self._threads.get(thread_id)
        if not thread:
            return None
        
        message = ChatMessage(
            id=str(uuid.uuid4()),
            role=role,
            content=content,
            timestamp=datetime.utcnow()
        )
        
        thread.messages.append(message)
        thread.updated_at = datetime.utcnow()
        
        self._save_threads()
        return message

    async def delete_thread(self, thread_id: str) -> bool:
        """Soft delete a chat thread"""
        thread = self._threads.get(thread_id)
        if not thread:
            return False
        
        thread.is_active = False
        thread.updated_at = datetime.utcnow()
        self._save_threads()
        return True

    async def update_thread_title(self, thread_id: str, title: str) -> bool:
        """Update thread title"""
        thread = self._threads.get(thread_id)
        if not thread:
            return False
        
        thread.title = title
        thread.updated_at = datetime.utcnow()
        self._save_threads()
        return True

    async def search_threads(self, query: str, limit: int = 20) -> List[ChatThreadResponse]:
        """Search chat threads by content"""
        if not query.strip():
            return []
        
        query_lower = query.lower()
        matching_threads = []
        
        for thread in self._threads.values():
            if not thread.is_active:
                continue
                
            # Search in title
            if thread.title and query_lower in thread.title.lower():
                matching_threads.append(thread)
                continue
            
            # Search in message content
            for message in thread.messages:
                if query_lower in message.content.lower():
                    matching_threads.append(thread)
                    break
        
        # Sort by most recent
        matching_threads.sort(key=lambda x: x.updated_at, reverse=True)
        
        # Apply limit
        limited_threads = matching_threads[:limit]
        
        return [ChatThreadResponse.from_thread(t) for t in limited_threads]

    async def generate_thread_title(self, first_message: str, ai_response: str) -> str:
        """Generate a concise title for the chat thread based on the first exchange"""
        try:
            # Use the synchronous client in executor for async compatibility
            def call_openai():
                response = self.openai_client.responses.create(
                    model=self.settings.openai_model,
                    messages=[
                        {
                            "role": "system",
                            "content": """Generate a concise 3-5 word title for this chat conversation. 
                            The title should capture the main topic or question being discussed.
                            Be specific and descriptive but brief.
                            Examples: "Culture Survey Creation", "Team Engagement Analysis", "Onboarding Feedback Discussion"
                            Return only the title, no quotes or additional text."""
                        },
                        {
                            "role": "user",
                            "content": f"User: {first_message}\n\nAI: {ai_response[:200]}..."
                        }
                    ]
                )
                return response.choices[0].message.content.strip()

            title = await asyncio.get_event_loop().run_in_executor(None, call_openai)
            
            # Clean up the title (remove quotes if present)
            title = title.strip('"\'')
            
            # Ensure it's not too long
            if len(title) > 50:
                title = title[:47] + "..."
            
            return title
            
        except Exception as e:
            print(f"Error generating title: {e}")
            # Fallback to a simple title based on first message
            words = first_message.split()[:3]
            return " ".join(words).title() or "New Chat"

    async def get_recent_threads(self, limit: int = 10) -> List[ChatThreadResponse]:
        """Get the most recent chat threads"""
        active_threads = [t for t in self._threads.values() if t.is_active]
        sorted_threads = sorted(active_threads, key=lambda x: x.updated_at, reverse=True)
        recent_threads = sorted_threads[:limit]
        
        return [ChatThreadResponse.from_thread(t) for t in recent_threads]
