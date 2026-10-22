from app.db.base import Base
from app.db.session import engine, SessionLocal, get_db

try:
    # Import all models here so Alembic can detect them
    from app.models.user import User  # noqa: F401
    from app.models.friendship import Friendship  # noqa: F401
    from app.models.message import Message  # noqa: F401
except ImportError:
    pass

__all__ = ["Base", "engine", "SessionLocal", "get_db"]

