from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.friends import router as friends_router
from app.routers.messages import router as messages_router
from app.routers.ws import router as ws_router

__all__ = ["auth_router", "users_router", "friends_router", "messages_router", "ws_router"]
