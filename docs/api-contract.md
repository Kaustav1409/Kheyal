# Kheyal — API Contract Specification

**Base URL:** `/api` (or direct backend `/` routes as proxied by Next.js)  
**Standard Response Format:** JSON  
**Authentication Scheme:** Database-backed session cookie (`kheyal_session`), HttpOnly, SameSite, Secure

---

## 1. System Health

### `GET /health`
Public endpoint returning application and database readiness status.
- **Auth:** None (Public)
- **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-04T18:05:00.000Z",
    "uptime": 124.5
  }
  ```

---

## 2. Authentication (`/auth`)

### `POST /auth/signup`
Register a new student account.
- **Auth:** None (Public, Rate-limited)
- **Request Body:**
  ```json
  {
    "email": "student@college.edu",
    "password": "SecurePassword123!",
    "timezone": "Asia/Kolkata"
  }
  ```
- **Response `201 Created`:** Sets `kheyal_session` HttpOnly cookie.
  ```json
  {
    "user": {
      "id": "a4d3f5e0-...",
      "email": "student@college.edu",
      "timezone": "Asia/Kolkata",
      "createdAt": "2026-11-04T18:05:00.000Z"
    }
  }
  ```

### `POST /auth/login`
Authenticate with email and password.
- **Auth:** None (Public, Rate-limited)
- **Request Body:**
  ```json
  {
    "email": "student@college.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`:** Sets `kheyal_session` HttpOnly cookie.
  ```json
  {
    "user": {
      "id": "a4d3f5e0-...",
      "email": "student@college.edu",
      "timezone": "Asia/Kolkata"
    }
  }
  ```

### `POST /auth/google`
Authenticate using Google OAuth credential.
- **Auth:** None (Public, Rate-limited)
- **Request Body:**
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
- **Response `200 OK`:** Sets `kheyal_session` HttpOnly cookie.
  ```json
  {
    "user": {
      "id": "a4d3f5e0-...",
      "email": "student@gmail.com",
      "timezone": "Asia/Kolkata"
    }
  }
  ```

### `POST /auth/logout`
Revoke active session on server and clear cookie.
- **Auth:** Required (Session cookie)
- **Response `200 OK`:** Clears `kheyal_session` cookie.
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### `GET /auth/me`
Retrieve currently authenticated user profile.
- **Auth:** Required (Session cookie)
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "a4d3f5e0-...",
      "email": "student@college.edu",
      "timezone": "Asia/Kolkata"
    }
  }
  ```

---

## 3. Deadline Management (`/deadlines`)

### `POST /deadlines/parse`
Extract structured fields from natural language text without saving.
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "text": "Complete DBMS assignment by 25 October at 5 PM",
    "timezone": "Asia/Kolkata"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "preview": {
      "title": "Complete DBMS assignment",
      "subject": "DBMS",
      "dueAt": "2026-10-25T11:30:00.000Z",
      "hasDueTime": true,
      "effortHours": null,
      "warnings": []
    }
  }
  ```

### `POST /deadlines`
Create a confirmed deadline and generate scheduled reminders.
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "title": "Complete DBMS assignment",
    "subject": "DBMS",
    "dueAt": "2026-10-25T11:30:00.000Z",
    "hasDueTime": true,
    "effortHours": 6.0
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "deadline": {
      "id": "b7e2c1a0-...",
      "title": "Complete DBMS assignment",
      "subject": "DBMS",
      "dueAt": "2026-10-25T11:30:00.000Z",
      "hasDueTime": true,
      "effortHours": 6.0,
      "status": "active",
      "createdAt": "2026-11-04T18:05:00.000Z"
    },
    "remindersScheduled": 3
  }
  ```

### `GET /deadlines`
List user deadlines with optional status filtering.
- **Auth:** Required
- **Query Params:** `status=active|completed|all`
- **Response `200 OK`:**
  ```json
  {
    "deadlines": [
      {
        "id": "b7e2c1a0-...",
        "title": "Complete DBMS assignment",
        "subject": "DBMS",
        "dueAt": "2026-10-25T11:30:00.000Z",
        "hasDueTime": true,
        "effortHours": 6.0,
        "status": "active",
        "isOverdue": false
      }
    ]
  }
  ```

### `GET /deadlines/next`
Ranked "Do this next" actionable task list.
- **Auth:** Required
- **Response `200 OK`:**
  ```json
  {
    "rankedDeadlines": [
      {
        "id": "b7e2c1a0-...",
        "title": "Complete DBMS assignment",
        "subject": "DBMS",
        "dueAt": "2026-10-25T11:30:00.000Z",
        "hasDueTime": true,
        "effortHours": 6.0,
        "slackHours": 49.5,
        "suggestedStartBy": "2026-10-25T03:30:00.000Z",
        "urgencyRank": 1,
        "isOverdue": false,
        "reason": "Least spare time (49.5h slack)"
      }
    ],
    "overdueCount": 0
  }
  ```

### `PATCH /deadlines/:id`
Update an existing deadline or mark it completed. Regenerates or cancels reminders.
- **Auth:** Required (Owner only)
- **Request Body (Partial):**
  ```json
  {
    "status": "completed"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "deadline": {
      "id": "b7e2c1a0-...",
      "status": "completed",
      "completedAt": "2026-11-04T18:10:00.000Z"
    }
  }
  ```

### `DELETE /deadlines/:id`
Permanently delete a deadline and cancel its pending reminders.
- **Auth:** Required (Owner only)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Deadline deleted"
  }
  ```

---

## 4. Web Push Subscriptions (`/push`)

### `POST /push/subscribe`
Register browser push notification subscription.
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcR...",
      "auth": "tBHU..."
    }
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "subscriptionId": "f9a1b2c3-..."
  }
  ```

### `DELETE /push/subscribe`
Unregister a browser push subscription.
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Push subscription removed"
  }
  ```

---

## 5. User Preferences (`/me/preferences`)

### `GET /me/preferences`
Retrieve user settings (buffer, quiet hours).
- **Auth:** Required
- **Response `200 OK`:**
  ```json
  {
    "startByBufferHours": 2.0,
    "quietHoursEnabled": true,
    "quietHoursStart": "23:00",
    "quietHoursEnd": "07:00"
  }
  ```

### `PATCH /me/preferences`
Update user settings.
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "startByBufferHours": 3.0
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "preferences": {
      "startByBufferHours": 3.0,
      "quietHoursEnabled": true,
      "quietHoursStart": "23:00",
      "quietHoursEnd": "07:00"
    }
  }
  ```
