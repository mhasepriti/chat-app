import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_token
from app.models.user import User
from app.models.message import Message
from app.services.chat_manager import manager
from app.services.friend_service import are_friends

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    # Authenticate via token query parameter
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = int(payload.get("sub", 0))
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    with SessionLocal() as db:
        sender_user = db.query(User).filter(User.id == user_id).first()
        if not sender_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        sender_username = sender_user.username

    await manager.connect(user_id, websocket)

    # Notify friends that this user is online
    try:
        with SessionLocal() as db:
            await _broadcast_online_status(db, user_id, True)

        while True:
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            msg_type = data.get("type", "message")

            if msg_type == "message":
                to_id = data.get("to")
                content = (data.get("content") or "").strip()
                reply_to_id = data.get("reply_to_id")

                if not to_id or not content:
                    await websocket.send_text(json.dumps({"error": "Missing to or content"}))
                    continue
                if len(content) > 4000:
                    await websocket.send_text(json.dumps({"error": "Message too long"}))
                    continue

                with SessionLocal() as db:
                    if not are_friends(db, user_id, to_id):
                        await websocket.send_text(json.dumps({"error": "Not friends"}))
                        continue

                    reply_preview = None
                    if reply_to_id:
                        reply_msg = db.query(Message).filter(Message.id == reply_to_id).first()
                        if reply_msg:
                            reply_preview = {
                                "id": reply_msg.id,
                                "sender_id": reply_msg.sender_id,
                                "sender_username": reply_msg.sender.username if reply_msg.sender else None,
                                "content": "This message was deleted" if reply_msg.is_deleted else reply_msg.content,
                                "is_deleted": reply_msg.is_deleted,
                            }
                        else:
                            reply_to_id = None

                    # Save to DB
                    msg = Message(
                        sender_id=user_id,
                        receiver_id=to_id,
                        content=content,
                        reply_to_id=reply_to_id,
                    )
                    db.add(msg)
                    db.commit()
                    db.refresh(msg)

                    payload_out = {
                        "type": "message",
                        "id": msg.id,
                        "sender_id": user_id,
                        "sender_username": sender_username,
                        "receiver_id": to_id,
                        "content": content,
                        "created_at": msg.created_at.isoformat(),
                        "read_at": None,
                        "reply_to_id": reply_to_id,
                        "reply_to": reply_preview,
                        "is_edited": False,
                        "edited_at": None,
                        "is_deleted": False,
                    }

                # Push to recipient if online
                await manager.send_to_user(to_id, payload_out)
                # Echo back to sender
                await manager.send_to_user(user_id, payload_out)

            elif msg_type == "edit_message":
                msg_id = data.get("message_id")
                to_id = data.get("to")
                new_content = (data.get("content") or "").strip()

                if not msg_id or not new_content or len(new_content) > 4000:
                    continue

                with SessionLocal() as db:
                    msg = db.query(Message).filter(Message.id == msg_id).first()
                    if msg and msg.sender_id == user_id and not msg.is_deleted:
                        msg.content = new_content
                        msg.is_edited = True
                        msg.edited_at = datetime.now(timezone.utc)
                        db.commit()
                        db.refresh(msg)

                        edit_payload = {
                            "type": "message_edited",
                            "id": msg.id,
                            "content": msg.content,
                            "is_edited": True,
                            "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
                        }
                        recipient_id = to_id or msg.receiver_id
                        await manager.send_to_user(recipient_id, edit_payload)
                        await manager.send_to_user(user_id, edit_payload)

            elif msg_type == "delete_message":
                msg_id = data.get("message_id")
                to_id = data.get("to")

                if not msg_id:
                    continue

                with SessionLocal() as db:
                    msg = db.query(Message).filter(Message.id == msg_id).first()
                    if msg and msg.sender_id == user_id and not msg.is_deleted:
                        msg.is_deleted = True
                        msg.content = "This message was deleted"
                        db.commit()
                        db.refresh(msg)

                        del_payload = {
                            "type": "message_deleted",
                            "id": msg.id,
                        }
                        recipient_id = to_id or msg.receiver_id
                        await manager.send_to_user(recipient_id, del_payload)
                        await manager.send_to_user(user_id, del_payload)

            elif msg_type == "typing":
                to_id = data.get("to")
                if to_id:
                    with SessionLocal() as db:
                        friends_ok = are_friends(db, user_id, to_id)
                    if friends_ok:
                        await manager.send_to_user(to_id, {
                            "type": "typing",
                            "from": user_id,
                            "is_typing": data.get("is_typing", False),
                        })

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    finally:
        manager.disconnect(user_id)
        try:
            with SessionLocal() as db:
                await _broadcast_online_status(db, user_id, False)
        except Exception:
            pass



async def _broadcast_online_status(db: Session, user_id: int, is_online: bool):
    """Notify all online friends of this user's online status change."""
    from app.services.friend_service import get_friends
    friends = get_friends(db, user_id)
    for friend in friends:
        await manager.send_to_user(friend["id"], {
            "type": "presence",
            "user_id": user_id,
            "is_online": is_online,
        })
