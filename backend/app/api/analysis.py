from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
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
    MistakeOut,
    UploadResponse,
)
from ..services.credits import check_can_analyze, deduct_credit
from ..services.storage import save_upload

logger = logging.getLogger("audiocoach.api.analysis")
router = APIRouter(prefix="/analyze", tags=["analysis"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".mp4", ".mov", ".mkv", ".avi", ".webm",
                      ".m4a", ".aac", ".flac", ".ogg", ".m4v", ".wma"}


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    background_tasks: BackgroundTasks,
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
    await db.commit()

    # Queue Celery task if broker available; otherwise fallback to FastAPI BackgroundTasks
    dispatched = False
    try:
        from tasks.analyze_task import run_analysis
        run_analysis.delay(str(analysis.id), storage_key)
        dispatched = True
    except Exception as e:
        logger.warning("Celery unavailable (%s), running analysis via background task", e)

    if not dispatched:
        from tasks.analyze_task import run_analysis_background
        background_tasks.add_task(run_analysis_background, str(analysis.id), storage_key)

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

    if analysis.status == "completed":
        return AnalysisStatusResponse(
            job_id=analysis.id,
            status="completed",
            progress=100,
            stage="completed",
            message="Analysis complete",
        )
    elif analysis.status == "failed":
        err = analysis.error_message or "Analysis failed"
        return AnalysisStatusResponse(
            job_id=analysis.id,
            status="failed",
            progress=0,
            stage="failed",
            message=err,
            error=err,
        )
    elif analysis.status == "pending":
        return AnalysisStatusResponse(
            job_id=analysis.id,
            status="pending",
            progress=5,
            stage="queued",
            message="Queued for analysis...",
        )
    else:
        return AnalysisStatusResponse(
            job_id=analysis.id,
            status="processing",
            progress=50,
            stage="processing",
            message="Analyzing audio performance...",
        )



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
        feedback_beginner=analysis.feedback.beginner_text if analysis.feedback else "",
        feedback_musician=analysis.feedback.musician_text if analysis.feedback else "",
        pitch_data=rj.get("pitch_data", []),
        rhythm_data=rj.get("rhythm_data", {}),
        created_at=analysis.created_at,
    )
