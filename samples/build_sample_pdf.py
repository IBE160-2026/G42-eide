"""Build the Story 1.12 sample lecture PDF from its approved source text and diagram.

Run from the repository root::

    uv run --project backend python samples/build_sample_pdf.py

``main`` reads ``innkjop-og-lager.md`` and ``vareflyt.jpg`` from this folder and writes
``innkjop-og-lager.pdf`` next to them. ``build_pdf`` does the work without any file I/O, so
the tests can call it directly.

The build is deterministic and fails closed: it raises ``ValueError`` rather than changing,
shrinking, moving or dropping anything. Error messages name the problem with a line or page
number, never the lecture text.

Font widths come from the Adobe Core 14 metrics bundled with the locked pypdf
(``pypdf._codecs.core_font_metrics``). That module is private: if a pypdf upgrade moves it,
the build fails with a clear error, and the pinned SHA-256 test catches any layout change.
"""

import hashlib
import re
import struct
import sys
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from pypdf import PdfWriter
from pypdf._codecs import core_font_metrics
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, NumberObject

SOURCE_NAME = "innkjop-og-lager.md"
IMAGE_NAME = "vareflyt.jpg"
PDF_NAME = "innkjop-og-lager.pdf"
IMAGE_LINE = f"![]({IMAGE_NAME})"

# A4 with 20 mm margins (D12).
PAGE_WIDTH = 595.28
PAGE_HEIGHT = 841.89
MARGIN = 56.69
TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN
TEXT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN
TOP = PAGE_HEIGHT - MARGIN

TEXT_PAGES = 5
IMAGE_AFTER_TEXT_PAGE = 3

REGULAR = "Helvetica"
BOLD = "Helvetica-Bold"
ITALIC = "Helvetica-Oblique"
BOLD_ITALIC = "Helvetica-BoldOblique"
FONT_RESOURCES = {REGULAR: "/F1", BOLD: "/F2", ITALIC: "/F3", BOLD_ITALIC: "/F4"}
EMPHASIS_FONTS = {1: ITALIC, 2: BOLD, 3: BOLD_ITALIC}  # number of asterisks -> font


@dataclass(frozen=True)
class Style:
    size: int
    leading: int


TITLE = Style(20, 26)
HEADING = Style(16, 21)
SUBHEADING = Style(12, 16)
BODY = Style(11, 15)
HEADING_STYLES = {1: TITLE, 2: HEADING, 3: SUBHEADING}

LIST_INDENT = 18.0
LIST_MARKER_GAP = 3.0
TABLE_COLUMN_GAP = 24.0
TABLE_RULE_WIDTH = 0.5
TABLE_RULE_OFFSET = 4.0
GAP_PARAGRAPH = 6.0
GAP_HEADING = 10.0
GAP_TABLE = float(BODY.leading)  # one blank body-size line before and after a table

Run = tuple[str, str]  # (text, font)


def _winansi_printable() -> frozenset[str]:
    """Printable WinAnsi (cp1252) characters, except the no-break space and soft hyphen."""
    chars = {chr(code) for code in range(0x20, 0x7F)}
    for byte in range(0x80, 0x100):
        try:
            chars.add(bytes([byte]).decode("cp1252"))
        except UnicodeDecodeError:
            continue
    return frozenset(chars - {"\xa0", "\xad"})


ALLOWED_CHARACTERS = _winansi_printable()

HEADING_RE = re.compile(r"^(#{1,3}) (\S.*)$")
LIST_ITEM_RE = re.compile(r"^(-|\d+\.) (\S.*)$")
TABLE_SEPARATOR_RE = re.compile(r"^\|\s*-{3,}\s*\|\s*-{3,}\s*\|$")
UNDERSCORE_EMPHASIS_RE = re.compile(r"__|(?:^|(?<=[\s(]))_(?=\S)|(?<=\S)_(?=$|[\s.,;:!?)])")


# --- Source model -------------------------------------------------------------------------


@dataclass(frozen=True)
class Heading:
    level: int
    text: str
    line: int


