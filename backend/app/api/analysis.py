from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models.analysis import Analysis
from ..models.user import User
from ..schemas.analysis import (
    AnalysisResultResponse,
    AnalysisStatusResponse,
    ExerciseOut,
    MistakeOut,
    UploadResponse,
)
from ..services.credits import check_can_analyze, deduct_credit
from ..services.storage import save_upload

router = APIRouter(prefix="/analyze", tags=["analysis"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".mp4", ".mov", ".mkv", ".avi", ".webm",
                      ".m4a", ".aac", ".flac", ".ogg", ".m4v", ".wma"}


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    can = await check_can_analyze(db, user)
    if not can:
        raise HTTPException(status_code=402, detail="No credits remaining")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.max_file_size_mb}MB)")

    storage_key, file_url = await save_upload(content, file.filename)

    analysis = Analysis(
        user_id=user.id,
        file_url=file_url,
        file_name=file.filename,
        status="processing",
    )
    db.add(analysis)
    await db.flush()

    await deduct_credit(db, user)

    # Queue Celery task
    try:
        from tasks.analyze_task import run_analysis
        run_analysis.delay(str(analysis.id), storage_key)
    except Exception:
        analysis.status = "pending"
        await db.flush()

    return UploadResponse(job_id=analysis.id)


@router.get("/{job_id}/status", response_model=AnalysisStatusResponse)
async def get_status(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analysis).where(Analysis.id == job_id, Analysis.user_id == user.id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    progress = 100 if analysis.status == "completed" else (0 if analysis.status == "failed" else 50)
    return AnalysisStatusResponse(job_id=analysis.id, status=analysis.status, progress=progress)


@router.get("/{job_id}/result", response_model=AnalysisResultResponse)
async def get_result(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Analysis).where(Analysis.id == job_id, Analysis.user_id == user.id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis.status != "completed":
        raise HTTPException(status_code=400, detail=f"Analysis status: {analysis.status}")

    rj = analysis.result_json or {}

    mistakes = [
        MistakeOut(**m) for m in rj.get("mistakes", [])
    ]
    exercises = [
        ExerciseOut(**e) for e in rj.get("exercises", [])
    ]

    return AnalysisResultResponse(
        id=analysis.id,
        file_name=analysis.file_name,
        overall_score=analysis.overall_score or 0,
        pitch_score=analysis.pitch_score or 0,
        rhythm_score=analysis.rhythm_score or 0,
        tempo_score=analysis.tempo_score or 0,
        vocal_stability_score=analysis.vocal_stability_score or 0,
        key_detected=analysis.key_detected,
        octave_shift=analysis.octave_shift,
        tempo_bpm=analysis.tempo_bpm,
        quality_warning=analysis.quality_warning,
        snr_db=analysis.snr_db,
        duration_seconds=analysis.duration_seconds,
        processing_time_seconds=analysis.processing_time_seconds,
        mistakes=mistakes,
        exercises=exercises,
        feedback_beginner=analysis.feedback.beginner_text if analysis.feedback else "",
        feedback_musician=analysis.feedback.musician_text if analysis.feedback else "",
        pitch_data=rj.get("pitch_data", []),
        rhythm_data=rj.get("rhythm_data", {}),
        created_at=analysis.created_at,
    )