"""Stage 1: check a document's bytes (FR-1, AR-15). Every test file is generated here (AR-20)."""

import ast
import logging
import traceback
from io import BytesIO
from pathlib import Path

import pytest
from pypdf import PdfReader, PdfWriter
from pypdf.errors import DependencyError

import app.pipeline as pipeline_package
from app.contracts.errors import LIMIT_KINDS
from app.pipeline.failures import PassFailure
from app.pipeline.stage1_validate import CheckedPdf, CheckedText, validate_bytes

LIMIT = 80


def make_pdf(pages: int = 1, title: str | None = None, **encrypt: str) -> bytes:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=200, height=200)
    if title is not None:
        writer.add_metadata({"/Title": title})
    if encrypt:
        writer.encrypt(**encrypt, algorithm="RC4-128")
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def check(doc: bytes, filename: str, max_pdf_pages: int = LIMIT) -> CheckedPdf | CheckedText:
    return validate_bytes(doc, filename, max_pdf_pages=max_pdf_pages)


def failure(doc: bytes, filename: str, max_pdf_pages: int = LIMIT) -> PassFailure:
    with pytest.raises(PassFailure) as info:
        check(doc, filename, max_pdf_pages)
    return info.value


# --- accepted -----------------------------------------------------------------------------


def test_valid_pdf_gives_its_page_count() -> None:
    result = validate_bytes(make_pdf(3), "notes.pdf", max_pdf_pages=LIMIT)
    assert isinstance(result, CheckedPdf)
    assert result.page_count == 3
    assert isinstance(result.reader, PdfReader)
    assert len(result.reader.pages) == 3


def test_valid_utf8_text_keeps_norwegian_characters() -> None:
    text = "Lagerstyring: æøå ÆØÅ\n"
    assert check(text.encode("utf-8"), "notes.txt") == CheckedText(text)


def test_utf8_bom_is_removed() -> None:
    assert check(b"\xef\xbb\xbfHei", "a.TXT") == CheckedText("Hei")


def test_utf8_bom_then_text_mentioning_pdf_signature_is_accepted() -> None:
    doc = b"\xef\xbb\xbf" + "Filer starter med %PDF-1.7".encode()
    assert check(doc, "a.txt") == CheckedText("Filer starter med %PDF-1.7")


def test_utf8_bom_only_is_empty_text() -> None:
    assert check(b"\xef\xbb\xbf", "a.txt") == CheckedText("")


@pytest.mark.parametrize("tail", [b"Hei\x00der", b"Hei\x01der"], ids=["nul", "control"])
def test_utf8_bom_then_nul_or_disallowed_control_is_unsupported(tail: bytes) -> None:
    assert failure(b"\xef\xbb\xbf" + tail, "a.txt").code == "unsupported_file_type"


def test_only_one_utf8_bom_is_removed() -> None:
    assert check(b"\xef\xbb\xbf\xef\xbb\xbfHei", "a.txt") == CheckedText("\ufeffHei")


@pytest.mark.parametrize("filename", ["A.TXT", "a.Txt", "uke1.notat.TXT"])
def test_capital_text_extension_is_accepted(filename: str) -> None:
    assert check(b"Hei", filename) == CheckedText("Hei")


def test_capital_pdf_extension_is_accepted() -> None:
    assert isinstance(check(make_pdf(), "A.PDF"), CheckedPdf)


def test_allowed_control_characters_are_accepted() -> None:
    text = "a\tb\nc\r\nd\fe"
    assert check(text.encode("utf-8"), "a.txt") == CheckedText(text)


def test_empty_text_passes_stage_1() -> None:
    assert check(b"", "empty.txt") == CheckedText("")


# --- extension ----------------------------------------------------------------------------


def test_pdf_renamed_to_txt_is_not_opened(monkeypatch: pytest.MonkeyPatch) -> None:
    def never_open(*args: object, **kwargs: object) -> None:
        raise AssertionError("the PDF was opened")

    monkeypatch.setattr("app.pipeline.stage1_validate.PdfReader", never_open)
    assert failure(make_pdf(), "x.txt").code == "unsupported_file_type"