@dataclass(frozen=True)
class Paragraph:
    runs: tuple[Run, ...]
    line: int


@dataclass(frozen=True)
class ListItem:
    marker: str
    runs: tuple[Run, ...]
    line: int


@dataclass(frozen=True)
class ListBlock:
    items: tuple[ListItem, ...]


@dataclass(frozen=True)
class Table:
    rows: tuple[tuple[str, str], ...]  # header row first
    line: int


Block = Heading | Paragraph | ListBlock | Table
Page = list[Block] | None  # None is the image-only page


@dataclass(frozen=True)
class JpegInfo:
    width: int
    height: int
    components: int


# --- Parsing ------------------------------------------------------------------------------


def _fail(line: int, problem: str) -> ValueError:
    return ValueError(f"line {line}: {problem}")


def _check_line(number: int, line: str) -> None:
    for char in line:
        if char not in ALLOWED_CHARACTERS:
            raise _fail(number, f"character U+{ord(char):04X} is not supported by the PDF fonts")
    if "`" in line:
        raise _fail(number, "backticks are not supported")
    if UNDERSCORE_EMPHASIS_RE.search(line):
        raise _fail(number, "underscore emphasis is not supported")
    if line != line.lstrip(" "):
        raise _fail(number, "indented lines (nested lists or code) are not supported")


def _blocks(lines: list[str]) -> list[tuple[int, list[str]]]:
    """Group non-blank lines into blocks separated by blank lines, keeping line numbers."""
    blocks: list[tuple[int, list[str]]] = []
    current: list[str] = []
    start = 0
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            if current:
                blocks.append((start, current))
                current = []
            continue
        _check_line(number, line)
        if not current:
            start = number
        current.append(line.rstrip(" "))
    if current:
        blocks.append((start, current))
    return blocks


def _runs(text: str, line: int) -> tuple[Run, ...]:
    """Split text with ``*``, ``**`` and ``***`` spans into (text, font) runs."""
    runs: list[Run] = []
    open_marker = 0
    buffer = ""
    for part in re.split(r"(\*+)", text):
        if not part:
            continue
        if not part.startswith("*"):
            buffer += part
            continue
        size = len(part)
        if size > 3:
            raise _fail(line, "unsupported emphasis marker")
        if open_marker == 0:
            if buffer:
                runs.append((buffer, REGULAR))
            buffer = ""
            open_marker = size
        elif open_marker == size:
            if not buffer.strip():
                raise _fail(line, "empty emphasis")
            runs.append((buffer, EMPHASIS_FONTS[size]))
            buffer = ""
            open_marker = 0
        else:
            raise _fail(line, "nested or mismatched emphasis")
    if open_marker:
        raise _fail(line, "unbalanced emphasis")
    if buffer:
        runs.append((buffer, REGULAR))
    return tuple(runs)


def _heading(line: str, number: int) -> Heading:
    match = HEADING_RE.match(line)
    if not match:
        raise _fail(number, "unsupported heading (only '# ', '## ' and '### ' are allowed)")
    text = match.group(2).strip()
    if "*" in text:
        raise _fail(number, "emphasis is not supported in headings")
    return Heading(level=len(match.group(1)), text=text, line=number)


def _table(block: list[str], start: int) -> Table:
    if any(not row.startswith("|") for row in block):
        raise _fail(start, "a table needs a blank line before and after it")
    if len(block) < 3:
        raise _fail(start, "a table needs a header row, a separator row and a body row")
    if not TABLE_SEPARATOR_RE.match(block[1]):
        raise _fail(start + 1, "the table separator must be |---|---| (no ':' alignment marks)")
    rows: list[tuple[str, str]] = []
    for offset, row in enumerate(block):
        if offset == 1:
            continue
        number = start + offset
        if len(row) < 2 or not row.endswith("|"):
            raise _fail(number, "a table row must start and end with '|'")
        cells = [cell.strip() for cell in row[1:-1].split("|")]
        if len(cells) != 2:
            raise _fail(number, "a table row must have exactly two cells")
        if not all(cells):
            raise _fail(number, "a table cell is empty")
        if any("*" in cell for cell in cells):
            raise _fail(number, "emphasis is not supported in table cells")
        rows.append((cells[0], cells[1]))
    return Table(rows=tuple(rows), line=start)


