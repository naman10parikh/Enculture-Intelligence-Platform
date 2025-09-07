"""
WebSocket connection manager for real-time notifications
"""

import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        # Initialize user's connection set if not exists
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            
        # Add this connection to the user's set
        self.active_connections[user_id].add(websocket)
        
        logger.info(f"WebSocket connection established for user {user_id}")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Connected to Enculture notifications",
            "timestamp": datetime.now().isoformat()
        }, user_id)
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            # Clean up empty connection sets
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        logger.info(f"WebSocket connection closed for user {user_id}")
        
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user's connections"""
        if user_id not in self.active_connections:
            logger.warning(f"No active connections for user {user_id}")
            return False
            
        message_json = json.dumps(message)
        disconnected_connections = set()
        
        # Send to all of the user's active connections
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_text(message_json)
            except WebSocketDisconnect:
                disconnected_connections.add(connection)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                disconnected_connections.add(connection)
        
        # Clean up disconnected connections
        for connection in disconnected_connections:
            self.active_connections[user_id].discard(connection)
            
        return len(self.active_connections[user_id]) > 0
    
    async def send_survey_notification(self, survey_data: dict, target_user_ids: list):
        """Send survey notification to specific users"""
        notification = {
            "type": "survey_notification",
            "survey": survey_data,
            "timestamp": datetime.now().isoformat(),
            "message": f"New survey available: {survey_data.get('name', 'Untitled Survey')}"
        }
        
        sent_count = 0
        for user_id in target_user_ids:
            if await self.send_personal_message(notification, user_id):
                sent_count += 1
                
        logger.info(f"Survey notification sent to {sent_count}/{len(target_user_ids)} users")
        return sent_count
    
    async def broadcast_message(self, message: dict):
        """Broadcast a message to all connected users"""
        message_json = json.dumps(message)
        total_sent = 0
        
        for user_id, connections in self.active_connections.items():
            disconnected_connections = set()
            
            for connection in connections:
                try:
                    await connection.send_text(message_json)
                    total_sent += 1
                except WebSocketDisconnect:
                    disconnected_connections.add(connection)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")
                    disconnected_connections.add(connection)
            
            # Clean up disconnected connections
            for connection in disconnected_connections:
                connections.discard(connection)
        
        logger.info(f"Broadcast message sent to {total_sent} connections")
        return total_sent
    
    def get_connected_users(self) -> list:
        """Get list of currently connected user IDs"""
        return list(self.active_connections.keys())
    
    def get_connection_count(self, user_id: str = None) -> int:
        """Get connection count for a user or total"""
        if user_id:
            return len(self.active_connections.get(user_id, set()))
        else:
            return sum(len(connections) for connections in self.active_connections.values())


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
