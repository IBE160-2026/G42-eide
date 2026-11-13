"""Stage 2: extract text with real page markers (AD-8, AR-9, AR-15).

Every test file is generated here (AR-20): text pages are drawn with a Type1 Helvetica
font and a content stream, image-only pages draw an image XObject.
"""

import dataclasses
import logging
import traceback
from io import BytesIO

import pytest
from pypdf import PageObject, PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
)

from app.pipeline.failures import PassFailure
from app.pipeline.stage1_validate import CheckedPdf, CheckedText
from app.pipeline.stage2_extract import ExtractedDocument, extract_document

LIMIT = 200_000

IMAGE = object()  # page spec: an image-only page
Page = list[str] | object  # lines of text, or IMAGE


def _escape(line: str) -> bytes:
    data = line.encode("cp1252")
    return data.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def _stream(writer: PdfWriter, content: bytes, **entries: object) -> object:
    stream = DecodedStreamObject()
    for key, value in entries.items():
        stream[NameObject(f"/{key}")] = value  # type: ignore[assignment]
    stream.set_data(content)
    return writer._add_object(stream)


def make_pdf(*pages: Page) -> bytes:
    """A PDF with one page per spec: a list of text lines, or ``IMAGE``."""
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
            assert isinstance(spec, list)
            shown = b" ".join(b"(" + _escape(line) + b") Tj T*" for line in spec)
            content = b"BT /F1 12 Tf 20 250 Td 14 TL " + shown + b" ET"
            resources = {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
        page[NameObject("/Contents")] = _stream(writer, content)
        page[NameObject("/Resources")] = DictionaryObject(resources)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def checked_pdf(*pages: Page) -> CheckedPdf:
    reader = PdfReader(BytesIO(make_pdf(*pages)))
    return CheckedPdf(reader=reader, page_count=len(reader.pages))


def original_length(*pages: Page) -> int:
    """The total length pypdf extracts for these pages, before any change by stage 2."""
    reader = PdfReader(BytesIO(make_pdf(*pages)))
    return sum(len(page.extract_text()) for page in reader.pages)


def extract(document: CheckedPdf | CheckedText, max_text_chars: int = LIMIT) -> ExtractedDocument:
    result = extract_document(document, max_text_chars=max_text_chars)
    if isinstance(document, CheckedPdf):
        assert_page_invariants(result, document.page_count)
    return result


def failure(document: CheckedPdf | CheckedText, max_text_chars: int = LIMIT) -> PassFailure:
    with pytest.raises(PassFailure) as info:
        extract_document(document, max_text_chars=max_text_chars)
    return info.value


def assert_page_invariants(result: ExtractedDocument, page_count: int) -> None:
    supplied, skipped = result.supplied_pages, result.skipped_pages
    assert isinstance(supplied, tuple) and isinstance(skipped, tuple)
    assert all(type(n) is int for n in supplied + skipped)
    assert list(supplied) == sorted(supplied)
    assert list(skipped) == sorted(skipped)
    assert not set(supplied) & set(skipped)
    assert sorted(supplied + skipped) == list(range(1, page_count + 1))


# --- result type --------------------------------------------------------------------------


def test_result_is_frozen() -> None:
    result = extract(checked_pdf(["Hei"]))
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.text = "x"  # type: ignore[misc]


# --- page markers -------------------------------------------------------------------------


def test_mixed_pages_mark_only_pages_with_text() -> None:
    result = extract(checked_pdf(["Side en"], IMAGE, ["Side tre"]))
    assert result.kind == "pdf"
    assert result.supplied_pages == (1, 3)
    assert result.skipped_pages == (2,)
    assert '<page number="1">' in result.text
    assert '<page number="2">' not in result.text
    assert '<page number="3">' in result.text


def test_exact_layout() -> None:
    result = extract(checked_pdf(["Side en"], IMAGE, ["Side tre"]))
    assert result.text == '<page number="1">\nSide en\n</page>\n<page number="3">\nSide tre\n</page>'


def test_real_positions_are_kept() -> None:
    result = extract(checked_pdf(IMAGE, ["To"], IMAGE, IMAGE, ["Fem"]))
    assert result.supplied_pages == (2, 5)
    assert result.skipped_pages == (1, 3, 4)
    assert result.text == '<page number="2">\nTo\n</page>\n<page number="5">\nFem\n</page>'


def test_whitespace_only_page_is_skipped() -> None:
    document = checked_pdf(["Tekst"], ["   ", "  "])
    assert document.reader.pages[1].extract_text() != ""  # really whitespace, not empty
    result = extract(document)
    assert result.supplied_pages == (1,)
    assert result.skipped_pages == (2,)
    assert result.text == '<page number="1">\nTekst\n</page>'


def test_page_text_is_trimmed_but_inner_whitespace_kept() -> None:
    document = checked_pdf(["   start  midt", "slutt   "])
    raw = document.reader.pages[0].extract_text()
    assert raw != raw.strip()
    result = extract(document)
    assert result.text == f'<page number="1">\n{raw.strip()}\n</page>'
    assert "start  midt\nslutt" in result.text


def test_norwegian_characters_in_pdf_are_preserved() -> None:
    result = extract(checked_pdf(["Lagerstyring æøå ÆØÅ"]))
    assert result.text == '<page number="1">\nLagerstyring æøå ÆØÅ\n</page>'


def test_norwegian_characters_in_text_are_preserved() -> None:
    text = "Lagerstyring æøå ÆØÅ\n"
    assert extract(CheckedText(text)).text == text


# --- neutralising -------------------------------------------------------------------------


def test_fake_opening_marker_in_pdf_is_neutralised() -> None:
    result = extract(checked_pdf(['Se <page number="9"> her']))
    assert result.text == '<page number="1">\nSe &lt;page number="9"> her\n</page>'
    assert result.supplied_pages == (1,)
    assert result.text.count("<page") == 1


def test_fake_closing_marker_in_pdf_is_neutralised() -> None:
    result = extract(checked_pdf(["slutt </page> mer"]))
    assert result.text == '<page number="1">\nslutt &lt;/page> mer\n</page>'
    assert result.text.count("</page>") == 1


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ('<PAGE number="2">', '&lt;PAGE number="2">'),
        ("< page>", "&lt; page>"),
        ("</ Page >", "&lt;/ Page >"),
        ("<page/>", "&lt;page/>"),
        ('<page\nnumber="1">', '&lt;page\nnumber="1">'),
        ("slutt <page>", "slutt &lt;page>"),
        ("slutt <page", "slutt &lt;page"),
        ("<\tpAgE\t/>", "&lt;\tpAgE\t/>"),
    ],
)
def test_case_and_spacing_variants_are_neutralised(raw: str, expected: str) -> None:
    assert extract(CheckedText(raw)).text == expected


