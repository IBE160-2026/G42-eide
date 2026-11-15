"""Story 1.12: the sample lecture PDF and its build script (``samples/build_sample_pdf.py``).

The first part covers the build rules with synthetic inputs (matrix rows "Build: …",
"Git attributes"). The second part checks the committed, developer-approved sample (G3),
whose SHA-256 is pinned here. The "Provenance" row is added with ``PROVENANCE.md`` (G4).
"""

import hashlib
import importlib.util
import logging
import re
import struct
import sys
import warnings
from collections.abc import Callable
from io import BytesIO
from pathlib import Path
from types import ModuleType

import pytest
from pypdf import PdfReader
from pypdf._codecs import core_font_metrics
from pypdf.generic import ContentStream

from app.config import Settings
from app.pipeline.failures import PassFailure
from app.pipeline.stage1_validate import CheckedPdf, validate_bytes
from app.pipeline.stage2_extract import extract_document

REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLES = REPO_ROOT / "samples"


def _load_builder() -> ModuleType:
    spec = importlib.util.spec_from_file_location("build_sample_pdf", SAMPLES / "build_sample_pdf.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True  # never leave samples/__pycache__ behind
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


builder = _load_builder()

SECRET = "Hemmeligord"

VALID_SOURCE = """# Testtittel

*Undertittel for testen*

## Side 1 – Første side

Vi velger **Leverandør B** fordi den er *pålitelig*, særlig i ***høysesongen***.

## Side 2 – Andre side

- **Punkt én:** første punkt
- Punkt to

## Side 3 – Tredje side

1. Første steg
2. Andre steg

![](vareflyt.jpg)

## Side 5 – Femte side

### Underoverskrift

Tekst på side fem med æøå.

## Side 6 – Sjette side

| Faktor | Verdi |
| --- | --- |
| Daglig salg | 30 enheter |

Bestillingspunkt = (30 × 5) + 50 = 200 enheter
"""


def _segment(marker: int, payload: bytes) -> bytes:
    return bytes([0xFF, marker]) + struct.pack(">H", len(payload) + 2) + payload


def make_jpeg(*extra_segments: bytes, frame: int = 0xC0, width: int = 200, height: int = 100) -> bytes:
    """A JPEG whose headers are real; the scan data is a placeholder (never decoded here)."""
    app0 = _segment(0xE0, b"JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00")
    sof = _segment(frame, struct.pack(">BHHB", 8, height, width, 3) + b"\x01\x11\x00\x02\x11\x00\x03\x11\x00")
    sos = _segment(0xDA, b"\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00")
    return b"\xff\xd8" + app0 + b"".join(extra_segments) + sof + sos + b"\x12\x34\x56" + b"\xff\xd9"


VALID_JPEG = make_jpeg()


def _replace(old: str, new: str, source: str = VALID_SOURCE) -> str:
    assert source.count(old) == 1, old
    return source.replace(old, new)


def _build_error(source: str = VALID_SOURCE, jpeg: bytes = VALID_JPEG) -> str:
    with pytest.raises(ValueError) as caught:
        builder.build_pdf(source, jpeg)
    return str(caught.value)


def _normalised(text: str) -> str:
    return " ".join(text.split())


def test_valid_synthetic_source_builds() -> None:
    # The negative rows below mutate this source, so it must itself pass.
    reader = PdfReader(BytesIO(builder.build_pdf(VALID_SOURCE, VALID_JPEG)))
    assert len(reader.pages) == 6
    assert reader.pages[3].extract_text() == ""
    assert "/Font" not in reader.pages[3]["/Resources"]
    assert all(reader.pages[i].extract_text().strip() for i in (0, 1, 2, 4, 5))


def test_build_bad_character() -> None:
    message = _build_error(_replace("Tekst på side fem", f"{SECRET} → side fem"))
    assert "U+2192" in message
    assert "line 25" in message
    assert SECRET not in message


def test_build_page_overflow() -> None:
    message = _build_error(_replace("Tekst på side fem med æøå.", "ord " * 3000))
    assert "page 5" in message
    assert "does not fit" in message


def test_build_overlong_word() -> None:
    message = _build_error(_replace("Tekst på side fem", "x" * 300))
    assert "page 5" in message
    assert "wider than the text width" in message


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        pytest.param(_replace("## Side 6 – Sjette side\n", "### Ikke en side\n"), "exactly 5 '## ' pages", id="four-pages"),
        pytest.param(VALID_SOURCE + "\n## Side 7 – For mye\n", "exactly 5 '## ' pages", id="six-pages"),
        pytest.param(_replace("![](vareflyt.jpg)\n", ""), "must contain the image line", id="no-image-line"),
        pytest.param(
            _replace("## Side 3", "![](vareflyt.jpg)\n\n## Side 3", _replace("![](vareflyt.jpg)\n\n", "")),
            "between the third and the fourth",
            id="image-too-early",
        ),
        pytest.param(_replace("![](vareflyt.jpg)\n", "![](vareflyt.jpg)\n\nTekst på bildesiden.\n"),
                     "only the image", id="text-on-image-page"),
        pytest.param(_replace("![](vareflyt.jpg)", "![Beskrivelse](vareflyt.jpg)"), "must be exactly", id="image-alt-text"),
        pytest.param(_replace("# Testtittel\n\n", ""), "must start with a '# ' title", id="no-title"),
        pytest.param(VALID_SOURCE + "\n# Ny tittel\n", "only once", id="second-title"),
    ],
)
def test_build_wrong_structure(source: str, expected: str) -> None:
    assert expected in _build_error(source)


