import asyncio
import json
import time
import httpx
import websockets

BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

async def test_reply_edit_delete():
    print("=" * 60)
    print("TESTING REPLY, EDIT, DELETE FEATURES (REST + WEBSOCKET)")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=BASE, timeout=10.0) as client:
        ts = int(time.time() * 1000)
        u1_name = f"alice_{ts}"
        u2_name = f"bob_{ts}"
        pwd = "Password123!"

        # 1. Register Alice
        r = await client.post("/auth/signup", json={"username": u1_name, "email": f"{u1_name}@example.com", "password": pwd})
        assert r.status_code == 201, f"Alice signup failed: {r.text}"
        token1 = r.json()["access_token"]
        u1_id = r.json()["user"]["id"]

        # 2. Register Bob
        r = await client.post("/auth/signup", json={"username": u2_name, "email": f"{u2_name}@example.com", "password": pwd})
        assert r.status_code == 201, f"Bob signup failed: {r.text}"
        token2 = r.json()["access_token"]
        u2_id = r.json()["user"]["id"]

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        # 3. Make them friends
        r = await client.post("/friends/request", json={"addressee_id": u2_id}, headers=headers1)
        assert r.status_code == 201, f"Friend request failed: {r.text}"
        req_id = r.json()["id"]
        r = await client.post(f"/friends/requests/{req_id}/accept", headers=headers2)
        assert r.status_code == 200, f"Accept failed: {r.text}"
        print("[PASS] Alice and Bob are now friends.")

        # 4. Connect Bob to WebSocket
        ws_bob = await websockets.connect(f"{WS_BASE}/ws?token={token2}")
        # Discard presence messages
        await asyncio.sleep(0.1)

        # 5. Connect Alice to WebSocket
        ws_alice = await websockets.connect(f"{WS_BASE}/ws?token={token1}")
        await asyncio.sleep(0.1)

        # Drain initial presence events
        async def drain(ws, timeout=0.2):
            events = []
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                    events.append(json.loads(msg))
                except asyncio.TimeoutError:
                    break
            return events

        await drain(ws_bob)
        await drain(ws_alice)

        # 6. Bob sends a message to Alice
        await ws_bob.send(json.dumps({
            "type": "message",
            "to": u1_id,
            "content": "Hello Alice! How are you?"
        }))
        
        # Bob receives echo, Alice receives message
        bob_echo = json.loads(await ws_bob.recv())
        alice_rec = json.loads(await ws_alice.recv())
        assert alice_rec["content"] == "Hello Alice! How are you?"
        bob_msg_id = alice_rec["id"]
        print(f"[PASS] Bob sent message ID {bob_msg_id} to Alice")

        # 7. Alice replies to Bob's message
        await ws_alice.send(json.dumps({
            "type": "message",
            "to": u2_id,
            "content": "I am great, thanks for asking!",
            "reply_to_id": bob_msg_id
        }))

        alice_reply_echo = json.loads(await ws_alice.recv())
        bob_reply_rec = json.loads(await ws_bob.recv())
        print("alice_reply_echo:", alice_reply_echo)
        print("bob_reply_rec:", bob_reply_rec)
        assert bob_reply_rec["reply_to_id"] == bob_msg_id, f"reply_to_id mismatch, got {bob_reply_rec.get('reply_to_id')}"
        assert bob_reply_rec["reply_to"]["content"] == "Hello Alice! How are you?", "reply_to preview mismatch"
        assert bob_reply_rec["reply_to"]["sender_id"] == u2_id, "reply_to sender_id mismatch"
        alice_reply_id = alice_reply_echo["id"]
        print(f"[PASS] Alice replied to message {bob_msg_id} with new message ID {alice_reply_id}")

        # 8. Alice edits her reply message via WebSocket
        await ws_alice.send(json.dumps({
            "type": "edit_message",
            "message_id": alice_reply_id,
            "to": u2_id,
            "content": "I am doing awesome, thanks for asking!"
        }))

        alice_edit_echo = json.loads(await ws_alice.recv())
        bob_edit_rec = json.loads(await ws_bob.recv())
        assert alice_edit_echo["type"] == "message_edited"
        assert alice_edit_echo["content"] == "I am doing awesome, thanks for asking!"
        assert alice_edit_echo["is_edited"] is True
        assert bob_edit_rec["content"] == "I am doing awesome, thanks for asking!"
        print(f"[PASS] Alice edited message {alice_reply_id} in real-time over WebSocket")

        # 9. Verify editing via REST endpoint
        r = await client.patch(f"/messages/{alice_reply_id}", json={"content": "I am doing super awesome!"}, headers=headers1)
        assert r.status_code == 200
        assert r.json()["content"] == "I am doing super awesome!"
        assert r.json()["is_edited"] is True
        print(f"[PASS] Alice edited message {alice_reply_id} via REST endpoint")

        # Bob should receive WS message_edited from the REST call
        bob_rest_edit_event = json.loads(await ws_bob.recv())
        assert bob_rest_edit_event["type"] == "message_edited"
        assert bob_rest_edit_event["content"] == "I am doing super awesome!"

        # Drain Alice's echo from REST
        await drain(ws_alice)

        # 10. Bob tries to edit Alice's message (should fail 403)
        r = await client.patch(f"/messages/{alice_reply_id}", json={"content": "Hacked content"}, headers=headers2)
        assert r.status_code == 403, f"Bob editing Alice's message should return 403, got {r.status_code}"
        print("[PASS] Security: Bob cannot edit Alice's message (HTTP 403)")

        # 11. Bob tries to delete Alice's message (should fail 403)
        r = await client.delete(f"/messages/{alice_reply_id}", headers=headers2)
        assert r.status_code == 403, f"Bob deleting Alice's message should return 403, got {r.status_code}"
        print("[PASS] Security: Bob cannot delete Alice's message (HTTP 403)")

        # 12. Alice deletes her message via WebSocket
        await ws_alice.send(json.dumps({
            "type": "delete_message",
            "message_id": alice_reply_id,
            "to": u2_id,
        }))

        alice_del_echo = json.loads(await ws_alice.recv())
        bob_del_rec = json.loads(await ws_bob.recv())
        assert alice_del_echo["type"] == "message_deleted"
        assert alice_del_echo["id"] == alice_reply_id
        assert bob_del_rec["type"] == "message_deleted"
        assert bob_del_rec["id"] == alice_reply_id
        print(f"[PASS] Alice deleted message {alice_reply_id} in real-time over WebSocket")

        # 13. Alice tries to edit the deleted message (should fail 400)
        r = await client.patch(f"/messages/{alice_reply_id}", json={"content": "Revive"}, headers=headers1)
        assert r.status_code == 400
        print("[PASS] Security: Cannot edit a deleted message (HTTP 400)")

        # 14. Fetch messages from GET /messages/{friend_id}
        r = await client.get(f"/messages/{u2_id}", headers=headers1)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) == 2
        deleted_msg = next(m for m in msgs if m["id"] == alice_reply_id)
        assert deleted_msg["is_deleted"] is True
        assert deleted_msg["content"] == "This message was deleted"
        assert deleted_msg["reply_to_id"] == bob_msg_id
        assert deleted_msg["reply_to"]["content"] == "Hello Alice! How are you?"
        print("[PASS] GET /messages correctly returns reply_to details and is_deleted status")

        await ws_bob.close()
        await ws_alice.close()

    print("\n" + "=" * 60)
    print("ALL REPLY, EDIT, DELETE TESTS PASSED SUCCESSFULLY! (14/14)")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_reply_edit_delete())
