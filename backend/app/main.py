import logging
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.db.database import Base, SessionLocal, engine
from app.models import User, Trip, ChecklistItem, ReadinessRecord
from app.routers import (
    auth,
    users,
    trips,
    checklist,
    intelligence,
    readiness,
    dashboard,
    reports,
    admin,
)
configure_logging()
logger = logging.getLogger("tripguard")
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    logger.info("Starting %s API", settings.app_name)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully")
    except SQLAlchemyError:
        logger.exception("Database initialization failed")
        raise
    yield
    logger.info("Shutting down %s API", settings.app_name)
    engine.dispose()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="TripGuard travel readiness and risk dashboard API",
    lifespan=lifespan,
)
# CORS configuration - frontend_url + local dev dono allowed hai
_allowed_origins = []
for _origin in [settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"]:
    if _origin and _origin not in _allowed_origins:
        _allowed_origins.append(_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
@app.middleware("http")
async def request_context(request: Request, call_next):
    incoming_id = request.headers.get("X-Request-ID")
    try:
        request_id = str(uuid.UUID(incoming_id)) if incoming_id else str(uuid.uuid4())
    except (ValueError, TypeError, AttributeError):
        request_id = str(uuid.uuid4())
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_id=%s method=%s path=%s status=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
        )
        return response
    except Exception:
        logger.exception(
            "request_id=%s method=%s path=%s unhandled_exception",
            request_id,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An unexpected error occurred",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )
@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "application": settings.app_name,
    }
@app.get("/health/database", tags=["Health"])
def database_health():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ok",
            "database": "connected",
        }
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "unavailable",
            },
        )
    finally:
        db.close()
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(trips.router, prefix=API_PREFIX)
app.include_router(checklist.router, prefix=API_PREFIX)
app.include_router(intelligence.router, prefix=API_PREFIX)
app.include_router(readiness.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)