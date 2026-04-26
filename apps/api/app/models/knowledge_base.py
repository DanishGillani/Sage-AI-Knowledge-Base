from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import DocumentModel


class KnowledgeBaseModel(Base):
    """
    Mirrors the Prisma `knowledge_bases` table.
    Prisma owns the schema and migrations for this table;
    SQLAlchemy only reads and writes rows.
    """

    __tablename__ = "knowledge_bases"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationship — used for cascade-aware queries in the API service
    documents: Mapped[list["DocumentModel"]] = relationship(
        "DocumentModel",
        back_populates="knowledge_base",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"KnowledgeBaseModel(id={self.id!r}, name={self.name!r})"
