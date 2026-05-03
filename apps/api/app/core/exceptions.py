from typing import Any


class AppException(Exception):
    """Base exception — all domain errors inherit from this."""

    code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


class NotFoundException(AppException):
    code = "NOT_FOUND"
    status_code = 404

    def __init__(self, resource: str, resource_id: str) -> None:
        super().__init__(
            message=f'{resource} with id "{resource_id}" was not found',
            details={"resource": resource, "id": resource_id},
        )


class ValidationException(AppException):
    code = "VALIDATION_ERROR"
    status_code = 422


class ProcessingException(AppException):
    code = "PROCESSING_ERROR"
    status_code = 422

    def __init__(self, document_id: str, reason: str) -> None:
        super().__init__(
            message=f"Failed to process document: {reason}",
            details={"document_id": document_id, "reason": reason},
        )


class UnsupportedFileTypeException(AppException):
    code = "UNSUPPORTED_FILE_TYPE"
    status_code = 415

    def __init__(self, received: str, supported: list[str]) -> None:
        super().__init__(
            message=f'File type "{received}" is not supported',
            details={"received": received, "supported": supported},
        )


class NoKnowledgeBaseException(AppException):
    code = "NO_KNOWLEDGE_BASE"
    status_code = 400

    def __init__(self) -> None:
        super().__init__(message="Session has no knowledge base attached")


class OllamaUnavailableException(AppException):
    code = "OLLAMA_UNAVAILABLE"
    status_code = 503

    def __init__(self) -> None:
        super().__init__(message="Ollama service is unavailable. Ensure `ollama serve` is running.")
