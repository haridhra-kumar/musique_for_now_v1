"""
File storage service: local filesystem for development, S3/R2 for production.
"""
from __future__ import annotations

import os
import uuid

import aiofiles

from ..config import get_settings

settings = get_settings()


async def save_upload(file_content: bytes, original_filename: str) -> tuple[str, str]:
    """Returns (storage_key, file_url)."""
    ext = os.path.splitext(original_filename)[1].lower()
    key = f"{uuid.uuid4().hex}{ext}"

    if settings.storage_backend == "s3":
        return await _save_s3(key, file_content)

    return await _save_local(key, file_content)


async def get_file_path(storage_key: str) -> str:
    """Returns the local file path for pipeline processing."""
    if settings.storage_backend == "s3":
        return await _download_s3(storage_key)
    return os.path.join(settings.upload_dir, storage_key)


async def _save_local(key: str, content: bytes) -> tuple[str, str]:
    os.makedirs(settings.upload_dir, exist_ok=True)
    path = os.path.join(settings.upload_dir, key)
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)
    return key, f"/uploads/{key}"


async def _save_s3(key: str, content: bytes) -> tuple[str, str]:
    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )
    s3.put_object(Bucket=settings.s3_bucket, Key=key, Body=content)
    url = f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{key}"
    return key, url


async def _download_s3(key: str) -> str:
    import tempfile

    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )
    ext = os.path.splitext(key)[1]
    fd, tmp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    s3.download_file(settings.s3_bucket, key, tmp_path)
    return tmp_path
