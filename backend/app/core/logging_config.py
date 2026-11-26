import json
import logging
import os
import sys
from datetime import datetime, timezone


class UTCFormatter(logging.Formatter):
    """Format log timestamps in UTC."""

    converter = lambda self, timestamp: datetime.fromtimestamp(
        timestamp, timezone.utc
    ).timetuple()


class StructuredFormatter(UTCFormatter):
    """Generate structured JSON logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(
                record.created, timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        request_id = getattr(record, "request_id", None)
        if request_id:
            log_data["request_id"] = request_id

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def configure_logging() -> None:
    """Configure application-wide structured logging."""

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    if log_level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
        log_level = "INFO"

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate log handlers during reloads.
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(log_level)
    logging.getLogger("uvicorn.error").setLevel(log_level)
