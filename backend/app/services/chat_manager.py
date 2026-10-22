from typing import Dict, Optional
from fastapi import WebSocket
import json


class ConnectionManager:
    """Manages active WebSocket connections keyed by user_id."""

    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_to_user(self, user_id: int, payload: dict) -> bool:
        """Send JSON payload to a specific user. Returns True if delivered."""
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(payload))
                return True
            except Exception:
                self.disconnect(user_id)
        return False

    def get_online_users(self) -> list:
        return list(self.active_connections.keys())


# Singleton manager shared across the app
manager = ConnectionManager()