def test_case_variant_in_pdf_is_neutralised() -> None:
    result = extract(checked_pdf(['A <PAGE number="2"> B </ Page > C <page/>']))
    assert result.text == (
        '<page number="1">\nA &lt;PAGE number="2"> B &lt;/ Page > C &lt;page/>\n</page>'
    )


@pytest.mark.parametrize(
    "raw",
    ["<pagination>", "<pagebreak>", "<pages>", "<page-1>", 'page number="9">', "<pag>", "a < b"],
)
def test_harmless_lookalikes_are_unchanged(raw: str) -> None:
    assert extract(CheckedText(raw)).text == raw
    assert extract(checked_pdf([raw])).text == f'<page number="1">\n{raw}\n</page>'


@pytest.mark.parametrize(
    "raw",
    [
        '<​page number="9">',  # zero-width space is not whitespace for \s
        "<pa­ge>",  # soft hyphen inside "page"
        "＜page>",  # fullwidth less-than sign
        '&lt;page number="9">',  # already escaped
    ],
    ids=["zero-width-space", "soft-hyphen", "fullwidth", "already-escaped"],
)
def test_non_whitespace_lookalikes_are_unchanged(raw: str) -> None:
    # Regression pin of the approved decision 4 behaviour, not a new rule: only "<",
    # optional whitespace, optional "/", optional whitespace and "page" is a tag.
    assert extract(CheckedText(raw)).text == raw


def test_bare_less_than_at_end_of_page_stays_as_is() -> None:
    result = extract(checked_pdf(["slutt <"], ["Neste"]))
    assert result.text == '<page number="1">\nslutt <\n</page>\n<page number="2">\nNeste\n</page>'
    assert result.supplied_pages == (1, 2)


def test_neutralising_is_stable() -> None:
    once = extract(CheckedText('<page number="4"> </page>')).text
    assert extract(CheckedText(once)).text == once


# --- plain text ---------------------------------------------------------------------------


def test_plain_text_is_neutralised_without_markers_or_trimming() -> None:
    text = '  Notat om lager.\n<page number="4">\nSlutt.  \n'
    result = extract(CheckedText(text))
    assert result == ExtractedDocument(
        kind="text",
        text='  Notat om lager.\n&lt;page number="4">\nSlutt.  \n',
        supplied_pages=(),
        skipped_pages=(),
    )


# --- no extractable text ------------------------------------------------------------------


