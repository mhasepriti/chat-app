import httpx
import json

BASE = "http://localhost:8000"


def pr(label, res):
    try:
        body = res.json()
    except Exception:
        body = res.text[:200]
    status = "OK" if res.is_success else "FAIL"
    print(f"[{status}] {label}: {res.status_code} => {json.dumps(body)[:120]}")
    return body


print("=== ChatApp Backend Full Test ===\n")

# 1. Health check
pr("Health check", httpx.get(f"{BASE}/health"))

# 2. Signup Alice
r = httpx.post(f"{BASE}/auth/signup", json={"username": "alice_test", "email": "alice_test@x.com", "password": "Password123!"})
body_a = pr("Signup Alice", r)
token_a = body_a.get("access_token", "")
user_a = body_a.get("user", {})

# 3. Signup Bob
r = httpx.post(f"{BASE}/auth/signup", json={"username": "bob_test", "email": "bob_test@x.com", "password": "Password123!"})
body_b = pr("Signup Bob", r)
token_b = body_b.get("access_token", "")
user_b = body_b.get("user", {})

headers_a = {"Authorization": f"Bearer {token_a}"}
headers_b = {"Authorization": f"Bearer {token_b}"}

# 4. Login Alice
r = httpx.post(f"{BASE}/auth/login", json={"username": "alice_test", "password": "Password123!"})
pr("Login Alice", r)

# 5. Get /auth/me
r = httpx.get(f"{BASE}/auth/me", headers=headers_a)
pr("Get Me (Alice)", r)

# 6. Search users
r = httpx.get(f"{BASE}/users/search?q=bob", headers=headers_a)
pr("Search bob_test", r)

# 7. Send friend request Alice -> Bob
bob_id = user_b["id"]
r = httpx.post(f"{BASE}/friends/request", json={"addressee_id": bob_id}, headers=headers_a)
body_req = pr("Send friend request", r)
req_id = body_req.get("id")

# 8. Check incoming requests for Bob
r = httpx.get(f"{BASE}/friends/requests", headers=headers_b)
pr("Bob incoming requests", r)

# 9. Bob accepts
r = httpx.post(f"{BASE}/friends/requests/{req_id}/accept", headers=headers_b)
pr("Bob accepts request", r)

# 10. Alice's friends list
r = httpx.get(f"{BASE}/friends", headers=headers_a)
pr("Alice friends list", r)

# 11. Get messages (should be empty [])
r = httpx.get(f"{BASE}/messages/{bob_id}", headers=headers_a)
pr("Get messages Alice<->Bob", r)

# 12. Mark read
r = httpx.post(f"{BASE}/messages/{bob_id}/read", headers=headers_a)
pr("Mark read", r)

# 13. Duplicate signup should fail
r = httpx.post(f"{BASE}/auth/signup", json={"username": "alice_test", "email": "alice_test@x.com", "password": "Password123!"})
pr("Duplicate signup (should 400)", r)

# 14. Wrong password login
r = httpx.post(f"{BASE}/auth/login", json={"username": "alice_test", "password": "WrongPassword"})
pr("Wrong password (should 401)", r)

# 15. Message to non-friend should fail
r = httpx.post(f"{BASE}/auth/signup", json={"username": "charlie_test", "email": "charlie_test@x.com", "password": "Password123!"})
body_c = pr("Signup Charlie", r)
charlie_id = body_c.get("user", {}).get("id")
if charlie_id:
    r = httpx.get(f"{BASE}/messages/{charlie_id}", headers=headers_a)
    pr("Get messages with non-friend (should 403)", r)

print("\n=== ALL DONE ===")
