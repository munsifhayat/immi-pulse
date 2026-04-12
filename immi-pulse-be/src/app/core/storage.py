"""
Document storage — S3 with a local filesystem fallback for dev.

Uploads live under keys of the form `cases/<case_id>/<uuid>-<filename>` so
every file ties back to its parent case and collisions are impossible.
"""

import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class StoredFile:
    key: str
    size: int
    content_type: str | None


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name  # strip any path components
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name) or "file"


def _build_key(case_id: str, filename: str) -> str:
    clean = _sanitize_filename(filename)
    return f"cases/{case_id}/{uuid.uuid4().hex}-{clean}"


class LocalStorage:
    """Dev fallback: writes files under settings.local_upload_dir."""

    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _abs(self, key: str) -> Path:
        return self.root / key

    def upload(self, key: str, data: bytes, content_type: str | None) -> StoredFile:
        target = self._abs(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return StoredFile(key=key, size=len(data), content_type=content_type)

    def presigned_url(self, key: str, expires_in: int = 300) -> str:
        # Local dev only — hand back a file:// URL for quick manual verification.
        return self._abs(key).resolve().as_uri()

    def delete(self, key: str) -> None:
        target = self._abs(key)
        if target.exists():
            target.unlink()


class S3Storage:
    def __init__(self, bucket: str, region: str):
        import boto3

        self.bucket = bucket
        self.region = region
        self._client = boto3.client("s3", region_name=region)

    def upload(self, key: str, data: bytes, content_type: str | None) -> StoredFile:
        extra = {"ContentType": content_type} if content_type else {}
        self._client.put_object(Bucket=self.bucket, Key=key, Body=data, **extra)
        return StoredFile(key=key, size=len(data), content_type=content_type)

    def presigned_url(self, key: str, expires_in: int = 300) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self.bucket, Key=key)


_storage_singleton: LocalStorage | S3Storage | None = None


def get_storage() -> LocalStorage | S3Storage:
    global _storage_singleton
    if _storage_singleton is not None:
        return _storage_singleton

    settings = get_settings()
    if settings.aws_s3_bucket:
        region = settings.aws_s3_region or settings.aws_region
        _storage_singleton = S3Storage(bucket=settings.aws_s3_bucket, region=region)
        logger.info(f"Storage: S3 bucket={settings.aws_s3_bucket} region={region}")
    else:
        root = Path(settings.local_upload_dir).resolve()
        _storage_singleton = LocalStorage(root=root)
        logger.info(f"Storage: local filesystem at {root}")
    return _storage_singleton


def upload_case_document(
    case_id: str,
    filename: str,
    data: bytes | BinaryIO,
    content_type: str | None = None,
) -> StoredFile:
    if not isinstance(data, (bytes, bytearray)):
        data = data.read()
    key = _build_key(case_id, filename)
    return get_storage().upload(key, data, content_type)


def presigned_download_url(key: str, expires_in: int = 300) -> str:
    return get_storage().presigned_url(key, expires_in)


def delete_case_document(key: str) -> None:
    get_storage().delete(key)


def _reset_for_tests() -> None:
    """Used by tests to swap storage backends."""
    global _storage_singleton
    _storage_singleton = None
