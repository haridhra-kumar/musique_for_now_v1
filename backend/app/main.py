from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import pipeline.numpy_compat  # noqa: F401

from .api.router import api_router
from .config import get_settings
from .database import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AudioCoach AI",
    description="AI-powered singing & instrument performance coach",
    version="1.0.0",
    lifespan=lifespan,
)

origins = settings.cors_origin_list
allow_credentials = True
allow_origin_regex = settings.cors_origin_regex or None

if "*" in origins:
    # Starlette raises an error if allow_origins has '*' when allow_credentials is True
    # Using a catch-all regex preserves credentials support for all origins
    allow_origins = []
    allow_origin_regex = r"^https?://.*"
else:
    allow_origins = origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if os.path.isdir(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
