from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.models.message import Message
from app.schemas.message import MessageOut, MessageUpdate
from app.core.security import get_current_user_id
from app.services.friend_service import are_friends

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/{friend_id}", response_model=List[MessageOut])
def get_messages(
    friend_id: int,
    before_id: Optional[int] = Query(None),
    limit: int = Query(30, le=100),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if not are_friends(db, current_user_id, friend_id):
        raise HTTPException(status_code=403, detail="Not friends with this user")

    query = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user_id, Message.receiver_id == friend_id),
            and_(Message.sender_id == friend_id, Message.receiver_id == current_user_id),
        )
    )
    if before_id:
        query = query.filter(Message.id < before_id)

    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    messages.reverse()  # Return in ascending order for display
    return messages


@router.post("/{friend_id}/read")
async def mark_as_read(
    friend_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mark all unread messages from friend as read."""
    now = datetime.now(timezone.utc)
    db.query(Message).filter(
        Message.sender_id == friend_id,
        Message.receiver_id == current_user_id,
        Message.read_at.is_(None),
    ).update({"read_at": now})
    db.commit()

    from app.services.chat_manager import manager
    await manager.send_to_user(friend_id, {
        "type": "read",
        "by": current_user_id,
    })
    return {"ok": True}


@router.patch("/{message_id}", response_model=MessageOut)
async def edit_message(
    message_id: int,
    payload: MessageUpdate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Edit a sent message."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another user's message")
    if msg.is_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit a deleted message")

    new_content = payload.content.strip()
    if not new_content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    msg.content = new_content
    msg.is_edited = True
    msg.edited_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    from app.services.chat_manager import manager
    broadcast_data = {
        "type": "message_edited",
        "id": msg.id,
        "content": msg.content,
        "is_edited": True,
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
    }
    await manager.send_to_user(msg.receiver_id, broadcast_data)
    await manager.send_to_user(msg.sender_id, broadcast_data)

    return msg


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a sent message (soft-delete, like WhatsApp)."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete another user's message")

    if not msg.is_deleted:
        msg.is_deleted = True
        msg.content = "This message was deleted"
        db.commit()
        db.refresh(msg)

        from app.services.chat_manager import manager
        broadcast_data = {
            "type": "message_deleted",
            "id": msg.id,
        }
        await manager.send_to_user(msg.receiver_id, broadcast_data)
        await manager.send_to_user(msg.sender_id, broadcast_data)

    return {"ok": True, "id": msg.id}

