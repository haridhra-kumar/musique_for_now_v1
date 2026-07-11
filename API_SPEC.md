# AudioCoach AI — API Specification

Base URL: `http://localhost:8000/api`

## Authentication

All authenticated endpoints require: `Authorization: Bearer <token>`

### POST /auth/register

Create a new account. Grants 5 bonus credits on signup.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepass123"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "credits": 5,
    "plan_type": "free",
    "created_at": "2026-07-11T00:00:00Z"
  }
}
```

### POST /auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response (200):** Same shape as register.

### GET /auth/me

Returns the current user's profile.

---

## Analysis

### POST /analyze/upload

Upload an audio or video file for analysis. Deducts 1 credit.

**Request:** `multipart/form-data` with field `file`

Supported formats: MP3, WAV, MP4, MOV, MKV, AVI, WEBM, M4A, AAC, FLAC, OGG, WMA

Max size: 200 MB

**Response (202):**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "message": "Analysis started"
}
```

### GET /analyze/{job_id}/status

Poll for analysis progress.

**Response:**
```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": 50
}
```

Status values: `processing`, `completed`, `failed`

### GET /analyze/{job_id}/result

Full analysis results (only available when status = completed).

**Response:**
```json
{
  "id": "uuid",
  "file_name": "song.mp3",
  "overall_score": 78,
  "pitch_score": 82,
  "rhythm_score": 74,
  "tempo_score": 85,
  "vocal_stability_score": 71,
  "key_detected": "A minor",
  "octave_shift": 0,
  "tempo_bpm": 120.5,
  "quality_warning": false,
  "snr_db": 24.5,
  "duration_seconds": 180.0,
  "processing_time_seconds": 12.3,
  "mistakes": [
    {
      "timestamp": "0:42",
      "time_seconds": 42.3,
      "type": "pitch",
      "severity": "medium",
      "description": "Pitch slightly off — try adjusting your intonation here",
      "confidence": 0.78
    }
  ],
  "feedback_beginner": "Nice work! Your singing is solid...",
  "feedback_musician": "Overall: 78/100 | Pitch: 82/100...",
  "pitch_data": [
    {"time": 0.0, "freq": 440.0, "confidence": 0.92, "note": "A4"}
  ],
  "rhythm_data": {
    "tempo": 120.5,
    "beat_count": 240,
    "beat_confidence": 0.85,
    "tempo_curve": [{"time": 0.5, "bpm": 121.0}]
  },
  "created_at": "2026-07-11T00:00:00Z"
}
```

---

## User

### GET /user/history

Returns the user's past analyses (max 50, newest first).

**Response:**
```json
[
  {
    "id": "uuid",
    "file_name": "song.mp3",
    "overall_score": 78,
    "pitch_score": 82,
    "rhythm_score": 74,
    "tempo_score": 85,
    "duration_seconds": 180.0,
    "created_at": "2026-07-11T00:00:00Z"
  }
]
```

### GET /user/progress

Weekly progress aggregates (max 12 weeks).

**Response:**
```json
[
  {
    "week_start": "2026-07-07T00:00:00Z",
    "avg_pitch": 75.5,
    "avg_rhythm": 68.0,
    "avg_tempo": 80.0,
    "avg_overall": 74.5,
    "analyses_count": 5
  }
]
```

---

## Credits

### GET /credits/packs

List available credit packs.

**Response:**
```json
[
  {"id": "uuid", "name": "Starter Pack", "credits": 10, "price_inr": 30},
  {"id": "uuid", "name": "Singer Pack", "credits": 50, "price_inr": 99},
  {"id": "uuid", "name": "Pro Pack", "credits": 150, "price_inr": 249}
]
```

### POST /credits/purchase

Purchase a credit pack.

**Request:**
```json
{
  "pack_id": "uuid",
  "payment_id": "razorpay_payment_id"
}
```

**Response:**
```json
{
  "new_balance": 15,
  "credits_added": 10
}
```

---

## Error Responses

All errors follow:
```json
{
  "detail": "Error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Not authenticated / wrong credentials |
| 402 | No credits remaining |
| 404 | Resource not found |
| 409 | Conflict (duplicate email) |
| 413 | File too large |
