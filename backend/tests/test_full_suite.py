import sys
import time
import json
import httpx
import websockets
import asyncio

BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

async def run_full_suite():
    print("=" * 60)
    print(">>> STARTING COMPREHENSIVE CHATAPP INTEGRATION TEST")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    def log_test(name, success, detail=""):
        nonlocal passed, failed
        if success:
            passed += 1
            print(f"  [PASS] {name} {detail}")
        else:
            failed += 1
            print(f"  [FAIL] {name} {detail}")

    async with httpx.AsyncClient(base_url=BASE, timeout=10.0) as client:
        # 1. Health check
        try:
            r = await client.get("/health")
            log_test("Backend Health Check", r.status_code == 200, f"Status: {r.status_code}")
        except Exception as e:
            log_test("Backend Health Check", False, str(e))
            return

        ts = int(time.time() * 1000)
        u1_name = f"tester1_{ts}"
        u1_email = f"{u1_name}@example.com"
        u1_pwd = "Password123!"

        u2_name = f"tester2_{ts}"
        u2_email = f"{u2_name}@example.com"
        u2_pwd = "Password123!"

        u3_name = f"tester3_{ts}"
        u3_email = f"{u3_name}@example.com"
        u3_pwd = "Password123!"

        # 2. Signup User 1
        r = await client.post("/auth/signup", json={"username": u1_name, "email": u1_email, "password": u1_pwd})
        log_test("User 1 Signup", r.status_code == 201, f"User: {u1_name}")
        token1 = r.json().get("access_token")
        u1_id = r.json().get("user", {}).get("id")

        # 3. Signup User 2
        r = await client.post("/auth/signup", json={"username": u2_name, "email": u2_email, "password": u2_pwd})
        log_test("User 2 Signup", r.status_code == 201, f"User: {u2_name}")
        token2 = r.json().get("access_token")
        u2_id = r.json().get("user", {}).get("id")

        # 4. Signup User 3 (for non-friend security checks)
        r = await client.post("/auth/signup", json={"username": u3_name, "email": u3_email, "password": u3_pwd})
        log_test("User 3 Signup", r.status_code == 201, f"User: {u3_name}")
        u3_id = r.json().get("user", {}).get("id")

        # 5. Duplicate signup prevention
        r = await client.post("/auth/signup", json={"username": u1_name, "email": f"diff_{u1_email}", "password": u1_pwd})
        log_test("Prevent Duplicate Username", r.status_code == 400, f"Code: {r.status_code}")

        # 6. Login User 1
        r = await client.post("/auth/login", json={"username": u1_name, "password": u1_pwd})
        log_test("Login User 1", r.status_code == 200 and "access_token" in r.json())

        # 7. Login with wrong password
        r = await client.post("/auth/login", json={"username": u1_name, "password": "WrongPassword"})
        log_test("Reject Wrong Password", r.status_code == 401)

        # 8. Get current profile (/auth/me)
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        r = await client.get("/auth/me", headers=headers1)
        log_test("Get Profile (/auth/me)", r.status_code == 200 and r.json().get("username") == u1_name)

        # 9. Search user
        r = await client.get(f"/users/search?q={u2_name}", headers=headers1)
        users_found = r.json()
        found_u2 = any(u.get("username") == u2_name for u in users_found)
        log_test(f"Search User ('{u2_name}')", r.status_code == 200 and found_u2)

        # 10. Send friend request (User 1 -> User 2)
        r = await client.post("/friends/request", json={"addressee_id": u2_id}, headers=headers1)
        req_id = r.json().get("id") if r.status_code == 201 else None
        log_test("Send Friend Request", r.status_code == 201 and req_id is not None, f"Req ID: {req_id}")

        # 11. Prevent duplicate friend request
        r = await client.post("/friends/request", json={"addressee_id": u2_id}, headers=headers1)
        log_test("Prevent Duplicate Friend Request", r.status_code == 400)

        # 12. Check pending incoming requests for User 2
        r = await client.get("/friends/requests", headers=headers2)
        reqs = r.json()
        incoming_reqs = reqs.get("incoming", []) if isinstance(reqs, dict) else []
        has_req = any(req.get("id") == req_id for req in incoming_reqs)
        log_test("User 2 Sees Incoming Request", r.status_code == 200 and has_req)

        # 13. Accept friend request (User 2 accepts)
        r = await client.post(f"/friends/requests/{req_id}/accept", headers=headers2)
        log_test("Accept Friend Request", r.status_code == 200)

        # 14. Verify User 1 friend list
        r = await client.get("/friends", headers=headers1)
        friends1 = r.json()
        u1_has_u2 = any(f.get("id") == u2_id for f in friends1)
        log_test("User 1 Friend List Contains User 2", r.status_code == 200 and u1_has_u2)

        # 15. Verify User 2 friend list
        r = await client.get("/friends", headers=headers2)
        friends2 = r.json()
        u2_has_u1 = any(f.get("id") == u1_id for f in friends2)
        log_test("User 2 Friend List Contains User 1", r.status_code == 200 and u2_has_u1)

        # 16. Security check: Message between non-friends (User 1 and User 3) must be 403 Forbidden
        r = await client.get(f"/messages/{u3_id}", headers=headers1)
        log_test("Block Message History for Non-Friends (403)", r.status_code == 403)

        # 17. Empty initial message history between friends
        r = await client.get(f"/messages/{u2_id}", headers=headers1)
        log_test("Initial Message History is Empty", r.status_code == 200 and len(r.json()) == 0)

        # 18. WebSocket Real-time Messaging Test
        print("\n  --- Testing Real-Time WebSockets ---")
        ws_test_passed = False
        try:
            ws_url1 = f"{WS_BASE}/ws?token={token1}"
            ws_url2 = f"{WS_BASE}/ws?token={token2}"

            async with websockets.connect(ws_url1) as ws1, websockets.connect(ws_url2) as ws2:
                # User 1 sends message to User 2
                send_payload = {
                    "type": "message",
                    "to": u2_id,
                    "content": "Hello real-time WebSocket test!"
                }
                await ws1.send(json.dumps(send_payload))

                # Both sender echo and recipient receive the message
                res2 = await asyncio.wait_for(ws2.recv(), timeout=5.0)
                data2 = json.loads(res2)

                # May receive presence first or message directly
                if data2.get("type") == "presence":
                    res2 = await asyncio.wait_for(ws2.recv(), timeout=5.0)
                    data2 = json.loads(res2)

                ws_test_passed = (
                    data2.get("type") == "message" and
                    data2.get("content") == "Hello real-time WebSocket test!" and
                    data2.get("sender_id") == u1_id
                )
        except Exception as ws_err:
            print(f"  WebSocket error: {ws_err}")
            ws_test_passed = False

        log_test("Real-time WebSocket Message Exchange", ws_test_passed)

        # 19. Verify message was persisted to DB
        r = await client.get(f"/messages/{u2_id}", headers=headers1)
        msgs = r.json()
        persisted = len(msgs) == 1 and msgs[0].get("content") == "Hello real-time WebSocket test!"
        log_test("Message Persisted in Database", persisted)

        # 20. Mark message as read
        r = await client.post(f"/messages/{u1_id}/read", headers=headers2)
        log_test("Mark Message as Read", r.status_code == 200)

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_full_suite())
