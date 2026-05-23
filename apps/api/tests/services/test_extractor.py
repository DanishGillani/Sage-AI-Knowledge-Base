import pytest

from app.core.exceptions import UnsupportedFileTypeException
from app.services.ingestion.extractor import (
    DocxExtractor,
    ImageExtractor,
    PDFExtractor,
    PDFOCRExtractor,
    SpreadsheetExtractor,
    TextExtractor,
    VideoExtractor,
    get_extractor,
)


class TestGetExtractor:
    def test_pdf_returns_pdf_extractor(self) -> None:
        assert isinstance(get_extractor("PDF"), PDFExtractor)

    def test_pdf_force_ocr_returns_ocr_extractor(self) -> None:
        assert isinstance(get_extractor("PDF", force_ocr=True), PDFOCRExtractor)

    def test_docx_returns_docx_extractor(self) -> None:
        assert isinstance(get_extractor("DOCX"), DocxExtractor)

    def test_doc_returns_docx_extractor(self) -> None:
        assert isinstance(get_extractor("DOC"), DocxExtractor)

    def test_txt_returns_text_extractor(self) -> None:
        assert isinstance(get_extractor("TXT"), TextExtractor)

    def test_md_returns_text_extractor(self) -> None:
        assert isinstance(get_extractor("MD"), TextExtractor)

    def test_xlsx_returns_spreadsheet_extractor(self) -> None:
        assert isinstance(get_extractor("XLSX"), SpreadsheetExtractor)

    def test_csv_returns_spreadsheet_extractor(self) -> None:
        assert isinstance(get_extractor("CSV"), SpreadsheetExtractor)

    def test_jpg_returns_image_extractor(self) -> None:
        assert isinstance(get_extractor("JPG"), ImageExtractor)

    def test_png_returns_image_extractor(self) -> None:
        assert isinstance(get_extractor("PNG"), ImageExtractor)

    def test_mp4_returns_video_extractor(self) -> None:
        assert isinstance(get_extractor("MP4"), VideoExtractor)

    def test_unknown_type_raises_unsupported(self) -> None:
        with pytest.raises(UnsupportedFileTypeException):
            get_extractor("UNKNOWN")

    def test_lowercase_type_is_handled(self) -> None:
        assert isinstance(get_extractor("pdf"), PDFExtractor)


class TestTextExtractor:
    async def test_extracts_utf8_text(self) -> None:
        extractor = TextExtractor()
        pages = await extractor.extract(b"Hello world", "test.txt")
        assert len(pages) == 1
        assert pages[0].text == "Hello world"
        assert pages[0].page_number is None

    async def test_replaces_invalid_bytes(self) -> None:
        extractor = TextExtractor()
        pages = await extractor.extract(b"Hello \xff world", "test.txt")
        assert len(pages) == 1
        assert "Hello" in pages[0].text


class TestPDFOCRExtractor:
    def test_is_subclass_of_pdf_extractor(self) -> None:
        assert issubclass(PDFOCRExtractor, PDFExtractor)

    def test_instance_is_also_pdf_extractor(self) -> None:
        assert isinstance(PDFOCRExtractor(), PDFExtractor)
