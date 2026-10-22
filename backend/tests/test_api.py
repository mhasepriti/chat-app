import pytest


def register_user(client, username, email, password="Password123!"):
    res = client.post(
        "/auth/signup",
        json={"username": username, "email": email, "password": password},
    )
    return res


def login_user(client, username, password="Password123!"):
    res = client.post("/auth/login", json={"username": username, "password": password})
    return res


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    def test_signup_success(self, client):
        res = register_user(client, "alice", "alice@example.com")
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "alice"
        assert data["user"]["email"] == "alice@example.com"

    def test_signup_duplicate_username(self, client):
        register_user(client, "alice", "alice@example.com")
        res = register_user(client, "alice", "alice2@example.com")
        assert res.status_code == 400
        assert "already taken" in res.json()["detail"].lower()

    def test_signup_duplicate_email(self, client):
        register_user(client, "alice", "alice@example.com")
        res = register_user(client, "bob", "alice@example.com")
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"].lower()

    def test_login_success(self, client):
        register_user(client, "alice", "alice@example.com")
        res = login_user(client, "alice")
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "alice"

    def test_login_invalid_password(self, client):
        register_user(client, "alice", "alice@example.com")
        res = login_user(client, "alice", password="WrongPassword")
        assert res.status_code == 401

    def test_get_me(self, client):
        reg = register_user(client, "alice", "alice@example.com").json()
        token = reg["access_token"]
        res = client.get("/auth/me", headers=auth_header(token))
        assert res.status_code == 200
        assert res.json()["username"] == "alice"


class TestUsersAndFriends:
    def test_search_users(self, client):
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]
        register_user(client, "alicia", "alicia@example.com")
        register_user(client, "bob", "bob@example.com")

        # Search for 'ali' as alice (should exclude alice herself, but include alicia)
        res = client.get("/users/search?q=ali", headers=auth_header(token_a))
        assert res.status_code == 200
        users = res.json()
        usernames = [u["username"] for u in users]
        assert "alicia" in usernames
        assert "alice" not in usernames

    def test_friend_request_flow(self, client):
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]
        user_a_id = res_a["user"]["id"]

        res_b = register_user(client, "bob", "bob@example.com").json()
        token_b = res_b["access_token"]
        user_b_id = res_b["user"]["id"]

        # Alice cannot send request to herself
        res_self = client.post(
            "/friends/request",
            json={"addressee_id": user_a_id},
            headers=auth_header(token_a),
        )
        assert res_self.status_code == 400

        # Alice sends request to Bob
        res_req = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        )
        assert res_req.status_code == 201
        req_id = res_req.json()["id"]

        # Sending again fails
        res_dup = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        )
        assert res_dup.status_code == 400

        # Bob checks incoming requests
        res_b_reqs = client.get("/friends/requests", headers=auth_header(token_b))
        assert res_b_reqs.status_code == 200
        incoming = res_b_reqs.json()["incoming"]
        assert len(incoming) == 1
        assert incoming[0]["requester"]["username"] == "alice"

        # Alice checks sent requests
        res_a_reqs = client.get("/friends/requests", headers=auth_header(token_a))
        sent = res_a_reqs.json()["sent"]
        assert len(sent) == 1
        assert sent[0]["addressee"]["username"] == "bob"

        # Bob accepts the request
        res_accept = client.post(
            f"/friends/requests/{req_id}/accept", headers=auth_header(token_b)
        )
        assert res_accept.status_code == 200
        assert res_accept.json()["status"] == "accepted"

        # Alice and Bob are now friends
        res_a_friends = client.get("/friends", headers=auth_header(token_a))
        assert res_a_friends.status_code == 200
        assert any(f["username"] == "bob" for f in res_a_friends.json())

        res_b_friends = client.get("/friends", headers=auth_header(token_b))
        assert res_b_friends.status_code == 200
        assert any(f["username"] == "alice" for f in res_b_friends.json())

    def test_reject_and_re_request(self, client):
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]

        res_b = register_user(client, "bob", "bob@example.com").json()
        token_b = res_b["access_token"]
        user_b_id = res_b["user"]["id"]

        # Alice sends request to Bob
        res_req = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        )
        req_id = res_req.json()["id"]

        # Bob rejects the request
        res_rej = client.post(
            f"/friends/requests/{req_id}/reject", headers=auth_header(token_b)
        )
        assert res_rej.status_code == 200
        assert res_rej.json()["status"] == "rejected"

        # Alice re-sends request to Bob (should succeed now and re-activate)
        res_re_req = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        )
        assert res_re_req.status_code == 201
        assert res_re_req.json()["status"] == "pending"


class TestChatAndMessages:
    def test_non_friends_cannot_view_messages(self, client):
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]

        res_b = register_user(client, "bob", "bob@example.com").json()
        user_b_id = res_b["user"]["id"]

        # Attempt to get messages without being friends
        res = client.get(f"/messages/{user_b_id}", headers=auth_header(token_a))
        assert res.status_code == 403

    def test_friends_message_history_and_read(self, client):
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]
        user_a_id = res_a["user"]["id"]

        res_b = register_user(client, "bob", "bob@example.com").json()
        token_b = res_b["access_token"]
        user_b_id = res_b["user"]["id"]

        # Make them friends
        req = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        ).json()
        client.post(f"/friends/requests/{req['id']}/accept", headers=auth_header(token_b))

        # Initially 0 messages
        msgs = client.get(f"/messages/{user_b_id}", headers=auth_header(token_a)).json()
        assert len(msgs) == 0

        # Mark read returns ok
        read_res = client.post(f"/messages/{user_b_id}/read", headers=auth_header(token_a))
        assert read_res.status_code == 200
        assert read_res.json()["ok"] is True


class TestWebSocket:
    def test_websocket_ping_pong(self, client):
        import json
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]

        with client.websocket_connect(f"/ws?token={token_a}") as ws:
            ws.send_text(json.dumps({"type": "ping"}))
            data = json.loads(ws.receive_text())
            assert data["type"] == "pong"

    def test_websocket_chat_between_friends(self, client):
        import json
        res_a = register_user(client, "alice", "alice@example.com").json()
        token_a = res_a["access_token"]
        user_a_id = res_a["user"]["id"]

        res_b = register_user(client, "bob", "bob@example.com").json()
        token_b = res_b["access_token"]
        user_b_id = res_b["user"]["id"]

        # Become friends
        req = client.post(
            "/friends/request",
            json={"addressee_id": user_b_id},
            headers=auth_header(token_a),
        ).json()
        client.post(f"/friends/requests/{req['id']}/accept", headers=auth_header(token_b))

        # Alice connects first, then Bob connects
        with client.websocket_connect(f"/ws?token={token_a}") as ws_alice:
            with client.websocket_connect(f"/ws?token={token_b}") as ws_bob:
                # Alice receives presence notification that Bob is online
                presence_msg = json.loads(ws_alice.receive_text())
                assert presence_msg["type"] == "presence"
                assert presence_msg["user_id"] == user_b_id
                assert presence_msg["is_online"] is True

                # Alice sends message to Bob
                ws_alice.send_text(json.dumps({
                    "type": "message",
                    "to": user_b_id,
                    "content": "Hello Bob!"
                }))

                # Bob receives the message
                bob_received = json.loads(ws_bob.receive_text())
                assert bob_received["type"] == "message"
                assert bob_received["content"] == "Hello Bob!"
                assert bob_received["sender_id"] == user_a_id

                # Alice gets echo
                alice_echo = json.loads(ws_alice.receive_text())
                assert alice_echo["type"] == "message"
                assert alice_echo["content"] == "Hello Bob!"
