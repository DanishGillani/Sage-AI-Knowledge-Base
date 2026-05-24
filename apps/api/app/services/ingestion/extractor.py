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
    _SPARSE_THRESHOLD = 20  # chars of real text before we consider a page image-only

    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import pdfplumber

        try:
            pages: list[ExtractedPage] = []
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for i, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    if len(text.strip()) < self._SPARSE_THRESHOLD:
                        logger.warning(
                            "pdf_sparse_text_page_ocr_fallback", page=i, filename=filename
                        )
                        text = await self._ocr_page(file_bytes, i)
                    pages.append(ExtractedPage(text=text, page_number=i))
            return pages
        except Exception as exc:
            # Locked/encrypted PDF — pdfplumber can't open it; fall back to full OCR
            logger.warning("pdf_locked_ocr_fallback", filename=filename, error=str(exc))
            return await self._ocr_all_pages(file_bytes, filename)

    @staticmethod
    async def _ocr_page(file_bytes: bytes, page_number: int) -> str:
        import asyncio

        import pytesseract
        from pdf2image import convert_from_bytes

        def _run() -> str:
            images = convert_from_bytes(file_bytes, first_page=page_number, last_page=page_number)
            return pytesseract.image_to_string(images[0]) if images else ""

        return await asyncio.to_thread(_run)

    @staticmethod
    async def _ocr_all_pages(file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        import asyncio

        import pytesseract
        from pdf2image import convert_from_bytes

        def _render() -> list[object]:
            return convert_from_bytes(file_bytes)

        try:
            images = await asyncio.to_thread(_render)
        except Exception as exc:
            msg = f"Could not render PDF pages for OCR (corrupted or password-protected): {exc}"
            raise RuntimeError(msg) from exc

        # Limit parallel OCR workers to avoid CPU thrashing on servers with few cores.
        # 3 concurrent pages keeps 3 cores busy while leaving 1 free for the rest of the app.
        _sem = asyncio.Semaphore(3)

        async def _ocr_image(img: object, idx: int) -> ExtractedPage:
            async with _sem:
                text = await asyncio.to_thread(pytesseract.image_to_string, img)
            return ExtractedPage(text=text, page_number=idx)

        tasks = [_ocr_image(img, i) for i, img in enumerate(images, start=1)]
        results = await asyncio.gather(*tasks)
        logger.info("pdf_ocr_complete", filename=filename, page_count=len(results))
        return list(results)


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


class PDFOCRExtractor(PDFExtractor):
    """Skips text extraction entirely and goes straight to OCR — for locked or scanned PDFs."""

    async def extract(self, file_bytes: bytes, filename: str) -> list[ExtractedPage]:
        logger.info("pdf_forced_ocr", filename=filename)
        return await self._ocr_all_pages(file_bytes, filename)


def get_extractor(file_type: str, force_ocr: bool = False) -> BaseExtractor:
    match file_type.upper():
        case "PDF":
            return PDFOCRExtractor() if force_ocr else PDFExtractor()
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
