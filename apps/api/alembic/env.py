import asyncio
from logging.config import fileConfig

import alembic.context as context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.core.database import Base

# Import all models so Alembic can detect them
import app.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Only the chunks table — Prisma manages knowledge_bases, documents, sessions, messages
target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection — outputs SQL to stdout."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Only manage tables Alembic owns — exclude Prisma-managed tables
        include_name=lambda name, type_, _: name in ("chunks",) if type_ == "table" else True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: object) -> None:
    context.configure(
        connection=connection,  # type: ignore[arg-type]
        target_metadata=target_metadata,
        include_name=lambda name, type_, _: name in ("chunks",) if type_ == "table" else True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    engine = create_async_engine(get_url())
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
