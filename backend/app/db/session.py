from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import DATABASE_URL

# FIX: Added connection pooling, pre-ping checks, and recycled stale connections
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to False in production to avoid logging sensitive data & slow I/O
    pool_pre_ping=True,  # Automatically recovers dropped DB connections
    pool_size=10,  # Baseline connections to maintain
    max_overflow=20,  # Spikes allowed beyond pool_size
    pool_recycle=1800,  # Recycle connections older than 30 mins
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# Dependency used in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()  # FIX: Clean up dirty/failed transactions before closing
        raise
    finally:
        db.close()