def _list(block: list[str], start: int) -> ListBlock:
    items: list[ListItem] = []
    for offset, row in enumerate(block):
        number = start + offset
        match = LIST_ITEM_RE.match(row)
        if not match:
            raise _fail(number, "a list item must fit on one source line, with blank lines around the list")
        marker = "•" if match.group(1) == "-" else match.group(1)
        items.append(ListItem(marker=marker, runs=_runs(match.group(2), number), line=number))
    return ListBlock(items=tuple(items))


def _paragraph(block: list[str], start: int) -> Paragraph:
    for offset, row in enumerate(block):
        number = start + offset
        if row.startswith("|"):
            raise _fail(number, "a table needs a blank line before and after it")
        if row.startswith("#"):
            raise _fail(number, "a heading must stand alone, with blank lines around it")
        if LIST_ITEM_RE.match(row):
            raise _fail(number, "a list needs a blank line before and after it")
        if row[:1] in (">", "<", "!"):
            raise _fail(number, "unsupported markup")
    return Paragraph(runs=_runs(" ".join(block), start), line=start)


def parse_source(source: str) -> list[Page]:
    """Parse the source into six pages: five lists of blocks and ``None`` for the image page."""
    if source.startswith("﻿"):
        raise ValueError("the source must not start with a byte-order mark")
    text = source.replace("\r\n", "\n")
    if "\r" in text:
        raise ValueError("the source contains a carriage return outside a CRLF line ending")

    pages: list[Page] = []
    current: list[Block] | None = None
    title_seen = False
    image_seen = False
    text_pages = 0

    for start, block in _blocks(text.split("\n")):
        first = block[0]
        if not title_seen:
            if not first.startswith("# ") or len(block) > 1:
                raise _fail(start, "the source must start with a '# ' title on its own")
            current = [_heading(first, start)]
            pages.append(current)
            title_seen = True
            continue

        if first.startswith("#"):
            if len(block) > 1:
                raise _fail(start, "a heading must stand alone, with blank lines around it")
            heading = _heading(first, start)
            if heading.level == 1:
                raise _fail(start, "the '# ' title may appear only once")
            if heading.level == 2:
                text_pages += 1
                if text_pages > TEXT_PAGES:
                    raise _fail(start, f"the source must have exactly {TEXT_PAGES} '## ' pages")
                if text_pages > 1:
                    current = []
                    pages.append(current)
            if current is None:
                raise _fail(start, "only the image may stand on the image page")
            current.append(heading)
            continue

        if first.startswith("!"):
            if first != IMAGE_LINE or len(block) > 1:
                raise _fail(start, f"the image line must be exactly {IMAGE_LINE} on its own")
            if image_seen or text_pages != IMAGE_AFTER_TEXT_PAGE:
                raise _fail(start, "the image line must stand once, between the third and the fourth '## ' page")
            pages.append(None)
            current = None
            image_seen = True
            continue

        if current is None:
            raise _fail(start, "only the image may stand on the image page")
        if first[:1] in (">", "<"):
            raise _fail(start, "unsupported markup")
        if first.startswith("|"):
            current.append(_table(block, start))
        elif LIST_ITEM_RE.match(first):
            current.append(_list(block, start))
        else:
            current.append(_paragraph(block, start))

    if not title_seen:
        raise ValueError("the source is empty")
    if text_pages != TEXT_PAGES:
        raise ValueError(f"the source must have exactly {TEXT_PAGES} '## ' pages, found {text_pages}")
    if not image_seen:
        raise ValueError(f"the source must contain the image line {IMAGE_LINE} once")
    return pages


