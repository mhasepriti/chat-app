from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.friendship import FriendshipStatus
from app.schemas.user import UserPublic


class FriendRequestCreate(BaseModel):
    addressee_id: int


class FriendRequestOut(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: FriendshipStatus
    created_at: datetime
    responded_at: Optional[datetime] = None
    requester: UserPublic
    addressee: UserPublic

    model_config = {"from_attributes": True}


class FriendOut(BaseModel):
    id: int
    username: str
    unread_count: int = 0

    model_config = {"from_attributes": True}
