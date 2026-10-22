"""
Run this script to create all database tables directly (without Alembic).
Useful for quick local dev setup.
Usage: python create_tables.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Import all models so they register with Base
from app.models.user import User  # noqa
from app.models.friendship import Friendship  # noqa
from app.models.message import Message  # noqa

print(f"Connecting to: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully!")
