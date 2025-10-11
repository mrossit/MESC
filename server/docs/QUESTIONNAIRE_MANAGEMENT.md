# Questionnaire Management System

This document describes the questionnaire management backend system implemented for the MESC application.

## Status Field

The `questionnaires` table already includes a `status` field with the following possible values:
- `draft` - Questionnaire created but not sent to ministers
- `sent` - Questionnaire opened and sent to ministers (OPEN status)
- `closed` - Questionnaire closed for responses
- `deleted` - Soft-deleted questionnaire

## New Endpoints

### 1. POST `/api/questionnaires/admin/open`

**Purpose:** Manually open a questionnaire for ministers to respond.

**Authorization:** Requires coordinator or gestor role.

**Request Body:**
```json
{
  "month": 12,
  "year": 2024
}
```

**Response:**
```json
{
  "message": "Questionário de Dezembro/2024 aberto com sucesso",
  "questionnaire": {
    "id": "uuid",
    "month": 12,
    "year": 2024,
    "status": "sent",
    "title": "Questionário Dezembro 2024",
    "questions": [...],
    "updatedAt": "2024-12-10T10:00:00.000Z"
  }
}
```

**Usage:**
```bash
POST /api/questionnaires/admin/open
Content-Type: application/json
X-CSRF-Token: <csrf-token>

{
  "month": 12,
  "year": 2024
}
```

---

### 2. GET `/api/questionnaires/admin/current-status`

**Purpose:** Check if the current month's questionnaire should auto-close based on date/time logic.

**Auto-Close Logic:**
- Triggers when current day >= 25 AND current hour >= 23 (23:00 / 11 PM)
- Automatically changes status from `sent` to `closed`

**Authorization:** Requires authentication (any role).

**Response:**
```json
{
  "currentDay": 25,
  "currentMonth": 12,
  "currentYear": 2024,
  "shouldAutoClose": true,
  "isAfter23": true,
  "autoCloseTriggered": true,
  "questionnaire": {
    "id": "uuid",
    "month": 12,
    "year": 2024,
    "status": "closed",
    "title": "Questionário Dezembro 2024"
  },
  "message": "Questionário fechado automaticamente (dia 25 ou posterior)"
}
```

**Usage:**
```bash
GET /api/questionnaires/admin/current-status
```

**Note:** This endpoint should be called periodically (e.g., by a cron job or client-side polling) to trigger auto-closure. The endpoint will automatically close the questionnaire if conditions are met.

---

### 3. GET `/api/questionnaires/admin/stats`

**Purpose:** Get real-time statistics about questionnaire responses.

**Authorization:** Requires coordinator or gestor role.

**Query Parameters:**
- `month` (required) - Month number (1-12)
- `year` (required) - Year (e.g., 2024)

**Response:**
```json
{
  "month": 12,
  "year": 2024,
  "monthName": "Dezembro",
  "exists": true,
  "questionnaireId": "uuid",
  "status": "sent",
  "title": "Questionário Dezembro 2024",
  "totalActiveUsers": 50,
  "totalResponses": 35,
  "responseRate": 70.00,
  "responseRateFormatted": "70.00%",
  "pendingResponses": 15,
  "availableCount": 30,
  "unavailableCount": 5,
  "notRespondedCount": 15,
  "lastUpdated": "2024-12-10T10:00:00.000Z",
  "createdAt": "2024-12-01T10:00:00.000Z"
}
```

**Usage:**
```bash
GET /api/questionnaires/admin/stats?month=12&year=2024
```

---

## Implementation Details

### Status Flow

```
draft → sent (open) → closed
   ↓       ↑
deleted    (can reopen)
```

### Auto-Close Logic

The auto-close logic is implemented in the `/current-status` endpoint:

1. Checks if current day is >= 25
2. Checks if current hour is >= 23 (11 PM)
3. Finds questionnaire for current month/year
4. If questionnaire status is `sent` and conditions are met:
   - Updates status to `closed`
   - Returns `autoCloseTriggered: true`

### Statistics Calculation

The `/stats` endpoint provides real-time calculations:

- **totalActiveUsers**: Count of active ministers and coordinators
- **totalResponses**: Count of responses for the questionnaire
- **responseRate**: Percentage of responses (totalResponses / totalActiveUsers * 100)
- **availableCount**: Number of ministers who responded "available"
- **unavailableCount**: Number of ministers who responded "unavailable"
- **pendingResponses**: Number of users who haven't responded yet

---

## Integration with Frontend

### Opening a Questionnaire

```typescript
async function openQuestionnaire(month: number, year: number) {
  const response = await fetch('/api/questionnaires/admin/open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ month, year })
  });

  return response.json();
}
```

### Checking Auto-Close Status

```typescript
async function checkAutoCloseStatus() {
  const response = await fetch('/api/questionnaires/admin/current-status', {
    credentials: 'include'
  });

  return response.json();
}

// Poll every hour
setInterval(checkAutoCloseStatus, 60 * 60 * 1000);
```

### Getting Statistics

```typescript
async function getQuestionnaireStats(month: number, year: number) {
  const response = await fetch(
    `/api/questionnaires/admin/stats?month=${month}&year=${year}`,
    { credentials: 'include' }
  );

  return response.json();
}
```

---

## Existing Endpoints (Already Implemented)

The following endpoints were already available:

- `PATCH /api/questionnaires/admin/templates/:id/close` - Close a questionnaire
- `PATCH /api/questionnaires/admin/templates/:id/reopen` - Reopen a closed questionnaire
- `GET /api/questionnaires/admin/responses-status/:year/:month` - Get response status (similar to stats)
- `POST /api/questionnaires/admin/templates/:year/:month/send` - Send/resend questionnaire to ministers

---

## Security

All admin endpoints require:
1. **Authentication** - User must be logged in
2. **Authorization** - User must have `gestor` or `coordenador` role
3. **CSRF Protection** - All POST/PATCH/DELETE requests require valid CSRF token

---

## Database Schema

The questionnaire status is stored in the `questionnaires` table:

```sql
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  questions JSONB NOT NULL,
  deadline TIMESTAMP,
  created_by_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing

### Test Opening a Questionnaire

```bash
curl -X POST http://localhost:5000/api/questionnaires/admin/open \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -b "connect.sid=YOUR_SESSION_ID" \
  -d '{"month": 12, "year": 2024}'
```

### Test Auto-Close Status

```bash
curl http://localhost:5000/api/questionnaires/admin/current-status \
  -b "connect.sid=YOUR_SESSION_ID"
```

### Test Statistics

```bash
curl "http://localhost:5000/api/questionnaires/admin/stats?month=12&year=2024" \
  -b "connect.sid=YOUR_SESSION_ID"
```

---

## Notes

1. The auto-close logic runs **reactively** - it only triggers when the `/current-status` endpoint is called. For automatic scheduling, implement a cron job or periodic polling.

2. The `sent` status is used as the "open" state to maintain compatibility with existing code.

3. Response rate calculations exclude inactive and pending users.

4. The availability counts parse both old and new response formats for backwards compatibility.

## Created: January 2025
## Last Updated: January 2025
