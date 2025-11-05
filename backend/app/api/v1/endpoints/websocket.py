"""
WebSocket endpoints for real-time notifications
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.services.websocket_manager import websocket_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class SurveyCompletionNotification(BaseModel):
    survey_id: str
    survey_name: str
    completed_by: str
    completed_by_name: str
    creator_id: str


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


@router.post("/survey-completed")
async def notify_survey_completion(notification: SurveyCompletionNotification):
    """Send survey completion notification to the survey creator"""
    try:
        # Create notification message
        notification_data = {
            "type": "survey_completed",
            "survey_id": notification.survey_id,
            "survey_name": notification.survey_name,
            "completed_by": notification.completed_by,
            "completed_by_name": notification.completed_by_name,
            "message": f"🎉 {notification.completed_by_name} completed your survey '{notification.survey_name}'"
        }
        
        # Send notification to survey creator
        success = await websocket_manager.send_personal_message(
            notification_data,
            notification.creator_id
        )
        
        if success:
            logger.info(f"Survey completion notification sent to {notification.creator_id} for survey {notification.survey_id}")
            return JSONResponse({
                "success": True,
                "message": "Notification sent successfully"
            })
        else:
            logger.warning(f"Creator {notification.creator_id} not connected, notification not delivered")
            return JSONResponse({
                "success": False,
                "message": "Creator not connected"
            }, status_code=200)  # Still return 200 as this is expected behavior
            
    except Exception as e:
        logger.error(f"Error sending survey completion notification: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send notification: {str(e)}"
        )
