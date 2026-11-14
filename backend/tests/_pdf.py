"""A minimal, standalone PDF builder for tests (Story 1.11, Q1). Imports no test module.

``make_pdf(*pages)`` builds a PDF with one page per entry: a ``str`` gives a page with that
text (Helvetica, WinAnsi), ``IMAGE`` gives an image-only page (no extractable text).
"""

from io import BytesIO

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, NumberObject

IMAGE = object()
BROKEN_PDF = b"%PDF-1.7 this is not a pdf"


def _stream(writer: PdfWriter, content: bytes, **entries: object) -> object:
    stream = DecodedStreamObject()
    for key, value in entries.items():
        stream[NameObject(f"/{key}")] = value  # type: ignore[assignment]
    stream.set_data(content)
    return writer._add_object(stream)


def _text_operator(text: str) -> bytes:
    data = text.encode("cp1252")
    escaped = data.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    return b"BT /F1 12 Tf 20 250 Td (" + escaped + b") Tj ET"


def make_pdf(*pages: object) -> bytes:
    writer = PdfWriter()
    font = writer._add_object(
        DictionaryObject(
            {
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
                NameObject("/Encoding"): NameObject("/WinAnsiEncoding"),
            }
        )
    )
    image = _stream(
        writer,
        b"\x00",
        Type=NameObject("/XObject"),
        Subtype=NameObject("/Image"),
        Width=NumberObject(1),
        Height=NumberObject(1),
        ColorSpace=NameObject("/DeviceGray"),
        BitsPerComponent=NumberObject(8),
    )
    for spec in pages:
        page = writer.add_blank_page(width=300, height=300)
        if spec is IMAGE:
            content = b"q 100 0 0 100 50 50 cm /Im1 Do Q"
            resources = {NameObject("/XObject"): DictionaryObject({NameObject("/Im1"): image})}
        else:
            assert isinstance(spec, str)
            content = _text_operator(spec)
            resources = {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
        page[NameObject("/Contents")] = _stream(writer, content)
        page[NameObject("/Resources")] = DictionaryObject(resources)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()
