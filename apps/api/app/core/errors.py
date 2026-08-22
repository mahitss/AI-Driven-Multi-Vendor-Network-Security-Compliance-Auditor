"""
NetVigil Error Handling & Custom Exceptions
Provides clean, structured API error responses without leaking internal paths or secrets.
"""
from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class NetVigilException(Exception):
    """Base exception for all NetVigil domain errors."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class ConfigurationUploadError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="CONFIGURATION_UPLOAD_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class InvalidFileTypeError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="INVALID_FILE_TYPE",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class FileSizeExceededError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="FILE_SIZE_EXCEEDED",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            details=details,
        )


class ResourceNotFoundError(NetVigilException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found.",
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class NotFoundError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class VendorDetectionError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="VENDOR_DETECTION_FAILED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ValidationError(NetVigilException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


def format_error_response(
    code: str,
    message: str,
    request_id: Optional[str] = None,
    details: Optional[Any] = None,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
) -> JSONResponse:
    content = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id or "unknown",
        }
    }
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=content)


async def netvigil_exception_handler(request: Request, exc: NetVigilException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return format_error_response(
        code=exc.code,
        message=exc.message,
        request_id=request_id,
        details=exc.details,
        status_code=exc.status_code,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    sanitized_errors = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", [])])
        sanitized_errors.append({"field": loc, "issue": err.get("msg")})

    return format_error_response(
        code="VALIDATION_ERROR",
        message="The request payload validation failed.",
        request_id=request_id,
        details=sanitized_errors,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return format_error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected internal server error occurred.",
        request_id=request_id,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