def test_text_renamed_to_pdf_is_rejected() -> None:
    assert failure(b"Hei", "x.pdf").code == "unsupported_file_type"


@pytest.mark.parametrize("filename", ["notes", ".txt", "notes.", "notes.md", ""])
def test_missing_or_wrong_extension_is_rejected(filename: str) -> None:
    assert failure(b"Hei", filename).code == "unsupported_file_type"


# --- content rules ------------------------------------------------------------------------

BINARY_FILES = {
    "png": b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR",
    "jpeg": b"\xff\xd8\xff\xe0\x00\x10JFIF\x00",
    "gif87": b"GIF87a\x01\x00\x01\x00",
    "gif89": b"GIF89a\x01\x00\x01\x00",
    "zip_docx": b"PK\x03\x04\x14\x00\x06\x00",
    "ole2": b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1\x00\x00",
}


@pytest.mark.parametrize("kind", sorted(BINARY_FILES))
@pytest.mark.parametrize("filename", ["a.txt", "a.pdf", "a.png", "a"])
def test_binary_signatures_are_rejected(kind: str, filename: str) -> None:
    assert failure(BINARY_FILES[kind], filename).code == "unsupported_file_type"


def test_binary_signature_with_ascii_tail_is_still_rejected() -> None:
    # "GIF89a" alone is valid UTF-8; the signature decides before the text rules.
    assert failure(b"GIF89a hello", "a.txt").code == "unsupported_file_type"


@pytest.mark.parametrize("encoding", ["utf-16-le", "utf-16-be", "utf-32-le", "utf-32-be"])
@pytest.mark.parametrize("filename", ["a.txt", "a.pdf"])
def test_utf16_and_utf32_with_bom_are_bad_encoding(encoding: str, filename: str) -> None:
    bom = {
        "utf-16-le": b"\xff\xfe",
        "utf-16-be": b"\xfe\xff",
        "utf-32-le": b"\xff\xfe\x00\x00",
        "utf-32-be": b"\x00\x00\xfe\xff",
    }[encoding]
    doc = bom + "Hei æøå".encode(encoding)
    assert failure(doc, filename).code == "bad_text_encoding"


def test_nul_byte_is_unsupported() -> None:
    assert failure(b"Hei\x00der", "a.txt").code == "unsupported_file_type"


def test_latin1_text_is_bad_encoding() -> None:
    assert failure("æøå".encode("latin-1"), "a.txt").code == "bad_text_encoding"


@pytest.mark.parametrize(
    "char", ["\x01", "\x08", "\x0b", "\x0e", "\x1b", "\x1f", "\x7f", "\x80", "\x85", "\x9f"]
)
def test_disallowed_control_characters_are_unsupported(char: str) -> None:
    doc = f"Hei{char}der".encode()
    assert failure(doc, "a.txt").code == "unsupported_file_type"


# --- displaced PDF signature (decision 9) -------------------------------------------------


@pytest.mark.parametrize("filename", ["a.pdf", "a.txt"])
def test_stray_byte_before_pdf_signature_is_unsupported(filename: str) -> None:
    doc = b" " + make_pdf()
    with pytest.raises(UnicodeDecodeError):
        doc.decode("utf-8")  # its binary second line fails strict UTF-8
    assert failure(doc, filename).code == "unsupported_file_type"


ASCII_PDF_LIKE = b" %PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n"


def test_ascii_pdf_with_stray_leading_byte_named_txt_is_text() -> None:
    assert check(ASCII_PDF_LIKE, "a.txt") == CheckedText(ASCII_PDF_LIKE.decode("ascii"))


def test_ascii_pdf_with_stray_leading_byte_named_pdf_is_unsupported() -> None:
    assert failure(ASCII_PDF_LIKE, "a.pdf").code == "unsupported_file_type"


