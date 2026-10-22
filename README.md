# ChatApp — Real-time Messenger

Full-stack real-time chat app built with **FastAPI + MySQL + React + Tailwind + WebSockets**.

## Quick Start

### 1. Configure MySQL

Edit `backend/.env` and set your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=chatapp
```

### 2. Create the database

```sql
CREATE DATABASE chatapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Start the Backend

```powershell
cd backend
python create_tables.py   # creates all tables
uvicorn app.main:app --reload --port 8000
```

### 4. Start the Frontend

```powershell
cd frontend
npm run dev
```

App opens at **http://localhost:5173**  
API docs at **http://localhost:8000/docs**

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python FastAPI + Uvicorn |
| Database | MySQL + SQLAlchemy + Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Real-time | FastAPI WebSockets |

## Features

- ✅ Signup / Login with JWT
- ✅ Search users by username
- ✅ Send / Accept / Reject friend requests
- ✅ Friends list with unread message counts
- ✅ Real-time 1:1 chat via WebSockets
- ✅ Paginated chat history
- ✅ Online / Offline presence
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Auto-reconnect WebSocket