_OTHER_FRAMES = frozenset({0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF})
_FORBIDDEN_SEGMENTS = {
    0xE1: "an APP1 (EXIF/XMP) metadata segment",
    0xED: "an APP13 (IPTC) metadata segment",
    0xFE: "a comment segment",
}


def parse_jpeg(data: bytes) -> JpegInfo:
    """Check the JPEG's headers (up to the first scan) and return its size and components."""
    if not data.startswith(b"\xff\xd8"):
        raise ValueError("the diagram is not a JPEG file")
    if not data.endswith(b"\xff\xd9"):
        raise ValueError("the JPEG file is truncated")
    info: JpegInfo | None = None
    position = 2
    while True:
        if position + 4 > len(data) or data[position] != 0xFF:
            raise ValueError("the JPEG file is malformed")
        marker = data[position + 1]
        if marker == 0xFF:  # fill byte
            position += 1
            continue
        if marker == 0xDA:  # start of scan: the headers end here
            break
        length = int.from_bytes(data[position + 2 : position + 4], "big")
        if length < 2 or position + 2 + length > len(data):
            raise ValueError("the JPEG file is malformed")
        if marker in _FORBIDDEN_SEGMENTS:
            raise ValueError(f"the JPEG contains {_FORBIDDEN_SEGMENTS[marker]}; export it without metadata")
        if marker in _OTHER_FRAMES:
            raise ValueError("the JPEG must be baseline (SOF0), not progressive or another encoding")
        if marker == 0xC0:
            if info is not None or length < 8:
                raise ValueError("the JPEG file is malformed")
            precision = data[position + 4]
            height, width = struct.unpack(">HH", data[position + 5 : position + 9])
            components = data[position + 9]
            if precision != 8:
                raise ValueError("the JPEG must use 8-bit samples")
            if components not in (1, 3):
                raise ValueError("the JPEG must be greyscale or RGB")
            if width == 0 or height == 0:
                raise ValueError("the JPEG has no size")
            info = JpegInfo(width=width, height=height, components=components)
        position += 2 + length
    if info is None:
        raise ValueError("the JPEG has no baseline (SOF0) frame header")
    return info


# --- Layout -------------------------------------------------------------------------------


class _Metrics:
    """Character widths from pypdf's bundled Adobe Core 14 metrics, read at build time."""

    def __init__(self) -> None:
        table = getattr(core_font_metrics, "CORE_FONT_METRICS", None)
        self._widths: dict[str, dict[str, float]] = {}
        for font in FONT_RESOURCES:
            entry = table.get(font) if isinstance(table, dict) else None
            if entry is None:
                raise ValueError(f"font metrics for {font} are missing from pypdf")
            self._widths[font] = entry.character_widths

    def width(self, text: str, font: str, size: int) -> float:
        widths = self._widths[font]
        total = 0.0
        for char in text:
            if char not in widths:
                raise ValueError(f"font metrics for {font} lack U+{ord(char):04X}")
            total += widths[char]
        return total * size / 1000


def _merge(runs: list[Run]) -> list[Run]:
    merged: list[Run] = []
    for text, font in runs:
        if merged and merged[-1][1] == font:
            merged[-1] = (merged[-1][0] + text, font)
        else:
            merged.append((text, font))
    return merged


def _words(runs: tuple[Run, ...]) -> list[list[Run]]:
    """Split runs at spaces into words; a word may mix fonts (e.g. ``(**når**)``)."""
    words: list[list[Run]] = []
    current: list[Run] = []
    for text, font in runs:
        piece = ""
        for char in text:
            if char == " ":
                if piece:
                    current.append((piece, font))
                    piece = ""
                if current:
                    words.append(current)
                    current = []
            else:
                piece += char
        if piece:
            current.append((piece, font))
    if current:
        words.append(current)
    return words


