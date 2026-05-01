from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.services.ingestion.extractor import ExtractedPage


@dataclass
class TextChunk:
    content: str
    page_number: int | None
    chunk_index: int


def chunk_pages(pages: list[ExtractedPage]) -> list[TextChunk]:
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )

    chunks: list[TextChunk] = []
    chunk_index = 0

    for page in pages:
        if not page.text.strip():
            continue
        for text in splitter.split_text(page.text):
            if text.strip():
                chunks.append(
                    TextChunk(
                        content=text,
                        page_number=page.page_number,
                        chunk_index=chunk_index,
                    )
                )
                chunk_index += 1

    return chunks
