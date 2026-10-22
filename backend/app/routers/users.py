from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserPublic
from app.core.security import get_current_user_id

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=List[UserPublic])
def search_users(
    q: str = Query(..., min_length=1),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Search users by username prefix. Returns up to 20 results, excluding self."""
    results = (
        db.query(User)
        .filter(User.username.ilike(f"%{q}%"), User.id != current_user_id)
        .limit(20)
        .all()
    )
    return results