@pytest.mark.parametrize(
    ("old", "new", "expected"),
    [
        pytest.param("Tekst på side fem", "> Tekst på side fem", "unsupported markup", id="quote"),
        pytest.param("- Punkt to", "- Punkt to\n  - Underpunkt", "indented lines", id="nested-list"),
        pytest.param("Tekst på side fem", "**Tekst på side fem", "unbalanced emphasis", id="unbalanced-bold"),
        pytest.param("Tekst på side fem", "`Tekst` på side fem", "backticks", id="backtick"),
        pytest.param("Tekst på side fem", "_Tekst_ på side fem", "underscore emphasis", id="underscore"),
        pytest.param("### Underoverskrift", "#### Underoverskrift", "unsupported heading", id="level-4-heading"),
    ],
)
def test_build_unsupported_markup(old: str, new: str, expected: str) -> None:
    assert expected in _build_error(_replace(old, new))


@pytest.mark.parametrize(
    ("old", "new", "expected"),
    [
        pytest.param("| Daglig salg | 30 enheter |", "| Daglig salg | 30 | enheter |", "exactly two cells", id="three-columns"),
        pytest.param("| --- | --- |\n", "", "separator", id="missing-separator"),
        pytest.param("| --- | --- |", "| :--- | --- |", "separator", id="alignment-marks"),
        pytest.param("| Daglig salg | 30 enheter |", "| Daglig salg |  |", "cell is empty", id="empty-cell"),
        pytest.param("| Daglig salg | 30 enheter |", "| **Daglig** salg | 30 enheter |", "table cells", id="emphasis-in-cell"),
        pytest.param("\n\n| Faktor | Verdi |", "\n\nInnledning\n| Faktor | Verdi |", "table needs a blank line", id="no-blank-line-before"),
        pytest.param("| Daglig salg | 30 enheter |", "| " + "lang tekst " * 30 + "| 30 enheter |", "wider than the text width", id="too-wide"),
    ],
)
def test_build_table_rules(old: str, new: str, expected: str) -> None:
    assert expected in _build_error(_replace(old, new))


def test_build_emphasis() -> None:
    reader = PdfReader(BytesIO(builder.build_pdf(VALID_SOURCE, VALID_JPEG)))
    page1 = _normalised(reader.pages[0].extract_text())
    assert "*" not in page1
    assert "Vi velger Leverandør B fordi den er pålitelig, særlig i høysesongen." in page1
    stream = reader.pages[0].get_contents().get_data()
    for resource in (b"/F2", b"/F3", b"/F4"):  # bold, italic, bold italic
        assert resource in stream


@pytest.mark.parametrize(
    ("jpeg", "expected"),
    [
        pytest.param(make_jpeg(_segment(0xE1, b"Exif\x00\x00rest")), "APP1", id="app1-exif"),
        pytest.param(make_jpeg(_segment(0xED, b"Photoshop 3.0\x00")), "APP13", id="app13-iptc"),
        pytest.param(make_jpeg(_segment(0xFE, b"comment")), "comment", id="comment"),
        pytest.param(make_jpeg(frame=0xC2), "baseline", id="progressive"),
        pytest.param(b"\x89PNG\r\n\x1a\n" + b"\x00" * 20, "not a JPEG", id="not-a-jpeg"),
    ],
)
def test_build_jpeg_rules(jpeg: bytes, expected: str) -> None:
    assert expected in _build_error(jpeg=jpeg)


