from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[int] = None

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 4000:
            raise ValueError("Message too long (max 4000 chars)")
        return v


class MessageUpdate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 4000:
            raise ValueError("Message too long (max 4000 chars)")
        return v


class ReplyPreview(BaseModel):
    id: int
    sender_id: int
    sender_username: Optional[str] = None
    content: str
    is_deleted: bool = False

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    created_at: datetime
    read_at: Optional[datetime] = None
    reply_to_id: Optional[int] = None
    reply_to: Optional[ReplyPreview] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False

    model_config = {"from_attributes": True}