def test_utf8_text_mentioning_pdf_signature_is_accepted() -> None:
    text = "Forelesning om filformater.\nFiler starter med %PDF-1.7 og æøå.\n"
    assert check(text.encode("utf-8"), "notat.txt") == CheckedText(text)


def test_latin1_text_mentioning_pdf_signature_is_unsupported() -> None:
    doc = "Notater om æøå og %PDF-1.7".encode("latin-1")
    assert failure(doc, "notat.txt").code == "unsupported_file_type"


def test_wide_bom_followed_by_ascii_pdf_signature_is_unsupported() -> None:
    assert failure(b"\xff\xfe%PDF-1.7", "a.txt").code == "unsupported_file_type"


# --- opening the PDF ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "doc",
    [b"%PDF-1.7 this is not a pdf", b"%PDF-", make_pdf(2)[:60]],
    ids=["garbage", "signature-only", "truncated"],
)
def test_corrupt_or_truncated_pdf_is_unreadable(doc: bytes) -> None:
    assert failure(doc, "a.pdf").code == "unreadable_file"


def test_pdf_needing_a_password_is_unreadable() -> None:
    doc = make_pdf(user_password="secret", owner_password="owner")
    assert failure(doc, "a.pdf").code == "unreadable_file"


def test_owner_password_only_pdf_is_accepted() -> None:
    doc = make_pdf(2, user_password="", owner_password="owner")
    result = check(doc, "a.pdf")
    assert isinstance(result, CheckedPdf)
    assert result.page_count == 2


def test_unsupported_decryption_is_unreadable(monkeypatch: pytest.MonkeyPatch) -> None:
    def needs_cryptography(self: PdfReader, password: str) -> None:
        raise DependencyError("cryptography is required")

    monkeypatch.setattr(PdfReader, "decrypt", needs_cryptography)
    doc = make_pdf(user_password="", owner_password="owner")
    error = failure(doc, "a.pdf")
    assert error.code == "unreadable_file"
    assert_pypdf_exception_hidden(error, DependencyError("cryptography is required"))


CORRUPT_PDF = b"%PDF-1.7 this is not a pdf"


def assert_pypdf_exception_hidden(error: PassFailure, original: BaseException) -> None:
    assert str(error) == "unreadable_file"
    assert repr(error) == "PassFailure('unreadable_file')"
    assert error.args == ("unreadable_file",)
    assert error.__cause__ is None
    assert error.__suppress_context__ is True
    hidden = [type(original).__name__, str(original)]
    assert all(hidden)
    formatted = "".join(traceback.format_exception(error))
    for text in hidden:
        assert text not in formatted
    formatted = "".join(traceback.TracebackException.from_exception(error).format())
    for text in hidden:
        assert text not in formatted


def test_corrupt_pdf_hides_the_pypdf_exception() -> None:
    with pytest.raises(Exception) as original:
        len(PdfReader(BytesIO(CORRUPT_PDF)).pages)
    error = failure(CORRUPT_PDF, "a.pdf")
    assert error.code == "unreadable_file"
    assert_pypdf_exception_hidden(error, original.value)


# --- page limit ---------------------------------------------------------------------------


def test_page_limit_is_inclusive() -> None:
    result = check(make_pdf(80), "a.pdf", max_pdf_pages=80)
    assert isinstance(result, CheckedPdf)
    assert result.page_count == 80


def test_more_pages_than_the_limit_is_too_large() -> None:
    error = failure(make_pdf(81), "a.pdf", max_pdf_pages=80)
    assert (error.code, error.limit) == ("file_too_large", "pages")


def test_page_limit_comes_from_the_caller() -> None:
    error = failure(make_pdf(3), "a.pdf", max_pdf_pages=2)
    assert (error.code, error.limit) == ("file_too_large", "pages")
    result = check(make_pdf(3), "a.pdf", max_pdf_pages=3)
    assert isinstance(result, CheckedPdf)
    assert result.page_count == 3


