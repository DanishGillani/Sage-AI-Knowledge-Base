import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.knowledge_base import KnowledgeBaseModel


class FileType(str, enum.Enum):
    PDF = "PDF"
    DOC = "DOC"
    DOCX = "DOCX"
    TXT = "TXT"
    MD = "MD"
    XLSX = "XLSX"
    XLS = "XLS"
    CSV = "CSV"
    JPG = "JPG"
    JPEG = "JPEG"
    PNG = "PNG"
    GIF = "GIF"
    WEBP = "WEBP"
    MP4 = "MP4"
    MOV = "MOV"
    AVI = "AVI"
    MKV = "MKV"


class ProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class DocumentModel(Base):
    """
    Mirrors the Prisma `documents` table.
    Prisma owns the schema; SQLAlchemy reads rows and updates status during ingestion.
    """

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    knowledge_base_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    # create_type=False — Prisma already created the enum in PostgreSQL
    file_type: Mapped[FileType] = mapped_column(
        SAEnum(FileType, name="FileType", create_type=False), nullable=False
    )
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[ProcessingStatus] = mapped_column(
        SAEnum(ProcessingStatus, name="ProcessingStatus", create_type=False),
        nullable=False,
        default=ProcessingStatus.PENDING,
    )
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    knowledge_base: Mapped["KnowledgeBaseModel"] = relationship(
        "KnowledgeBaseModel",
        back_populates="documents",
    )

    def __repr__(self) -> str:
        return f"DocumentModel(id={self.id!r}, filename={self.filename!r}, status={self.status!r})"
