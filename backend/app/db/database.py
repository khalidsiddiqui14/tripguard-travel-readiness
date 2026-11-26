from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


# Database configuration
DATABASE_URL = settings.database_url

is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = (
    {"check_same_thread": False, "timeout": 30}
    if is_sqlite
    else {}
)

engine_options = {
    "pool_pre_ping": True,
}

# SQLite uses a different pool configuration from PostgreSQL.
if is_sqlite:
    engine_options["connect_args"] = connect_args
else:
    engine_options.update(
        {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
        }
    )

engine = create_engine(
    DATABASE_URL,
    **engine_options,
)


# Database session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


# SQLAlchemy declarative base
class Base(DeclarativeBase):
    pass


# FastAPI database dependency
def get_db():
    db = SessionLocal()

    try:
        yield db

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