# --- pypdf logging (decision 7) -----------------------------------------------------------


def test_pypdf_logging_is_unchanged_and_its_warnings_still_emitted(
    caplog: pytest.LogCaptureFixture,
) -> None:
    loggers = [logging.getLogger("pypdf"), logging.getLogger("pypdf._reader")]
    before = [(lg.level, list(lg.handlers), list(lg.filters), lg.propagate) for lg in loggers]
    with caplog.at_level(logging.WARNING):
        assert failure(b"%PDF-1.7 this is not a pdf", "a.pdf").code == "unreadable_file"
    after = [(lg.level, list(lg.handlers), list(lg.filters), lg.propagate) for lg in loggers]
    assert after == before
    assert any(record.name.startswith("pypdf") for record in caplog.records)


# --- PassFailure and boundaries -----------------------------------------------------------


def test_pass_failure_accepts_codes_from_the_closed_list() -> None:
    error = PassFailure("unsupported_file_type")
    assert (error.code, error.limit) == ("unsupported_file_type", None)
    assert str(error) == "unsupported_file_type"
    for limit in LIMIT_KINDS:
        assert PassFailure("file_too_large", limit=limit).limit == limit


def test_pass_failure_rejects_invalid_codes_and_limits() -> None:
    with pytest.raises(ValueError):
        PassFailure("no_such_code")  # type: ignore[arg-type]
    for code in ("not_found", "method_not_allowed"):
        with pytest.raises(ValueError):
            PassFailure(code)  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        PassFailure("file_too_large")
    with pytest.raises(ValueError):
        PassFailure("file_too_large", limit="lines")  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        PassFailure("unreadable_file", limit="pages")


def test_pipeline_does_not_import_app_api() -> None:
    package_dir = Path(pipeline_package.__file__).parent
    modules = sorted(package_dir.rglob("*.py"))
    assert "stage1_validate.py" in {module.name for module in modules}
    for module in modules:
        tree = ast.parse(module.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                assert node.level == 0, module.name
                names = [node.module or ""]
            else:
                continue
            for name in names:
                assert name != "app.api" and not name.startswith("app.api."), module.name


SECRET_NAME = "hemmelig-fil-navn"
SECRET_TEXT = "HemmeligInnhold"


@pytest.mark.parametrize(
    ("doc", "filename"),
    [
        (SECRET_TEXT.encode(), f"{SECRET_NAME}.pdf"),
        (f"{SECRET_TEXT}\x01".encode(), f"{SECRET_NAME}.txt"),
        (f"{SECRET_TEXT} æ".encode("latin-1"), f"{SECRET_NAME}.txt"),
        (f"%PDF-1.7 {SECRET_TEXT}".encode(), f"{SECRET_NAME}.pdf"),
        (make_pdf(3), f"{SECRET_NAME}.pdf"),
        (make_pdf(user_password=SECRET_TEXT, owner_password="o"), f"{SECRET_NAME}.pdf"),
    ],
)
def test_errors_never_contain_the_filename_or_document_text(doc: bytes, filename: str) -> None:
    error = failure(doc, filename, max_pdf_pages=2)
    rendered = f"{error!s} {error!r} {error.args!r}"
    assert SECRET_NAME not in rendered
    assert SECRET_TEXT not in rendered
    assert error.__cause__ is None


@pytest.mark.parametrize(
    "doc",
    [
        f"%PDF-1.7 {SECRET_TEXT}".encode(),
        make_pdf(title=SECRET_TEXT, user_password=SECRET_TEXT, owner_password="o"),
    ],
    ids=["corrupt", "password"],
)
def test_log_records_never_contain_the_filename_or_document_text(
    doc: bytes, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        assert failure(doc, f"{SECRET_NAME}.pdf").code == "unreadable_file"
    for record in caplog.records:
        message = record.getMessage()
        assert SECRET_NAME not in message
        assert SECRET_TEXT not in message
