import io
from abc import ABC, abstractmethod
from dataclasses import dataclass

import structlog

from app.core.exceptions import UnsupportedFileTypeException
from app.models.document import FileType

logger = structlog.get_logger()


@dataclass
class ExtractedPage:
    text: str
    page_number: int | None


class BaseExtractor(ABC):
    @abstractmethod
    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]: ...


class PDFExtractor(BaseExtractor):
    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import pdfplumber

        pages: list[ExtractedPage] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if len(text.strip()) < 20:
                    logger.warning("pdf_sparse_text_page", page=i, filename=filename)
                pages.append(ExtractedPage(text=text, page_number=i))
        return pages


class DocxExtractor(BaseExtractor):
    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        from docx import Document

        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return [ExtractedPage(text=text, page_number=None)]


class TextExtractor(BaseExtractor):
    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        text = file_bytes.decode("utf-8", errors="replace")
        return [ExtractedPage(text=text, page_number=None)]


class SpreadsheetExtractor(BaseExtractor):
    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import pandas as pd

        ext = filename.rsplit(".", 1)[-1].lower()
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
        text = df.to_string(index=False)
        return [ExtractedPage(text=text, page_number=None)]


class ImageExtractor(BaseExtractor):
    """OCR via the configured vision model (Ollama qwen2.5-vl or similar)."""

    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import base64

        from langchain_core.messages import HumanMessage

        from app.core.llm import get_vision_model

        ext = filename.rsplit(".", 1)[-1].lower()
        mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "gif": "gif", "webp": "webp"}
        mime_subtype = mime_map.get(ext, "jpeg")
        b64 = base64.b64encode(file_bytes).decode()

        vision_model = get_vision_model()
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Extract all text content from this image. "
                        "Return only the extracted text, nothing else."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/{mime_subtype};base64,{b64}"},
                },
            ]
        )
        response = await vision_model.ainvoke([message])
        return [ExtractedPage(text=str(response.content), page_number=None)]


class VideoExtractor(BaseExtractor):
    """Transcribes audio from video using faster-whisper (CPU, int8)."""

    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import asyncio
        import os
        import tempfile

        ext = filename.rsplit(".", 1)[-1].lower()
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(None, self._transcribe, tmp_path)
            return [ExtractedPage(text=text, page_number=None)]
        finally:
            os.unlink(tmp_path)

    @staticmethod
    def _transcribe(path: str) -> str:
        from faster_whisper import WhisperModel

        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _ = model.transcribe(path)
        return " ".join(seg.text.strip() for seg in segments if seg.text.strip())


def get_extractor(file_type: str) -> BaseExtractor:
    match file_type.upper():
        case "PDF":
            return PDFExtractor()
        case "DOC" | "DOCX":
            return DocxExtractor()
        case "TXT" | "MD":
            return TextExtractor()
        case "XLSX" | "XLS" | "CSV":
            return SpreadsheetExtractor()
        case "JPG" | "JPEG" | "PNG" | "GIF" | "WEBP":
            return ImageExtractor()
        case "MP4" | "MOV" | "AVI" | "MKV":
            return VideoExtractor()
        case _:
            raise UnsupportedFileTypeException(
                received=file_type,
                supported=[e.value for e in FileType],
            )
