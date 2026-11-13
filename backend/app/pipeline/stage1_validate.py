"""Stage 1: decide from a document's bytes whether it is a supported PDF or text file (FR-1, AR-15).

Order: content first (PDF signature, then the text rules), then the filename extension,
then, for PDFs only, open the file and count its pages. Errors carry only a code; no
document content, filename or exception text. pypdf's logging is left unchanged.
"""

import re
from dataclasses import dataclass
from io import BytesIO

from pypdf import PasswordType, PdfReader

from app.contracts.errors import ErrorCode
from app.pipeline.failures import PassFailure

PDF_SIGNATURE = b"%PDF-"

BINARY_SIGNATURES: tuple[bytes, ...] = (
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"\xff\xd8\xff",  # JPEG
    b"GIF87a",  # GIF
    b"GIF89a",  # GIF
    b"PK\x03\x04",  # ZIP, DOCX and other Office Open XML
    b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",  # legacy Office (OLE2)
)

# UTF-32 before UTF-16: the UTF-32 LE BOM starts with the UTF-16 LE BOM.
WIDE_BOMS: tuple[bytes, ...] = (
    b"\xff\xfe\x00\x00",
    b"\x00\x00\xfe\xff",
    b"\xff\xfe",
    b"\xfe\xff",
)

UTF8_BOM = b"\xef\xbb\xbf"

# C0 except tab, LF, FF and CR; DEL; C1.
_DISALLOWED_CONTROL = re.compile("[\x00-\x08\x0b\x0e-\x1f\x7f-\x9f]")


@dataclass(frozen=True)
class CheckedPdf:
    """A PDF that opened and is within the page limit."""

    reader: PdfReader
    page_count: int


@dataclass(frozen=True)
class CheckedText:
    """A plain-text document, decoded, without a leading UTF-8 BOM."""

    text: str


CheckedDocument = CheckedPdf | CheckedText


def _text_rules(doc: bytes) -> ErrorCode | CheckedText:
    """The text rules after the binary-signature step, as one reusable check.

    Returns the first failing code, or the decoded text.
    """
    if doc.startswith(WIDE_BOMS):
        return "bad_text_encoding"
    if b"\x00" in doc:
        return "unsupported_file_type"
    body = doc[len(UTF8_BOM) :] if doc.startswith(UTF8_BOM) else doc
    try:
        text = body.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return "bad_text_encoding"
    if _DISALLOWED_CONTROL.search(text):
        return "unsupported_file_type"
    return CheckedText(text=text)


def _extension(filename: str) -> str | None:
    """The text after the last dot, lower-cased, when a non-empty name precedes the dot."""
    dot = filename.rfind(".")
    if dot <= 0:
        return None
    extension = filename[dot + 1 :].lower()
    return extension or None


def _open_pdf(doc: bytes) -> tuple[PdfReader, int]:
    try:
        reader = PdfReader(BytesIO(doc))
        if reader.is_encrypted and reader.decrypt("") == PasswordType.NOT_DECRYPTED:
            raise PassFailure("unreadable_file")
        page_count = len(reader.pages)
    except PassFailure:
        raise
    except Exception:
        # Any failure while opening, decrypting or counting pages; the text is not kept.
        raise PassFailure("unreadable_file") from None
    return reader, page_count


def validate_bytes(doc: bytes, filename: str, *, max_pdf_pages: int) -> CheckedDocument:
    """Check a document's bytes and name; raise ``PassFailure`` or return the checked document."""
    if doc.startswith(PDF_SIGNATURE):
        if _extension(filename) != "pdf":
            raise PassFailure("unsupported_file_type")
        reader, page_count = _open_pdf(doc)
        if page_count > max_pdf_pages:
            raise PassFailure("file_too_large", limit="pages")
        return CheckedPdf(reader=reader, page_count=page_count)

    # Binary signatures at offset 0, then the text rules. A displaced PDF signature is
    # checked only once a text rule has failed, which gives decision 9's result.
    if doc.startswith(BINARY_SIGNATURES):
        raise PassFailure("unsupported_file_type")
    result = _text_rules(doc)
    if not isinstance(result, CheckedText):
        if doc.find(PDF_SIGNATURE, 1) != -1:
            raise PassFailure("unsupported_file_type")
        raise PassFailure(result)
    if _extension(filename) != "txt":
        raise PassFailure("unsupported_file_type")
    return result