def _wrap(runs: tuple[Run, ...], size: int, width: float, metrics: _Metrics, page: int) -> list[list[Run]]:
    """Wrap runs at spaces only; a word wider than ``width`` is an error."""
    lines: list[list[Run]] = []
    line: list[Run] = []
    line_width = 0.0
    for word in _words(runs):
        word_width = sum(metrics.width(text, font, size) for text, font in word)
        if word_width > width:
            raise ValueError(f"page {page}: a word is wider than the text width")
        if line:
            space_font = line[-1][1]
            space_width = metrics.width(" ", space_font, size)
            if line_width + space_width + word_width <= width:
                line = _merge([*line, (" ", space_font), *word])
                line_width += space_width + word_width
                continue
            lines.append(line)
        line = _merge(list(word))
        line_width = word_width
    if line:
        lines.append(line)
    return lines


def _number(value: float) -> bytes:
    return f"{value:.2f}".encode("ascii")


def _literal(text: str) -> bytes:
    data = text.encode("cp1252")
    return b"(" + data.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)") + b")"


class _PageLayout:
    """Places lines from the top margin down and refuses to cross the bottom margin."""

    def __init__(self, number: int) -> None:
        self.number = number
        self.top = TOP
        self.ops: list[bytes] = []

    def gap(self, amount: float) -> None:
        self.top -= amount

    def next_line(self, style: Style) -> float:
        baseline = self.top - style.size
        self.top -= style.leading
        if self.top < MARGIN:
            raise ValueError(f"page {self.number}: the content does not fit between the margins")
        return baseline

    def text(self, x: float, baseline: float, runs: list[Run], size: int) -> None:
        parts = [b"BT", _number(x), _number(baseline), b"Td"]
        for text, font in runs:
            parts += [FONT_RESOURCES[font].encode("ascii"), str(size).encode("ascii"), b"Tf", _literal(text), b"Tj"]
        parts.append(b"ET")
        self.ops.append(b" ".join(parts))

    def rule(self, x1: float, x2: float, y: float) -> None:
        self.ops.append(
            b" ".join([b"q", _number(TABLE_RULE_WIDTH), b"w", _number(x1), _number(y), b"m",
                       _number(x2), _number(y), b"l", b"S", b"Q"])
        )


def _gap_before(previous: Block | None, block: Block) -> float:
    if previous is None:
        return 0.0
    if isinstance(block, Heading):
        return GAP_HEADING
    if isinstance(block, Table) or isinstance(previous, Table):
        return GAP_TABLE
    return GAP_PARAGRAPH


def _draw_table(page: _PageLayout, table: Table, metrics: _Metrics) -> None:
    def font_of(index: int) -> str:
        return BOLD if index == 0 else REGULAR

    size = BODY.size
    column1 = max(metrics.width(row[0], font_of(i), size) for i, row in enumerate(table.rows))
    column2 = max(metrics.width(row[1], font_of(i), size) for i, row in enumerate(table.rows))
    table_width = column1 + TABLE_COLUMN_GAP + column2
    if table_width > TEXT_WIDTH:
        raise _fail(table.line, "a table row is wider than the text width")
    column2_x = MARGIN + column1 + TABLE_COLUMN_GAP
    for index, (cell1, cell2) in enumerate(table.rows):
        baseline = page.next_line(BODY)
        page.text(MARGIN, baseline, [(cell1, font_of(index))], size)
        page.text(column2_x, baseline, [(cell2, font_of(index))], size)
        if index == 0:
            rule_y = baseline - TABLE_RULE_OFFSET
            page.rule(MARGIN, MARGIN + table_width, rule_y)


