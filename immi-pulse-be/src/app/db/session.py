from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.async_database_url,
    future=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
    pool_pre_ping=settings.db_pool_pre_ping,
    echo=settings.environment == "development" and settings.log_level == "DEBUG",
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async_session_factory = AsyncSessionLocal


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for background tasks outside FastAPI request lifecycle."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for request-scoped DB sessions."""
    async with AsyncSessionLocal() as session:
        yield session