@pytest.mark.parametrize(
    "pages",
    [(IMAGE,), (IMAGE, IMAGE, IMAGE), ([" ", "  "],), (IMAGE, ["   "]), ([],)],
    ids=["one-image", "three-images", "whitespace", "image-and-whitespace", "empty-page"],
)
def test_pdf_without_text_has_no_extractable_text(pages: tuple[Page, ...]) -> None:
    assert failure(checked_pdf(*pages)).code == "no_extractable_text"


def test_pdf_with_zero_pages_has_no_extractable_text() -> None:
    document = checked_pdf()
    assert document.page_count == 0
    assert failure(document).code == "no_extractable_text"


@pytest.mark.parametrize("text", ["", " ", "\n\t\r\n \f"])
def test_empty_plain_text_has_no_extractable_text(text: str) -> None:
    assert failure(CheckedText(text)).code == "no_extractable_text"


def test_no_extractable_text_comes_before_the_character_limit() -> None:
    pages = (IMAGE, [" " * 40, " " * 40])
    assert original_length(*pages) > 10
    assert failure(checked_pdf(*pages), max_text_chars=10).code == "no_extractable_text"
    assert failure(CheckedText(" " * 50), max_text_chars=10).code == "no_extractable_text"


# --- character limit ----------------------------------------------------------------------


def test_pdf_at_the_limit_is_accepted() -> None:
    pages = (["Første side æøå"], IMAGE, ["  Tredje  "])
    length = original_length(*pages)
    result = extract(checked_pdf(*pages), max_text_chars=length)
    assert result.supplied_pages == (1, 3)


def test_pdf_one_over_the_limit_is_too_large() -> None:
    pages = (["Første side æøå"], IMAGE, ["  Tredje  "])
    length = original_length(*pages)
    error = failure(checked_pdf(*pages), max_text_chars=length - 1)
    assert (error.code, error.limit) == ("file_too_large", "characters")


def test_text_at_the_limit_is_accepted() -> None:
    text = "æøå " * 25
    assert extract(CheckedText(text), max_text_chars=len(text)).text == text


def test_text_one_over_the_limit_is_too_large() -> None:
    text = "æøå " * 25
    error = failure(CheckedText(text), max_text_chars=len(text) - 1)
    assert (error.code, error.limit) == ("file_too_large", "characters")


def test_whitespace_only_page_counts_towards_the_limit() -> None:
    with_text = (["Tekst"],)
    with_blank = (["Tekst"], [" " * 30])
    limit = original_length(*with_text)
    assert original_length(*with_blank) > limit
    assert extract(checked_pdf(*with_text), max_text_chars=limit).supplied_pages == (1,)
    error = failure(checked_pdf(*with_blank), max_text_chars=limit)
    assert (error.code, error.limit) == ("file_too_large", "characters")


def test_limit_is_counted_before_neutralising() -> None:
    text = 'Se <page number="1"> og </page>'
    result = extract(CheckedText(text), max_text_chars=len(text))
    assert len(result.text) > len(text)
    pages = (['Se <page number="1"> og </page>'],)
    result = extract(checked_pdf(*pages), max_text_chars=original_length(*pages))
    assert "&lt;page" in result.text


def test_limit_is_counted_before_markers_and_trimming() -> None:
    pages = (["  a  "], IMAGE, ["b"])
    length = original_length(*pages)
    result = extract(checked_pdf(*pages), max_text_chars=length)
    assert len(result.text) > length


def test_limit_comes_from_the_caller() -> None:
    error = failure(CheckedText("abcdef"), max_text_chars=5)
    assert (error.code, error.limit) == ("file_too_large", "characters")
    assert extract(CheckedText("abcdef"), max_text_chars=6).text == "abcdef"


# --- extraction errors --------------------------------------------------------------------

SECRET_TEXT = "HemmeligInnhold"


class SecretPypdfError(Exception):
    pass


def test_extraction_error_on_one_page_fails_the_whole_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original = PageObject.extract_text
    calls: list[int] = []

    def flaky(self: PageObject, *args: object, **kwargs: object) -> str:
        calls.append(1)
        if len(calls) == 2:
            raise SecretPypdfError(f"bad page {SECRET_TEXT}")
        return original(self, *args, **kwargs)  # type: ignore[arg-type]

    document = checked_pdf(["En"], ["To"], ["Tre"])
    monkeypatch.setattr(PageObject, "extract_text", flaky)
    error = failure(document)
    assert error.code == "unreadable_file"
    assert_exception_hidden(error, SecretPypdfError(f"bad page {SECRET_TEXT}"))


