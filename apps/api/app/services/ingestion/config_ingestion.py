"""
NetVigil Configuration Ingestion Service
Handles file security validation, SHA-256 cryptographic hashing, isolated disk persistence,
automatic vendor detection, and database registration.
"""
from pathlib import Path
from typing import Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.errors import ConfigurationUploadError
from app.core.logging import logger
from app.core.security import compute_sha256, validate_file_metadata, validate_configuration_content
from app.models.configuration import Configuration
from app.services.parsing.vendor_detector import VendorDetector


class ConfigurationIngestionService:
    @classmethod
    async def ingest_file(
        cls,
        filename: str,
        content_bytes: bytes,
        db: AsyncSession,
        user_id: str = "default_tenant",
    ) -> Configuration:
        """
        Processes an uploaded raw network configuration file:
        1. Validates file metadata and rejects executable/binary content.
        2. Computes SHA-256 cryptographic hash.
        3. Checks for duplicate hash for the specific authenticated user.
        4. Saves sanitized file safely into storage path with traversal protection.
        5. Executes deterministic vendor detection.
        6. Persists Configuration record in database with tenant isolation.
        """
        # Step 1: Validate file name, size, and content safety
        sanitized_filename, ext = validate_file_metadata(filename, len(content_bytes))
        validate_configuration_content(content_bytes, filename=sanitized_filename)

        # Validate decode to UTF-8 text (with fallback to latin-1 for legacy devices)
        try:
            raw_text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                raw_text = content_bytes.decode("latin-1")
            except Exception as e:
                raise ConfigurationUploadError(
                    message="Uploaded configuration file is not valid readable text.",
                    details={"error": str(e)},
                )

        if not raw_text.strip():
            raise ConfigurationUploadError(
                message="Uploaded configuration file is empty.",
                details={"filename": filename},
            )

        # Step 2: Calculate SHA-256 digest
        content_hash = compute_sha256(content_bytes)

        # Step 3: Determine storage path (named by user_id + hash + extension to avoid collision)
        storage_dir = settings.resolved_storage_path
        storage_file_name = f"{user_id[:8]}_{content_hash[:16]}_{sanitized_filename}"
        target_path = (storage_dir / storage_file_name).resolve()

        # Strict Storage Root Containment Check
        if not str(target_path).startswith(str(storage_dir)):
            raise ConfigurationUploadError(
                message="Unsafe storage path traversal detected.",
                details={"filename": sanitized_filename},
            )

        # Write to disk safely
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "wb") as f:
                f.write(content_bytes)
        except Exception as e:
            logger.warning(
                f"Local storage disk write notice: {e}. Raw content will be durably persisted to database."
            )

        # Step 4: Execute Deterministic Vendor Detection
        detection_result = VendorDetector.detect(raw_text, filename=sanitized_filename)

        # Step 5: Check if existing configuration for this user with identical hash exists
        stmt = select(Configuration).where(Configuration.user_id == user_id, Configuration.hash == content_hash)
        result = await db.execute(stmt)
        existing_config = result.scalars().first()

        if existing_config:
            logger.info(f"User {user_id} configuration with hash {content_hash} already exists (ID: {existing_config.id}).")
            return existing_config

        # Step 6: Create database record with user_id tenant isolation
        config_record = Configuration(
            user_id=user_id,
            filename=storage_file_name,
            original_filename=sanitized_filename,
            storage_path=str(target_path),
            file_size_bytes=len(content_bytes),
            hash=content_hash,
            raw_content=raw_text,
            detected_vendor=detection_result.vendor,
            detected_platform=detection_result.platform,
            detection_confidence=detection_result.confidence,
            detection_method=detection_result.method,
            detection_details={
                "patterns": detection_result.detected_patterns,
                "matches": detection_result.details,
            },
            parser_status="pending",
        )

        try:
            db.add(config_record)
            await db.commit()
            await db.refresh(config_record)
        except IntegrityError:
            await db.rollback()
            stmt = select(Configuration).where(Configuration.user_id == user_id, Configuration.hash == content_hash)
            result = await db.execute(stmt)
            existing_after_race = result.scalars().first()
            if existing_after_race:
                return existing_after_race
            raise

        logger.info(
            f"Ingested configuration {config_record.id} ({sanitized_filename}) for user {user_id} -> Vendor: {detection_result.vendor} (Confidence: {detection_result.confidence})"
        )
        return config_record
