from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.friendship import FriendRequestCreate, FriendRequestOut, FriendOut
from app.core.security import get_current_user_id
from app.services import (
    send_friend_request,
    accept_friend_request,
    reject_friend_request,
    get_friends,
    get_incoming_requests,
    get_sent_requests,
)

router = APIRouter(prefix="/friends", tags=["friends"])


@router.post("/request", response_model=FriendRequestOut, status_code=status.HTTP_201_CREATED)
async def create_friend_request(
    payload: FriendRequestCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if payload.addressee_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    try:
        friendship = send_friend_request(db, current_user_id, payload.addressee_id)
        from app.services.chat_manager import manager
        await manager.send_to_user(payload.addressee_id, {
            "type": "friend_request",
            "request_id": friendship.id,
            "sender_username": friendship.requester.username,
            "sender_id": friendship.requester.id,
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return friendship


@router.get("/requests", response_model=dict)
def list_requests(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    incoming = get_incoming_requests(db, current_user_id)
    sent = get_sent_requests(db, current_user_id)

    def serialize(f):
        return FriendRequestOut.model_validate(f).model_dump()

    return {
        "incoming": [serialize(f) for f in incoming],
        "sent": [serialize(f) for f in sent],
    }


@router.post("/requests/{request_id}/accept", response_model=FriendRequestOut)
async def accept_request(
    request_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        friendship = accept_friend_request(db, request_id, current_user_id)
        from app.services.chat_manager import manager
        await manager.send_to_user(friendship.requester_id, {
            "type": "friend_accepted",
            "sender_username": friendship.addressee.username,
            "sender_id": friendship.addressee.id,
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return friendship


@router.post("/requests/{request_id}/reject", response_model=FriendRequestOut)
def reject_request(
    request_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    try:
        friendship = reject_friend_request(db, request_id, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return friendship


@router.get("", response_model=List[FriendOut])
def list_friends(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    friends = get_friends(db, current_user_id)
    return [FriendOut(**f) for f in friends]
