from typing import Optional, List
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.friendship import Friendship, FriendshipStatus
from app.models.user import User
from app.models.message import Message


def get_friendship(db: Session, user_a: int, user_b: int) -> Optional[Friendship]:
    """Return friendship record between two users regardless of direction."""
    return db.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == user_a, Friendship.addressee_id == user_b),
            and_(Friendship.requester_id == user_b, Friendship.addressee_id == user_a),
        )
    ).first()


def are_friends(db: Session, user_a: int, user_b: int) -> bool:
    f = get_friendship(db, user_a, user_b)
    return f is not None and f.status == FriendshipStatus.accepted


def send_friend_request(db: Session, requester_id: int, addressee_id: int) -> Friendship:
    target = db.query(User).filter(User.id == addressee_id).first()
    if not target:
        raise ValueError("User not found")

    existing = get_friendship(db, requester_id, addressee_id)
    if existing:
        if existing.status == FriendshipStatus.accepted:
            raise ValueError("You are already friends")
        if existing.status == FriendshipStatus.pending:
            raise ValueError("Friend request already pending")
        # If previously rejected, re-activate the request
        existing.status = FriendshipStatus.pending
        existing.requester_id = requester_id
        existing.addressee_id = addressee_id
        existing.responded_at = None
        db.commit()
        db.refresh(existing)
        return existing

    friendship = Friendship(requester_id=requester_id, addressee_id=addressee_id)
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


def accept_friend_request(db: Session, request_id: int, current_user_id: int) -> Friendship:
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise ValueError("Friend request not found")
    if friendship.addressee_id != current_user_id:
        raise ValueError("Not authorized")
    if friendship.status != FriendshipStatus.pending:
        raise ValueError("Request is not pending")
    friendship.status = FriendshipStatus.accepted
    friendship.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(friendship)
    return friendship


def reject_friend_request(db: Session, request_id: int, current_user_id: int) -> Friendship:
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise ValueError("Friend request not found")
    if friendship.addressee_id != current_user_id:
        raise ValueError("Not authorized")
    if friendship.status != FriendshipStatus.pending:
        raise ValueError("Request is not pending")
    friendship.status = FriendshipStatus.rejected
    friendship.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(friendship)
    return friendship


def get_friends(db: Session, user_id: int) -> List[dict]:
    """Return list of accepted friends with unread count."""
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.requester_id == user_id,
            Friendship.addressee_id == user_id,
        ),
        Friendship.status == FriendshipStatus.accepted,
    ).all()

    result = []
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        friend = db.query(User).filter(User.id == friend_id).first()
        if friend:
            unread = db.query(Message).filter(
                Message.sender_id == friend_id,
                Message.receiver_id == user_id,
                Message.read_at.is_(None),
            ).count()
            result.append({"id": friend.id, "username": friend.username, "unread_count": unread})
    return result


def get_incoming_requests(db: Session, user_id: int) -> List[Friendship]:
    return db.query(Friendship).filter(
        Friendship.addressee_id == user_id,
        Friendship.status == FriendshipStatus.pending,
    ).all()


def get_sent_requests(db: Session, user_id: int) -> List[Friendship]:
    return db.query(Friendship).filter(
        Friendship.requester_id == user_id,
        Friendship.status == FriendshipStatus.pending,
    ).all()