def _layout_page(blocks: list[Block], number: int, metrics: _Metrics) -> bytes:
    page = _PageLayout(number)
    previous: Block | None = None
    for block in blocks:
        page.gap(_gap_before(previous, block))
        if isinstance(block, Heading):
            style = HEADING_STYLES[block.level]
            for runs in _wrap(((block.text, BOLD),), style.size, TEXT_WIDTH, metrics, number):
                page.text(MARGIN, page.next_line(style), runs, style.size)
        elif isinstance(block, Paragraph):
            for runs in _wrap(block.runs, BODY.size, TEXT_WIDTH, metrics, number):
                page.text(MARGIN, page.next_line(BODY), runs, BODY.size)
        elif isinstance(block, ListBlock):
            for item in block.items:
                if metrics.width(item.marker, REGULAR, BODY.size) + LIST_MARKER_GAP > LIST_INDENT:
                    raise _fail(item.line, "a list number is too wide for the list indent")
                lines = _wrap(item.runs, BODY.size, TEXT_WIDTH - LIST_INDENT, metrics, number)
                for index, runs in enumerate(lines):
                    baseline = page.next_line(BODY)
                    if index == 0:
                        page.text(MARGIN, baseline, [(item.marker, REGULAR)], BODY.size)
                    page.text(MARGIN + LIST_INDENT, baseline, runs, BODY.size)
        else:
            _draw_table(page, block, metrics)
        previous = block
    return b"\n".join(page.ops)


def _image_ops(info: JpegInfo) -> bytes:
    scale = min(TEXT_WIDTH / info.width, TEXT_HEIGHT / info.height)
    width = info.width * scale
    height = info.height * scale
    x = (PAGE_WIDTH - width) / 2
    y = (PAGE_HEIGHT - height) / 2
    return b" ".join([b"q", _number(width), b"0 0", _number(height), _number(x), _number(y), b"cm /Im1 Do Q"])


# --- PDF ----------------------------------------------------------------------------------


def build_pdf(source: str, jpeg: bytes) -> bytes:
    """Return the sample PDF's bytes; raise ``ValueError`` on any rule violation."""
    pages = parse_source(source)
    image = parse_jpeg(jpeg)
    metrics = _Metrics()
    # Lay out every page before writing anything, so a failure produces no output.
    contents = [None if blocks is None else _layout_page(blocks, number, metrics)
                for number, blocks in enumerate(pages, start=1)]

    writer = PdfWriter()
    fonts = DictionaryObject()
    for font, resource in FONT_RESOURCES.items():
        fonts[NameObject(resource)] = writer._add_object(
            DictionaryObject(
                {
                    NameObject("/Type"): NameObject("/Font"),
                    NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject(f"/{font}"),
                    NameObject("/Encoding"): NameObject("/WinAnsiEncoding"),
                }
            )
        )
    fonts_reference = writer._add_object(fonts)

    for content in contents:
        page = writer.add_blank_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
        stream = DecodedStreamObject()
        if content is None:
            picture = DecodedStreamObject()
            picture.set_data(jpeg)
            picture[NameObject("/Type")] = NameObject("/XObject")
            picture[NameObject("/Subtype")] = NameObject("/Image")
            picture[NameObject("/Width")] = NumberObject(image.width)
            picture[NameObject("/Height")] = NumberObject(image.height)
            picture[NameObject("/ColorSpace")] = NameObject(
                "/DeviceRGB" if image.components == 3 else "/DeviceGray"
            )
            picture[NameObject("/BitsPerComponent")] = NumberObject(8)
            picture[NameObject("/Filter")] = NameObject("/DCTDecode")
            stream.set_data(_image_ops(image))
            resources = DictionaryObject(
                {NameObject("/XObject"): DictionaryObject({NameObject("/Im1"): writer._add_object(picture)})}
            )
        else:
            stream.set_data(content)
            resources = DictionaryObject({NameObject("/Font"): fonts_reference})
        page[NameObject("/Contents")] = writer._add_object(stream)
        page[NameObject("/Resources")] = resources

    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def main() -> int:
    folder = Path(__file__).resolve().parent
    try:
        source = (folder / SOURCE_NAME).read_bytes().decode("utf-8")
        jpeg = (folder / IMAGE_NAME).read_bytes()
        pdf = build_pdf(source, jpeg)
    except (OSError, UnicodeDecodeError, ValueError) as error:
        print(f"build failed: {error}", file=sys.stderr)
        return 1
    (folder / PDF_NAME).write_bytes(pdf)
    print(f"wrote {PDF_NAME}: {len(pdf)} bytes, SHA-256 {hashlib.sha256(pdf).hexdigest()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