def test_build_metrics_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    without_helvetica = {name: metrics for name, metrics in core_font_metrics.CORE_FONT_METRICS.items() if name != "Helvetica"}
    monkeypatch.setattr(core_font_metrics, "CORE_FONT_METRICS", without_helvetica)
    assert "font metrics for Helvetica are missing" in _build_error()


def test_git_attributes() -> None:
    lines = (REPO_ROOT / ".gitattributes").read_text(encoding="utf-8").splitlines()
    assert "*.pdf binary" in lines
    assert "*.jpg binary" in lines


# --- The committed, developer-approved sample (G2 source, G3 PDF) -------------------------

SAMPLE_PDF = SAMPLES / "innkjop-og-lager.pdf"
SAMPLE_SOURCE = SAMPLES / "innkjop-og-lager.md"
SAMPLE_JPEG = SAMPLES / "vareflyt.jpg"
SAMPLE_NAME = "innkjop-og-lager.pdf"

# Pinned after the developer's G3 approval (2026-11-14). Re-pinning needs developer approval.
PINNED_PDF_SHA256 = "2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63"
PINNED_PDF_SIZE = 471_258
APPROVED_JPEG_SHA256 = "65e77aa4471a18230e095ce06815385c2fb21ae6b2e21cff104ba69e4856e63b"

TEXT_PAGES = (1, 2, 3, 5, 6)
A4 = [0.0, 0.0, 595.28, 841.89]
MIS_DECODING = ("�", "Ã", "Â", "\x00")


@pytest.fixture(scope="module")
def sample_pdf() -> bytes:
    return SAMPLE_PDF.read_bytes()


@pytest.fixture(scope="module")
def sample_source() -> str:
    return SAMPLE_SOURCE.read_bytes().decode("utf-8").replace("\r\n", "\n")


@pytest.fixture(scope="module")
def sample_jpeg() -> bytes:
    return SAMPLE_JPEG.read_bytes()


@pytest.fixture(scope="module")
def reader(sample_pdf: bytes) -> PdfReader:
    return PdfReader(BytesIO(sample_pdf))


@pytest.fixture(scope="module")
def page_texts(reader: PdfReader) -> list[str]:
    return [page.extract_text() for page in reader.pages]


@pytest.fixture(scope="module")
def source_pages(sample_source: str) -> list[object]:
    return builder.parse_source(sample_source)


def _rendered(blocks: list[object]) -> str:
    """The source page as the PDF must show it: markup removed, bullets as •, rows as cells."""
    parts: list[str] = []
    for block in blocks:
        if isinstance(block, builder.Heading):
            parts.append(block.text)
        elif isinstance(block, builder.Paragraph):
            parts.append("".join(text for text, _ in block.runs))
        elif isinstance(block, builder.ListBlock):
            parts += [item.marker + " " + "".join(text for text, _ in item.runs) for item in block.items]
        else:
            parts += [f"{cell1} {cell2}" for cell1, cell2 in block.rows]
    return _normalised(" ".join(parts))


def _table(source_pages: list[object]) -> object:
    tables = [block for block in source_pages[5] if isinstance(block, builder.Table)]
    assert len(tables) == 1
    return tables[0]


def _image(reader: PdfReader) -> object:
    xobjects = reader.pages[3]["/Resources"]["/XObject"]
    assert list(xobjects) == ["/Im1"]
    return xobjects["/Im1"].get_object()


def test_sample_file_present(sample_pdf: bytes) -> None:
    assert sample_pdf.startswith(b"%PDF-")
    assert len(sample_pdf) == PINNED_PDF_SIZE
    assert len(sample_pdf) <= 2 * 1024 * 1024


def test_sample_pinned_bytes(sample_pdf: bytes) -> None:
    assert hashlib.sha256(sample_pdf).hexdigest() == PINNED_PDF_SHA256


@pytest.mark.parametrize("line_ending", ["\n", "\r\n"], ids=["lf", "crlf"])
def test_sample_reproducible_build(
    sample_source: str, sample_jpeg: bytes, sample_pdf: bytes, line_ending: str
) -> None:
    rebuilt = builder.build_pdf(sample_source.replace("\n", line_ending), sample_jpeg)
    assert rebuilt == sample_pdf
    assert hashlib.sha256(rebuilt).hexdigest() == PINNED_PDF_SHA256


