import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "new@example.com",
        "name": "New User",
        "password": "pass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@example.com"
    assert data["user"]["credits"] == 5


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    body = {"email": "dup@example.com", "name": "User", "password": "pass123"}
    await client.post("/api/auth/register", json=body)
    resp = await client.post("/api/auth/register", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "login@example.com", "name": "Login User", "password": "pass123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "pass123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "wrong@example.com", "name": "User", "password": "pass123"
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "wrong"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(auth_client: AsyncClient):
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_history_empty(auth_client: AsyncClient):
    resp = await auth_client.get("/api/user/history")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_credit_packs(client: AsyncClient):
    resp = await client.get("/api/credits/packs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_upload_and_status_flow(auth_client: AsyncClient, monkeypatch):
    """Test full upload -> processing -> completed flow with mocked pipeline."""
    from unittest.mock import MagicMock


    mock_result = {
        "overall_score": 88,
        "pitch_score": 85,
        "rhythm_score": 90,
        "tempo_score": 89,
        "vocal_stability_score": 87,
        "key_detected": "C major",
        "octave_shift": 0,
        "tempo_bpm": 120.0,
        "quality_warning": False,
        "snr_db": 25.0,
        "duration_seconds": 15.5,
        "processing_time_seconds": 1.2,
        "mistakes": [
            {
                "time_seconds": 2.5,
                "type": "pitch",
                "severity": "mild",
                "description": "Slightly sharp on C4",
                "confidence": 0.8,
                "timestamp": "0:02",
            }
        ],
        "feedback_beginner": "Great pitch control!",
        "feedback_musician": "Minor intonation drift around bar 2.",
        "pitch_data": [{"time": 0.0, "freq": 261.63, "confidence": 0.9, "note": "C4"}],
        "rhythm_data": {"tempo": 120.0, "beat_count": 30, "beat_confidence": 0.95, "tempo_curve": []},
    }

    # Intercept pipeline analyze call
    monkeypatch.setattr("pipeline.analyze", MagicMock(return_value=mock_result))

    # Mock Celery delay to force background task fallback or direct execution
    from tasks.analyze_task import run_analysis
    def mock_delay(*args, **kwargs):
        raise ConnectionError("Simulated broker unreachable to test fallback")
    monkeypatch.setattr(run_analysis, "delay", mock_delay)

    # 1. Upload audio file
    dummy_wav = b"RIFF" + b"\x00" * 36 + b"WAVEfmt " + b"\x00" * 20 + b"data" + b"\x00" * 100
    files = {"file": ("test.wav", dummy_wav, "audio/wav")}
    resp = await auth_client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]
    assert job_id

    # 2. Status should be completed (FastAPI background task ran synchronously in test or finished)
    resp = await auth_client.get(f"/api/analyze/{job_id}/status")
    assert resp.status_code == 200
    status_data = resp.json()
    assert status_data["status"] == "completed"
    assert status_data["progress"] == 100
    assert status_data["message"] == "Analysis complete"

    # 3. Result endpoint returns detailed scores and feedback
    resp = await auth_client.get(f"/api/analyze/{job_id}/result")
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["overall_score"] == 88
    assert res_data["pitch_score"] == 85
    assert res_data["key_detected"] == "C major"
    assert len(res_data["mistakes"]) == 1


@pytest.mark.asyncio
async def test_upload_failure_saves_real_error(auth_client: AsyncClient, monkeypatch):
    """Test that when processing fails, the real error message is saved and returned via /status."""

    # Pipeline throws a realistic error
    def mock_broken_analyze(path):
        raise RuntimeError("Corrupt audio file header: unable to decode audio packets")

    monkeypatch.setattr("pipeline.analyze", mock_broken_analyze)

    from tasks.analyze_task import run_analysis
    def mock_delay(*args, **kwargs):
        raise ConnectionError("Simulated broker unreachable")
    monkeypatch.setattr(run_analysis, "delay", mock_delay)

    dummy_wav = b"RIFF" + b"\x00" * 40
    files = {"file": ("corrupt.wav", dummy_wav, "audio/wav")}
    resp = await auth_client.post("/api/analyze/upload", files=files)
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]

    # Poll status: must be "failed" and include the real error message instead of being stuck
    resp = await auth_client.get(f"/api/analyze/{job_id}/status")
    assert resp.status_code == 200
    status_data = resp.json()
    assert status_data["status"] == "failed"
    assert "Corrupt audio file header" in status_data["message"]
    assert status_data["error"] == status_data["message"]


@pytest.mark.asyncio
async def test_cors_vercel_origin(client: AsyncClient):
    """Test that requests with Vercel origin headers receive CORS allow headers."""
    resp = await client.options(
        "/api/auth/login",
        headers={
            "Origin": "https://audiocoach-preview-123.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type,Authorization",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://audiocoach-preview-123.vercel.app"
    assert resp.headers.get("access-control-allow-credentials") == "true"


def test_upstash_redis_normalization():
    """Verify Upstash Redis URLs are normalized to database 0."""
    from app.config import Settings
    s = Settings(
        redis_url="rediss://default:secret@us1-test-12345.upstash.io:6379/1",
        celery_broker_url="rediss://default:secret@us1-test-12345.upstash.io:6379/2",
    )
    assert s.effective_celery_broker_url == "rediss://default:secret@us1-test-12345.upstash.io:6379/0"
    assert s.effective_celery_result_backend == "rediss://default:secret@us1-test-12345.upstash.io:6379/0"

