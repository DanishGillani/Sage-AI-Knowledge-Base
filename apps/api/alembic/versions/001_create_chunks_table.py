"""create chunks table

Revision ID: 001
Revises:
Create Date: 2026-04-24

Alembic owns ONLY this table. knowledge_bases, documents, sessions,
and messages are managed by Prisma migrations in packages/db.
"""

import sqlalchemy as sa

import alembic.op as op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pgvector extension is enabled by infra/init.sql on container start
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "chunks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "document_id",
            sa.String(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "knowledge_base_id",
            sa.String(),
            sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Add the vector column with proper pgvector DDL — SQLAlchemy doesn't know this type
    op.execute("ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector(768)")

    # HNSW index — faster approximate nearest-neighbour search than IVFFlat
    # cosine distance matches nomic-embed-text's training objective
    op.execute(
        "CREATE INDEX chunks_embedding_hnsw_idx ON chunks USING hnsw (embedding vector_cosine_ops)"
    )

    # Composite index for scoped similarity searches (knowledge_base_id + embedding)
    op.create_index("chunks_knowledge_base_id_idx", "chunks", ["knowledge_base_id"])
    op.create_index("chunks_document_id_idx", "chunks", ["document_id"])


def downgrade() -> None:
    op.drop_table("chunks")