def test_sample_stage1(sample_pdf: bytes, make_settings: Callable[..., Settings]) -> None:
    settings = make_settings()
    assert settings.max_pdf_pages == 80
    checked = validate_bytes(sample_pdf, SAMPLE_NAME, max_pdf_pages=settings.max_pdf_pages)
    assert isinstance(checked, CheckedPdf)
    assert checked.page_count == 6


def test_sample_stage1_at_the_edge(sample_pdf: bytes) -> None:
    assert validate_bytes(sample_pdf, SAMPLE_NAME, max_pdf_pages=6).page_count == 6
    with pytest.raises(PassFailure) as caught:
        validate_bytes(sample_pdf, SAMPLE_NAME, max_pdf_pages=5)
    assert caught.value.code == "file_too_large"
    assert caught.value.limit == "pages"


def test_sample_stage2_pages_and_markers(sample_pdf: bytes, make_settings: Callable[..., Settings]) -> None:
    settings = make_settings()
    checked = validate_bytes(sample_pdf, SAMPLE_NAME, max_pdf_pages=settings.max_pdf_pages)
    extracted = extract_document(checked, max_text_chars=settings.max_text_chars)
    assert extracted.kind == "pdf"
    assert extracted.skipped_pages == (4,)
    assert extracted.supplied_pages == TEXT_PAGES
    assert re.findall(r'<page number="(\d+)">', extracted.text) == ["1", "2", "3", "5", "6"]


def test_sample_page4_is_only_the_approved_jpeg(reader: PdfReader, sample_jpeg: bytes) -> None:
    page = reader.pages[3]
    assert page.extract_text() == ""
    assert list(page["/Resources"]) == ["/XObject"]  # no /Font
    image = _image(reader)
    assert image["/Subtype"] == "/Image"
    assert image["/Filter"] == "/DCTDecode"
    assert (image["/Width"], image["/Height"]) == (1774, 887)
    assert image["/ColorSpace"] == "/DeviceRGB"
    assert image["/BitsPerComponent"] == 8
    assert image._data == sample_jpeg  # the stream holds the approved JPEG unchanged
    operators = [op for _, op in ContentStream(page.get_contents(), reader).operations]
    assert operators == [b"q", b"cm", b"Do", b"Q"]  # no BT, no text


def test_sample_jpeg_is_the_approved_diagram(sample_jpeg: bytes) -> None:
    assert hashlib.sha256(sample_jpeg).hexdigest() == APPROVED_JPEG_SHA256
    info = builder.parse_jpeg(sample_jpeg)  # baseline (SOF0), no metadata segments
    assert (info.width, info.height, info.components) == (1774, 887, 3)


def test_sample_text_pages(reader: PdfReader, page_texts: list[str]) -> None:
    for number in TEXT_PAGES:
        assert page_texts[number - 1].strip()
        assert "/XObject" not in reader.pages[number - 1]["/Resources"]


def test_sample_source_fidelity(source_pages: list[object], page_texts: list[str]) -> None:
    assert [i for i, blocks in enumerate(source_pages, start=1) if blocks is None] == [4]
    for number in TEXT_PAGES:
        assert _normalised(page_texts[number - 1]) == _rendered(source_pages[number - 1]), number


def test_sample_page_size(reader: PdfReader) -> None:
    assert len(reader.pages) == 6
    for page in reader.pages:
        assert [float(value) for value in page.mediabox] == A4


def test_sample_norwegian_characters(page_texts: list[str], sample_source: str) -> None:
    text = "".join(page_texts)
    for letter in "æøå":
        assert letter in text
    for letter in "ÆØÅ":
        assert (letter in text) == (letter in sample_source)


def test_sample_headings(source_pages: list[object], page_texts: list[str]) -> None:
    title = source_pages[0][0]
    assert isinstance(title, builder.Heading) and title.level == 1
    assert title.text in _normalised(page_texts[0])
    for number in TEXT_PAGES:
        headings = [b for b in source_pages[number - 1] if isinstance(b, builder.Heading) and b.level == 2]
        assert len(headings) == 1
        assert _normalised(page_texts[number - 1]).count(headings[0].text) == 1


