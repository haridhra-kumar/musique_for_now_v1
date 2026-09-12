"""
File storage service: local filesystem for development, S3/R2 for production.
"""
from __future__ import annotations

import os
import uuid

import aiofiles

from ..config import get_settings

settings = get_settings()


def _get_s3_client():
    import boto3
    from botocore.config import Config

    if not settings.s3_access_key or not settings.s3_secret_key:
        raise ValueError(
            "S3 storage is enabled but S3_ACCESS_KEY or S3_SECRET_KEY is not configured."
        )

    region = settings.s3_region
    # If AWS S3 (no custom endpoint) and region is "auto", default to "us-east-1"
    if not settings.s3_endpoint_url and region == "auto":
        region = "us-east-1"

    s3_config = Config(
        signature_version="s3v4",
        retries={"max_attempts": 3, "mode": "standard"},
    )

    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=region or None,
        config=s3_config,
    )


async def save_upload(file_content: bytes, original_filename: str) -> tuple[str, str]:
    """Returns (storage_key, file_url)."""
    ext = os.path.splitext(original_filename)[1].lower()
    key = f"{uuid.uuid4().hex}{ext}"

    if settings.is_s3_storage:
        return await _save_s3(key, file_content)

    return await _save_local(key, file_content)


async def get_file_path(storage_key: str) -> str:
    """Returns the local file path for pipeline processing."""
    path, _ = await get_file_path_info(storage_key)
    return path


async def get_file_path_info(storage_key: str) -> tuple[str, bool]:
    """Returns (file_path, is_temporary) so temporary downloads can be cleaned up."""
    if settings.is_s3_storage:
        tmp_path = await _download_s3(storage_key)
        return tmp_path, True
    return os.path.join(settings.upload_dir, storage_key), False


async def _save_local(key: str, content: bytes) -> tuple[str, str]:
    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, key)
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)
    return key, f"/uploads/{key}"


async def _save_s3(key: str, content: bytes) -> tuple[str, str]:
    s3 = _get_s3_client()
    s3.put_object(Bucket=settings.s3_bucket, Key=key, Body=content)
    if settings.s3_endpoint_url:
        url = f"{settings.s3_endpoint_url.rstrip('/')}/{settings.s3_bucket}/{key}"
    else:
        url = f"https://{settings.s3_bucket}.s3.amazonaws.com/{key}"
    return key, url


async def _download_s3(key: str) -> str:
    import tempfile
    s3 = _get_s3_client()
    ext = os.path.splitext(key)[1]
    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    s3.download_file(settings.s3_bucket, key, tmp_path)
    return tmp_path
