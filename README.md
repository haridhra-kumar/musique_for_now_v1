# AudioCoach AI

AI-powered singing & instrument performance coach. Upload audio or video recordings and receive detailed, timestamped feedback with scores — like having a personal vocal coach.

## Architecture

```
Flutter/Web App → FastAPI (upload) → Cloudflare R2 (store) → Celery Queue
    → Audio Pipeline (13 stages) → PostgreSQL (save) → FastAPI (results) → App
```

### Audio Pipeline Stages

| Stage | Module | What It Does |
|-------|--------|-------------|
| 1 | `loader.py` | FFmpeg conversion, noise reduction, silence trimming |
| 2 | `quality.py` | SNR estimation, quality warning flag |
| 3 | `pitch.py` | CREPE + pYIN pitch detection with cross-validation |
| 4 | `key.py` | Krumhansl-Kessler key detection, octave shift |
| 5 | `rhythm.py` | librosa + madmom beat tracking, tempo curve |
| 6 | `scoring.py` | Confidence-weighted pitch/rhythm/tempo/stability scores |
| 7 | `timestamps.py` | Mistake mapping with trim offset, merge window |
| 8 | `feedback.py` | Beginner + musician mode feedback generation |
| 9 | `analyze.py` | Orchestrator — single `analyze(path) → JSON` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 · FastAPI · Celery · Redis |
| Database | PostgreSQL 16 · SQLAlchemy 2.0 · Alembic |
| Storage | Cloudflare R2 (S3-compatible) |
| Auth | JWT (PyJWT) · bcrypt |
| AI/Audio | CREPE · pYIN · librosa · noisereduce · madmom |
| Frontend | React 18 · TypeScript · Vite · TailwindCSS · Recharts |
| Infrastructure | Docker · GitHub Actions CI |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16
- Redis 7
- FFmpeg

### With Docker (recommended)

```bash
cp backend/.env.example backend/.env
docker compose up -d
```

The API is at `http://localhost:8000`, Swagger docs at `http://localhost:8000/docs`.

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # edit with your values

# Create database
createdb audiocoach
alembic upgrade head
python seed.py

# Run
uvicorn app.main:app --reload
```

**Celery worker:**
```bash
cd backend
celery -A tasks.celery_app worker --loglevel=info
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### API Documentation

Once running, visit `http://localhost:8000/docs` for interactive Swagger UI.

Key endpoints:
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `POST /api/analyze/upload` — Upload audio/video for analysis
- `GET /api/analyze/{job_id}/status` — Check processing status
- `GET /api/analyze/{job_id}/result` — Get full analysis results
- `GET /api/user/history` — Past analyses
- `GET /api/credits/packs` — Available credit packs

## Project Structure

```
audiocoach-ai/
├── backend/
│   ├── app/                    # FastAPI application
│   │   ├── api/                # Route handlers
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response
│   │   └── services/           # Business logic
│   ├── pipeline/               # Audio analysis engine
│   ├── tasks/                  # Celery background tasks
│   ├── tests/                  # pytest test suite
│   └── alembic/                # Database migrations
├── frontend/                   # React + Vite web app
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Credits System

| Plan | Credits | Price |
|------|---------|-------|
| Free Tier | 1/day | ₹0 |
| Starter Pack | 10 | ₹30 |
| Singer Pack | 50 | ₹99 |
| Pro Pack | 150 | ₹249 |

## Testing

```bash
cd backend
pytest tests/ -v
```

## Team

3-person pipeline split:
- **Person A**: Audio loading, noise reduction, quality (`loader.py`, `quality.py`)
- **Person B**: Pitch detection, key, octave shift (`pitch.py`, `key.py`)
- **Person C**: Scoring, timestamps, feedback, analyze (`scoring.py`, `timestamps.py`, `feedback.py`, `analyze.py`)