def test_extraction_error_on_page_one_is_unreadable(monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(self: PageObject, *args: object, **kwargs: object) -> str:
        raise SecretPypdfError(SECRET_TEXT)

    document = checked_pdf(["En"], ["To"])
    monkeypatch.setattr(PageObject, "extract_text", broken)
    error = failure(document)
    assert error.code == "unreadable_file"
    assert_exception_hidden(error, SecretPypdfError(SECRET_TEXT))


def test_error_while_reading_pages_is_unreadable() -> None:
    class BrokenPages:
        def __iter__(self) -> object:
            raise SecretPypdfError(SECRET_TEXT)

    class BrokenReader:
        pages = BrokenPages()

    document = CheckedPdf(reader=BrokenReader(), page_count=1)  # type: ignore[arg-type]
    error = failure(document)
    assert error.code == "unreadable_file"
    assert_exception_hidden(error, SecretPypdfError(SECRET_TEXT))


def assert_exception_hidden(error: PassFailure, original: BaseException) -> None:
    assert str(error) == error.code
    assert repr(error) == f"PassFailure({error.code!r})"
    assert error.args == (error.code,)
    assert error.__cause__ is None
    assert error.__suppress_context__ is True
    hidden = [type(original).__name__, str(original), SECRET_TEXT]
    for formatted in (
        "".join(traceback.format_exception(error)),
        "".join(traceback.TracebackException.from_exception(error).format()),
    ):
        for text in hidden:
            assert text not in formatted


# --- no content leaks ---------------------------------------------------------------------


def _secret_failures() -> list[tuple[CheckedPdf | CheckedText, int]]:
    secret_pages = ([f"{SECRET_TEXT} æøå"], IMAGE)
    return [
        (checked_pdf(*secret_pages), 3),
        (CheckedText(f"{SECRET_TEXT} æøå"), 3),
        (checked_pdf(IMAGE), LIMIT),
        (CheckedText("   "), LIMIT),
    ]


def test_errors_never_contain_document_text(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.DEBUG):
        for document, limit in _secret_failures():
            error = failure(document, max_text_chars=limit)
            rendered = f"{error!s} {error!r} {error.args!r}"
            assert rendered == f"{error.code} PassFailure({error.code!r}) ({error.code!r},)"
            assert SECRET_TEXT not in rendered
            assert error.__cause__ is None
            assert error.__context__ is None
    assert not [r for r in caplog.records if r.name == "app" or r.name.startswith("app.")]


def test_extraction_error_never_contains_document_text(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    def leaky(self: PageObject, *args: object, **kwargs: object) -> str:
        raise SecretPypdfError(f"could not decode {SECRET_TEXT} æøå")

    document = checked_pdf([f"{SECRET_TEXT} æøå"])
    monkeypatch.setattr(PageObject, "extract_text", leaky)
    with caplog.at_level(logging.DEBUG):
        error = failure(document)
    assert error.code == "unreadable_file"
    rendered = f"{error!s} {error!r} {error.args!r}"
    assert SECRET_TEXT not in rendered
    assert SECRET_TEXT not in "".join(traceback.format_exception(error))
    assert error.__cause__ is None
    # ``raise … from None`` hides the context in tracebacks but keeps the object
    # (approved, deferred behaviour), so ``__context__`` is deliberately not checked.
    assert error.__suppress_context__ is True
    assert not [r for r in caplog.records if r.name == "app" or r.name.startswith("app.")]


def test_stage_2_writes_no_log_records_on_success(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.DEBUG):
        extract(checked_pdf([SECRET_TEXT], IMAGE))
        extract(CheckedText(SECRET_TEXT))
    assert not [r for r in caplog.records if r.name == "app" or r.name.startswith("app.")]


# --- pypdf logging ------------------------------------------------------------------------


def test_pypdf_logging_is_unchanged() -> None:
    loggers = [logging.getLogger("pypdf"), logging.getLogger("pypdf._page")]
    before = [(lg.level, list(lg.handlers), list(lg.filters), lg.propagate) for lg in loggers]
    extract(checked_pdf(["Tekst"], IMAGE, [" "]))
    after = [(lg.level, list(lg.handlers), list(lg.filters), lg.propagate) for lg in loggers]
    assert after == before


# --- invariants ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "pages",
    [
        (["a"],),
        (["a"], ["b"], ["c"]),
        (IMAGE, ["a"]),
        (["a"], IMAGE),
        (IMAGE, [" "], ["a"], IMAGE, ["b"], [" "]),
    ],
)
def test_supplied_and_skipped_pages_cover_every_page(pages: tuple[Page, ...]) -> None:
    document = checked_pdf(*pages)
    result = extract(document)
    assert_page_invariants(result, document.page_count)
    assert len(result.supplied_pages) == result.text.count('<page number="')