def test_sample_page6_calculation(source_pages: list[object], page_texts: list[str]) -> None:
    paragraphs = ["".join(text for text, _ in b.runs) for b in source_pages[5] if isinstance(b, builder.Paragraph)]
    calculations = [text for text in paragraphs if text.startswith("Bestillingspunkt =")]
    assert len(calculations) == 1
    assert "(30 × 5) + 50 = 200" in calculations[0]
    assert calculations[0] in _normalised(page_texts[5])


def test_sample_page6_table(source_pages: list[object], page_texts: list[str]) -> None:
    rows = [f"{cell1} {cell2}" for cell1, cell2 in _table(source_pages).rows]
    assert rows[0] == "Faktor Verdi"
    lines = [_normalised(line) for line in page_texts[5].split("\n")]
    start = lines.index(rows[0])
    assert lines[start : start + len(rows)] == rows


def test_sample_table_layout(reader: PdfReader, source_pages: list[object]) -> None:
    table = _table(source_pages)
    cells = {cell: index for index, row in enumerate(table.rows) for cell in row}
    font = x = None
    drawn: list[tuple[str, float | None, str | None]] = []
    operations = ContentStream(reader.pages[5].get_contents(), reader).operations
    for operands, op in operations:
        if op == b"Td":
            x = float(operands[0])
        elif op == b"Tf":
            font = str(operands[0])
        elif op == b"Tj" and str(operands[0]) in cells:
            drawn.append((str(operands[0]), x, font))
    assert len(drawn) == 2 * len(table.rows)
    for text, _, used in drawn:
        assert used == ("/F2" if cells[text] == 0 else "/F1")  # bold header, regular body
    column2 = {x for text, x, _ in drawn if text in {row[1] for row in table.rows}}
    assert len(column2) == 1
    assert sum(1 for _, op in operations if op == b"S") == 1  # one rule under the header


def test_sample_no_mis_decoding(page_texts: list[str]) -> None:
    text = "".join(page_texts)
    for marker in MIS_DECODING:
        assert marker not in text
    assert set(text) - {"\n"} <= builder.ALLOWED_CHARACTERS


def test_sample_no_pypdf_warnings(
    sample_pdf: bytes, make_settings: Callable[..., Settings], caplog: pytest.LogCaptureFixture
) -> None:
    settings = make_settings()
    with caplog.at_level(logging.WARNING, logger="pypdf"), warnings.catch_warnings(action="error"):
        checked = validate_bytes(sample_pdf, SAMPLE_NAME, max_pdf_pages=settings.max_pdf_pages)
        extract_document(checked, max_text_chars=settings.max_text_chars)
    assert [record for record in caplog.records if record.name.startswith("pypdf")] == []


def test_sample_size_limits(page_texts: list[str], make_settings: Callable[..., Settings]) -> None:
    assert sum(len(text) for text in page_texts) < make_settings().max_text_chars // 10


def test_sample_no_personal_metadata(reader: PdfReader, sample_pdf: bytes, sample_jpeg: bytes) -> None:
    assert reader.metadata is not None
    assert set(reader.metadata) == {"/Producer"}
    assert "/ID" not in reader.trailer
    for data in (sample_pdf, sample_jpeg):
        for marker in (b"Exif", b"<x:xmpmeta", b"Photoshop 3.0"):
            assert marker not in data


PROVENANCE_STATEMENTS = (
    # Files and the pinned hash.
    "innkjop-og-lager.pdf",
    "innkjop-og-lager.md",
    "vareflyt.jpg",
    "build_sample_pdf.py",
    PINNED_PDF_SHA256,
    APPROVED_JPEG_SHA256,
    # What it is.
    "Innkjøp, lagerstyring og vareflyt i verdikjeden",
    "Norwegian Bokmål",
    "Page 4 is the only image-only page",
    "are fictional",
    # Who made it (D9) and the diagram (revision 4).
    "ChatGPT (GPT-6)",
    "Part of the final wording is therefore AI-assisted",
    "ChatGPT's image-generation tool",
    "It was not hand-drawn by the developer",
    # Background (D10), copyright (D8) and U-1.
    "LOG505",
    "no slides, figures, wording or examples were copied",
    "This is not an open licence",
    "U-1",
    "not yet approved for submission",
)


def test_sample_provenance(sample_source: str) -> None:
    text = _normalised((SAMPLES / "PROVENANCE.md").read_text(encoding="utf-8").replace("*", ""))
    for statement in PROVENANCE_STATEMENTS:
        assert statement in text, statement
    # The recorded source hash is the hash of the committed source.
    assert hashlib.sha256(sample_source.encode("utf-8")).hexdigest() in text
