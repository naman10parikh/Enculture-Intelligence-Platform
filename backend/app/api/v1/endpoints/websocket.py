"""
WebSocket endpoints for real-time notifications
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import websocket_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time notifications"""
    await websocket_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            # Handle client-side messages if needed
            # For now, we'll just log them
            logger.info(f"Received message from {user_id}: {data}")
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(websocket, user_id)


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection status"""
    connected_users = websocket_manager.get_connected_users()
    total_connections = websocket_manager.get_connection_count()
    
    return {
        "connected_users": connected_users,
        "total_connections": total_connections,
        "status": "healthy"
    }
