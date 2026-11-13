"""Stage 2: extract a checked document's text with real page markers (AD-8, AR-9, AR-15).

Order: extract every page, then ``no_extractable_text``, then the character limit, then
build the result. Page numbers are the 1-based viewer position. Errors carry only a code;
no document text or pypdf exception detail. This module writes no logs and leaves pypdf's
logging unchanged.
"""

import re
from dataclasses import dataclass
from typing import Literal

from app.pipeline.failures import PassFailure
from app.pipeline.stage1_validate import CheckedDocument, CheckedPdf

# A marker-like page tag: "<", optional whitespace, optional "/", optional whitespace,
# "page" in any case, then whitespace, "/", ">" or the end of the text. Only the "<" is
# matched, so the rest of the tag stays unchanged.
_PAGE_TAG = re.compile(r"<(?=\s*/?\s*page(?:[\s/>]|$))", re.IGNORECASE)


@dataclass(frozen=True)
class ExtractedDocument:
    """The document text for the prompt, with the PDF pages that were supplied or skipped."""

    kind: Literal["pdf", "text"]
    text: str
    supplied_pages: tuple[int, ...]
    skipped_pages: tuple[int, ...]


def _neutralise(text: str) -> str:
    """Replace the leading ``<`` of every marker-like page tag with ``&lt;``."""
    return _PAGE_TAG.sub("&lt;", text)


def _extract_pages(document: CheckedPdf) -> list[str]:
    try:
        return [page.extract_text() for page in document.reader.pages]
    except Exception:
        # Any failure while reading or extracting a page; the text is not kept.
        raise PassFailure("unreadable_file") from None


def extract_document(document: CheckedDocument, *, max_text_chars: int) -> ExtractedDocument:
    """Extract stage 1's document; raise ``PassFailure`` or return the extracted document.

    Failures, checked in this order:

    1. ``unreadable_file`` when any PDF page cannot be read or its text extracted
       (the whole document fails, never a single page);
    2. ``no_extractable_text`` when no PDF page has text after stripping, or the plain
       text is empty after stripping;
    3. ``file_too_large`` with ``limit="characters"`` when the original extracted text
       is longer than ``max_text_chars``.

    ``max_text_chars`` counts the original extracted text with ``len()``: for a PDF the
    sum over all pages (whitespace-only pages included), for plain text stage 1's decoded
    text, in both cases before trimming, neutralising and page markers.
    """
    if isinstance(document, CheckedPdf):
        pages = _extract_pages(document)
        if not any(page.strip() for page in pages):
            raise PassFailure("no_extractable_text")
        if sum(len(page) for page in pages) > max_text_chars:
            raise PassFailure("file_too_large", limit="characters")
        supplied: list[int] = []
        skipped: list[int] = []
        blocks: list[str] = []
        for number, page in enumerate(pages, start=1):
            trimmed = page.strip()
            if not trimmed:
                skipped.append(number)
                continue
            supplied.append(number)
            blocks.append(f'<page number="{number}">\n{_neutralise(trimmed)}\n</page>')
        return ExtractedDocument(
            kind="pdf",
            text="\n".join(blocks),
            supplied_pages=tuple(supplied),
            skipped_pages=tuple(skipped),
        )

    text = document.text
    if not text.strip():
        raise PassFailure("no_extractable_text")
    if len(text) > max_text_chars:
        raise PassFailure("file_too_large", limit="characters")
    return ExtractedDocument(kind="text", text=_neutralise(text), supplied_pages=(), skipped_pages=())
