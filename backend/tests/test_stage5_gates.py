"""Story 1.10: stage 5 gates and the ValidatedResults contract (AD-10, D1-D9).

One test (or one parametrised test) per row of the spec's I/O & Edge-Case Matrix, in the
same order. All calls to ``validate_output`` happen outside any ``except`` block. Secrets
are marker strings only; Unicode edge cases are built with ``chr`` and ``json.dumps``.
"""

import ast
import io
import json
import logging
import tokenize
from pathlib import Path
from typing import Any

import pytest
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

import app.contracts.results as results_module
import app.pipeline.stage5_gates as stage5_gates
from app.contracts.ai_output import AiOutput
from app.contracts.connector import ConnectorReply, ConnectorRequest
from app.contracts.errors import HTTP_STATUS
from app.contracts.inputs import GenerationInputs
from app.contracts.results import (
    ValidatedFlashcard,
    ValidatedKeyConcept,
    ValidatedQuizItem,
    ValidatedResults,
    ValidatedSummary,
    is_valid_result_text,
)
from app.pipeline.failures import PassFailure
from app.pipeline.stage2_extract import ExtractedDocument
from app.pipeline.stage5_gates import MIN_ITEMS, validate_output
from tests._fake_connectors import FakeConnector

SECRET = "AI-SECRET-TEXT"
INVALID = "ai_output_invalid"
INSUFFICIENT = "insufficient_content"
BIG_PAGE = 2**70
LONE_SURROGATE = chr(0xD800)
EMOJI = chr(0x1F600)
ITEM_FIELDS = {
    "flashcards": ("front", "back"),
    "quiz": ("question", "answer"),
    "key_concepts": ("term", "explanation"),
}
LISTS = tuple(ITEM_FIELDS)


# --- builders ------------------------------------------------------------------------------


def ai_dict(
    *,
    status: str = "ok",
    count: int = 5,
    pages: list[Any] | None = None,
    summary_pages: list[Any] | None = None,
    text: str = "Tekst",
) -> dict[str, Any]:
    item_pages = [1] if pages is None else pages
    data: dict[str, Any] = {
        "status": status,
        "summary": {"text": f"Sammendrag {text}", "pages": [1] if summary_pages is None else summary_pages},
    }
    for name, (first, second) in ITEM_FIELDS.items():
        data[name] = [
            {first: f"{first} {i} {text}", second: f"{second} {i} {text}", "pages": list(item_pages)}
            for i in range(count)
        ]
    return data


def pdf_doc(supplied: tuple[int, ...] = (1, 3), skipped: tuple[int, ...] = (2,)) -> ExtractedDocument:
    return ExtractedDocument(kind="pdf", text="<page>", supplied_pages=supplied, skipped_pages=skipped)


def text_doc() -> ExtractedDocument:
    return ExtractedDocument(kind="text", text="tekst", supplied_pages=(), skipped_pages=())


def reply(raw: str, stop: str = "complete") -> ConnectorReply:
    return ConnectorReply(raw_json=raw, stop=stop, input_tokens=1, output_tokens=1)  # type: ignore[arg-type]


def run(data: dict[str, Any] | str, doc: ExtractedDocument | None = None, stop: str = "complete") -> ValidatedResults:
    raw = data if isinstance(data, str) else json.dumps(data)
    return validate_output(reply(raw, stop), pdf_doc() if doc is None else doc)


def fail(data: dict[str, Any] | str, doc: ExtractedDocument | None = None, stop: str = "complete") -> PassFailure:
    with pytest.raises(PassFailure) as caught:
        run(data, doc, stop)
    return caught.value


def assert_clean(error: PassFailure, code: str) -> None:
    """The stage 5 guarantees for a raised failure (D6)."""
    assert error.code == code
    assert vars(error) == {"code": code, "limit": None}
    assert getattr(error, "__notes__", None) is None
    for text in (str(error), repr(error), repr(error.args)):
        assert SECRET not in text
    assert error.__context__ is None
    assert error.__cause__ is None
    assert error.__suppress_context__ is False


def set_field(data: dict[str, Any], path: tuple[Any, ...], value: Any) -> dict[str, Any]:
    target: Any = data
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return data


def remove_field(data: dict[str, Any], path: tuple[Any, ...]) -> dict[str, Any]:
    target: Any = data
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    return data


TEXT_PATHS = [("summary", "text")] + [
    (name, 0, field) for name, fields in ITEM_FIELDS.items() for field in fields
]
PAGE_PATHS = [("summary", "pages")] + [(name, 0, "pages") for name in LISTS]


def path_id(path: tuple[Any, ...]) -> str:
    return ".".join(map(str, path))


# --- Gate 1 --------------------------------------------------------------------------------


def test_gate1_complete_passes() -> None:
    assert isinstance(run(ai_dict()), ValidatedResults)


@pytest.mark.parametrize("stop", ["length", "refusal", "other"])
def test_gate1_not_complete(stop: str) -> None:
    assert_clean(fail(ai_dict(), stop=stop), INVALID)


def test_gate1_runs_before_gate2(monkeypatch: pytest.MonkeyPatch) -> None:
    assert fail(ai_dict(status=INSUFFICIENT), stop="length").code == INVALID
    real_loads = json.loads
    calls: list[str] = []

    def recording_loads(raw: str, *args: Any, **kwargs: Any) -> Any:
        calls.append(raw)
        return real_loads(raw, *args, **kwargs)

    monkeypatch.setattr(json, "loads", recording_loads)
    assert fail("{not json", stop="length").code == INVALID
    assert calls == []  # Gate 1 rejected before any parsing
    raw = json.dumps(ai_dict())
    assert isinstance(run(raw), ValidatedResults)
    assert calls == [raw]  # positive control (R2): with stop="complete" the real parser runs


def test_gate1_never_decodes_raw_json(monkeypatch: pytest.MonkeyPatch) -> None:
    """Gate 1 rejects before any JSON decoding, whatever name the decoder is reached by (R2).

    Records the real ``JSONDecoder.decode``, which every ``json.loads`` reference uses.
    """
    real_decode = json.decoder.JSONDecoder.decode
    decoded: list[str] = []

    def recording_decode(self: json.JSONDecoder, raw: str, *args: Any, **kwargs: Any) -> Any:
        decoded.append(raw)
        return real_decode(self, raw, *args, **kwargs)

    monkeypatch.setattr(json.decoder.JSONDecoder, "decode", recording_decode)
    raw = json.dumps(ai_dict())
    assert fail(raw, stop="length").code == INVALID
    assert decoded == []
    assert isinstance(run(raw), ValidatedResults)
    assert decoded == [raw]  # positive control: exactly one decode when stop="complete"


# --- Gate 2 --------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw",
    ["{", "not json", "", chr(0xFEFF) + json.dumps(ai_dict()), "```json\n" + json.dumps(ai_dict()) + "\n```"],
    ids=["open-brace", "words", "empty", "bom", "code-fence"],
)
def test_gate2_malformed_json(raw: str) -> None:
    assert_clean(fail(raw), INVALID)


def _huge_page() -> str:
    body = json.dumps(ai_dict())
    return body.replace('"pages": [1]', '"pages": [' + "9" * 5000 + "]", 1)


@pytest.mark.parametrize(
    "raw",
    ["[" * 100_000 + "]" * 100_000, '{"a":' * 50_000 + "1" + "}" * 50_000, _huge_page()],
    ids=["deep-array", "deep-object", "5000-digit-page"],
)
def test_gate2_parser_limits(raw: str) -> None:
    assert_clean(fail(raw), INVALID)


def test_gate2_whitespace_around_json_passes() -> None:
    assert isinstance(run(" \n\t " + json.dumps(ai_dict()) + " \n "), ValidatedResults)


@pytest.mark.parametrize("raw", ["[]", '"ok"', "5", "null", "true"])
def test_gate2_not_an_object(raw: str) -> None:
    assert_clean(fail(raw), INVALID)


@pytest.mark.parametrize("status", ["<missing>", "OK", "error", "", None, 1, ["ok"]])
def test_gate2_status_missing_or_invalid(status: Any) -> None:
    data = ai_dict()
    if status == "<missing>":
        del data["status"]
    else:
        data["status"] = status
    assert_clean(fail(data), INVALID)


def test_gate2_duplicate_status_keys_last_wins() -> None:
    ok_body = json.dumps(ai_dict())
    ok_then_insufficient = ok_body[:-1] + ', "status": "insufficient_content"}'
    assert fail(ok_then_insufficient).code == INSUFFICIENT
    insufficient_then_ok = '{"status": "insufficient_content", ' + ok_body[1:]
    assert isinstance(run(insufficient_then_ok), ValidatedResults)


@pytest.mark.parametrize(
    "data",
    [
        {"status": INSUFFICIENT},
        {"status": INSUFFICIENT, "summary": {"text": "", "pages": []}, "flashcards": [], "quiz": [], "key_concepts": []},
        {"status": INSUFFICIENT, "summary": 5, "flashcards": {"x": [SECRET]}, "extra": True},
        {**ai_dict(count=4, pages=[2], text=SECRET), "status": INSUFFICIENT},
    ],
    ids=["alone", "empty-fields", "garbage-and-extra", "too-few-items-bad-pages"],
)
def test_gate2_insufficient_content(data: dict[str, Any]) -> None:
    assert_clean(fail(data), INSUFFICIENT)
    assert HTTP_STATUS[INSUFFICIENT] == 422


@pytest.mark.parametrize("name", ["summary", *LISTS])
def test_gate2_missing_result_type(name: str) -> None:
    assert_clean(fail(remove_field(ai_dict(), (name,))), INVALID)


@pytest.mark.parametrize("path", TEXT_PATHS + PAGE_PATHS, ids=path_id)
def test_gate2_missing_item_field(path: tuple[Any, ...]) -> None:
    assert_clean(fail(remove_field(ai_dict(), path)), INVALID)


@pytest.mark.parametrize("path", [(), ("summary",), *((name, 0) for name in LISTS)], ids=lambda p: path_id(p) or "top")
def test_gate2_extra_field(path: tuple[Any, ...]) -> None:
    data = ai_dict()
    target: Any = data
    for key in path:
        target = target[key]
    target["extra"] = SECRET
    assert_clean(fail(data), INVALID)


WRONG_TYPES = (
    [(path, value) for path in TEXT_PATHS for value in (5, {"deep": [SECRET]}, None)]
    + [((name,), {"x": 1}) for name in LISTS]
    + [(path, [value]) for path in PAGE_PATHS for value in ("1", 1.0, True, None)]
)


@pytest.mark.parametrize(("path", "value"), WRONG_TYPES, ids=[f"{path_id(p)}={v!r}" for p, v in WRONG_TYPES])
def test_gate2_wrong_types(path: tuple[Any, ...], value: Any) -> None:
    assert_clean(fail(set_field(ai_dict(), path, value)), INVALID)


@pytest.mark.parametrize("token", ["NaN", "Infinity", "-Infinity", "1e400"])
@pytest.mark.parametrize("path", PAGE_PATHS, ids=path_id)
def test_gate2_non_finite_pages(path: tuple[Any, ...], token: str) -> None:
    data = set_field(ai_dict(), path, ["__TOKEN__"])
    raw = json.dumps(data).replace('["__TOKEN__"]', "[" + token + "]")
    assert_clean(fail(raw), INVALID)


LOW_SURROGATE = chr(0xDFFF)
BAD_TEXTS = [
    "",
    " ",
    "\n\t",
    chr(0x3000),
    chr(0x1C),
    LONE_SURROGATE,
    "abc" + LONE_SURROGATE + "def",
    LOW_SURROGATE,
    "abc" + LOW_SURROGATE + "def",
]
BAD_TEXT_IDS = ["empty", "space", "newline-tab", "u3000", "x1c", "lone-high", "lone-high-inside", "lone-low", "lone-low-inside"]


@pytest.mark.parametrize("value", BAD_TEXTS, ids=BAD_TEXT_IDS)
@pytest.mark.parametrize("path", TEXT_PATHS, ids=path_id)
def test_gate2_text_rule(path: tuple[Any, ...], value: str) -> None:
    raw = json.dumps(set_field(ai_dict(), path, value))
    for surrogate, escape in ((LONE_SURROGATE, "ud800"), (LOW_SURROGATE, "udfff")):
        if surrogate in value:
            assert chr(92) + escape in raw  # the escape is literal JSON text in raw_json
    assert_clean(fail(raw), INVALID)


def test_gate2_text_preserved() -> None:
    data = ai_dict()
    data["summary"]["text"] = "  Lager\n"
    data["flashcards"][0]["front"] = "Sikkerhetslager på ærlig øy"
    data["flashcards"][0]["back"] = EMOJI
    data["quiz"][0]["question"] = chr(0x200B)  # documented limit: zero-width-only text passes
    raw = json.dumps(data)  # ensure_ascii: the emoji becomes a literal surrogate-pair escape
    assert chr(92) + "ud83d" + chr(92) + "ude00" in raw
    result = run(raw)
    assert result.summary.text == "  Lager\n"
    assert result.flashcards[0].front == "Sikkerhetslager på ærlig øy"
    assert result.flashcards[0].back == EMOJI and len(EMOJI) == 1 and ord(EMOJI) == 0x1F600
    assert is_valid_result_text(EMOJI)
    assert result.quiz[0].question == chr(0x200B)


# --- Gate 3 --------------------------------------------------------------------------------


@pytest.mark.parametrize("name", LISTS)
def test_gate3_counts_boundary(name: str) -> None:
    data = ai_dict()
    data[name] = data[name][:4]
    assert_clean(fail(data), INVALID)
    assert HTTP_STATUS[INVALID] == 502
    assert MIN_ITEMS == 5


def test_gate3_counts_met() -> None:
    result = run(ai_dict())
    assert (len(result.flashcards), len(result.quiz), len(result.key_concepts)) == (5, 5, 5)
    data = ai_dict()
    data["quiz"] = [dict(data["quiz"][0], question=f"Q{i}") for i in range(12)]
    result = run(data)
    assert [item.question for item in result.quiz] == [f"Q{i}" for i in range(12)]


def test_gate3_pdf_filtering() -> None:
    data = ai_dict(summary_pages=[2, 1])
    data["flashcards"][0]["pages"] = [1, 2]
    data["quiz"][0]["pages"] = [2, 3]
    data["key_concepts"][0]["pages"] = [3, 1, 3]
    result = run(data)
    assert result.summary.pages == (1,)
    assert result.flashcards[0].pages == (1,)
    assert result.quiz[0].pages == (3,)
    assert result.key_concepts[0].pages == (1, 3)
    assert (len(result.flashcards), len(result.quiz), len(result.key_concepts)) == (5, 5, 5)


def test_gate3_pdf_invalid_numbers() -> None:
    data = ai_dict()
    cases = [[0, 1], [-3, 3], [1, 99], [1, BIG_PAGE]]
    for i, pages in enumerate(cases):
        data["flashcards"][i]["pages"] = pages
    result = run(data)
    assert [card.pages for card in result.flashcards[:4]] == [(1,), (3,), (1,), (1,)]
    assert BIG_PAGE == 1180591620717411303424


def test_gate3_pdf_skipped_page_is_removed() -> None:
    data = ai_dict()
    data["key_concepts"][0]["pages"] = [2, 3]
    assert run(data).key_concepts[0].pages == (3,)


@pytest.mark.parametrize("pages", [[2], [4], []], ids=["skipped", "unknown", "empty"])
@pytest.mark.parametrize("name", LISTS)
def test_gate3_pdf_item_left_empty_fails(name: str, pages: list[int]) -> None:
    data = ai_dict()
    data[name][0]["pages"] = pages
    assert_clean(fail(data), INVALID)


@pytest.mark.parametrize("pages", [[], [2]])
def test_gate3_pdf_summary_may_be_empty(pages: list[int]) -> None:
    assert run(ai_dict(summary_pages=pages)).summary.pages == ()


def test_gate3_plain_text_without_pages() -> None:
    result = run(ai_dict(pages=[], summary_pages=[]), text_doc())
    assert result.summary.pages == ()
    assert all(item.pages == () for name in LISTS for item in getattr(result, name))


@pytest.mark.parametrize("page", [1, 0, BIG_PAGE])
@pytest.mark.parametrize("target", ["summary", *LISTS])
def test_gate3_plain_text_with_a_page_fails(target: str, page: int) -> None:
    data = ai_dict(pages=[], summary_pages=[])
    if target == "summary":
        data["summary"]["pages"] = [page]
    else:
        data[target][0]["pages"] = [page]
    assert_clean(fail(data, text_doc()), INVALID)


def test_gate3_unknown_kind() -> None:
    docx = ExtractedDocument(kind="docx", text="x", supplied_pages=(1,), skipped_pages=())  # type: ignore[arg-type]
    with pytest.raises(ValueError) as caught:
        run(ai_dict(), docx)
    assert type(caught.value) is ValueError
    assert str(caught.value) == "unknown document kind"
    # Counts run first: too few items fail before the document-kind check.
    data = ai_dict()
    data["flashcards"] = data["flashcards"][:4]
    assert fail(data, docx).code == INVALID


def test_gate3_page_marker_limit_unrelated_supplied_page_passes() -> None:
    """Documented evidence that Gate 3 is page-marker validation only (D9).

    Page 3 is a supplied marker, so a key concept citing it passes even though its text has
    nothing to do with that page. Gate 3 never checks semantic support; that is manual.
    """
    data = ai_dict()
    data["key_concepts"][0] = {
        "term": "Fotosyntese",
        "explanation": "Planter omdanner lys til energi.",
        "pages": [3],
    }
    result = run(data, pdf_doc(supplied=(1, 3)))
    assert result.key_concepts[0].term == "Fotosyntese"
    assert result.key_concepts[0].pages == (3,)


# --- Output --------------------------------------------------------------------------------


def test_output_is_a_new_validated_results() -> None:
    result = run(ai_dict())
    assert type(result) is ValidatedResults
    assert not isinstance(result, AiOutput)
    assert list(ValidatedResults.model_fields) == ["summary", "flashcards", "quiz", "key_concepts"]
    assert "status" not in result.model_dump()


def test_output_pages_normalised() -> None:
    data = ai_dict(pages=[3, 1, 3, 1], summary_pages=[3, 3, 1])
    result = run(data)
    for pages in [result.summary.pages, *(item.pages for name in LISTS for item in getattr(result, name))]:
        assert type(pages) is tuple
        assert list(pages) == sorted(set(pages)) == [1, 3]
        assert all(page > 0 for page in pages)


def test_output_serialisation() -> None:
    result = run(ai_dict(pages=[3, 1]))
    expected_card = {"front": "front 0 Tekst", "back": "back 0 Tekst", "pages": [1, 3]}
    json_mode = result.model_dump(mode="json")
    assert type(json_mode["flashcards"]) is list
    assert json_mode["flashcards"][0] == expected_card
    assert json_mode["summary"] == {"text": "Sammendrag Tekst", "pages": [1]}
    assert json.loads(result.model_dump_json()) == json_mode
    assert jsonable_encoder(result) == json_mode
    plain = result.model_dump()
    assert type(plain["flashcards"]) is tuple and type(plain["flashcards"][0]["pages"]) is tuple


def test_output_immutability() -> None:
    result = run(ai_dict())
    with pytest.raises(ValidationError):
        result.summary = result.summary  # type: ignore[misc]
    with pytest.raises(ValidationError):
        result.flashcards[0].front = "x"  # type: ignore[misc]
    for collection in (result.flashcards, result.quiz, result.key_concepts, result.summary.pages, result.flashcards[0].pages):
        assert type(collection) is tuple
        with pytest.raises(AttributeError):
            collection.append(None)  # type: ignore[attr-defined]
    assert isinstance(hash(result), int)


def test_defensive_build_path(monkeypatch: pytest.MonkeyPatch) -> None:
    def raise_validation_error(**_: Any) -> ValidatedResults:
        ValidatedSummary(text=SECRET + " ", pages=(2, 1))  # a real ValidationError
        raise AssertionError("unreachable")

    monkeypatch.setattr(stage5_gates, "ValidatedResults", raise_validation_error)
    assert_clean(fail(ai_dict(text=SECRET)), INVALID)

    def raise_runtime_error(**_: Any) -> ValidatedResults:
        raise RuntimeError("unrelated programming error")

    monkeypatch.setattr(stage5_gates, "ValidatedResults", raise_runtime_error)
    with pytest.raises(RuntimeError, match="unrelated programming error"):
        run(ai_dict())


# --- Contract ------------------------------------------------------------------------------


def valid_parts() -> dict[str, Any]:
    return {
        "summary": {"text": "S", "pages": [1, 3]},
        "flashcards": [{"front": "F", "back": "B", "pages": [1]}],
        "quiz": [{"question": "Q", "answer": "A", "pages": [3]}],
        "key_concepts": [{"term": "T", "explanation": "E", "pages": [1, 3]}],
    }


def test_contract_valid_construction() -> None:
    result = ValidatedResults(**valid_parts())
    assert result.summary.text == "S"
    assert result.summary.pages == (1, 3)
    assert type(result.flashcards) is tuple and type(result.flashcards[0]) is ValidatedFlashcard
    assert result.model_dump(mode="json") == valid_parts()


TEXT_MESSAGE = "text must contain non-whitespace characters and no lone surrogates"
PAGES_MESSAGE = "pages must be strictly increasing"


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"text": "", "pages": ()}, TEXT_MESSAGE),
        ({"text": "  ", "pages": ()}, TEXT_MESSAGE),
        ({"text": LONE_SURROGATE + "x", "pages": ()}, TEXT_MESSAGE),
        ({"text": "x" + LOW_SURROGATE, "pages": ()}, TEXT_MESSAGE),
        ({"text": b"x", "pages": ()}, None),
        ({"text": "ok", "pages": [2, 1]}, PAGES_MESSAGE),
        ({"text": "ok", "pages": [1, 1]}, PAGES_MESSAGE),
        ({"text": "ok", "pages": [0]}, None),
        ({"text": "ok", "pages": [-1]}, None),
        ({"text": "ok", "pages": ["1"]}, None),
        ({"text": "ok", "pages": [1.0]}, None),
        ({"text": "ok", "pages": [True]}, None),
        ({"text": "ok", "pages": (), "extra": SECRET}, None),
        ({"text": "ok"}, None),
    ],
    ids=["empty", "spaces", "lone-high", "lone-low", "bytes", "unsorted", "duplicate", "zero", "negative", "str", "float", "bool", "extra", "missing"],
)
def test_contract_invariants(kwargs: dict[str, Any], message: str | None) -> None:
    with pytest.raises(ValidationError) as caught:
        ValidatedFlashcard(front=SECRET, back=kwargs.pop("text"), **kwargs)
    error = caught.value
    assert SECRET not in str(error)
    assert SECRET not in repr(error)
    messages = [entry["msg"] for entry in error.errors(include_input=False)]
    if message is not None:
        assert any(message in msg for msg in messages)
    else:
        assert not any(TEXT_MESSAGE in msg or PAGES_MESSAGE in msg for msg in messages)


def test_contract_empty_pages_allowed() -> None:
    assert ValidatedSummary(text="x", pages=[]).pages == ()
    assert ValidatedQuizItem(question="q", answer="a", pages=[]).pages == ()


@pytest.mark.parametrize(
    "model", [ValidatedSummary, ValidatedFlashcard, ValidatedQuizItem, ValidatedKeyConcept, ValidatedResults],
    ids=lambda model: model.__name__,
)
def test_contract_config_and_names(model: type) -> None:
    config = model.model_config
    assert config.get("extra") == "forbid"
    assert config.get("frozen") is True
    assert config.get("hide_input_in_errors") is True
    expected = {
        ValidatedSummary: ["text", "pages"],
        ValidatedFlashcard: ["front", "back", "pages"],
        ValidatedQuizItem: ["question", "answer", "pages"],
        ValidatedKeyConcept: ["term", "explanation", "pages"],
        ValidatedResults: ["summary", "flashcards", "quiz", "key_concepts"],
    }[model]
    assert list(model.model_fields) == expected
    assert stage5_gates.is_valid_result_text is results_module.is_valid_result_text


@pytest.mark.parametrize("path", TEXT_PATHS, ids=path_id)
def test_gate2_uses_the_shared_text_predicate(monkeypatch: pytest.MonkeyPatch, path: tuple[Any, ...]) -> None:
    """Gate 2 applies ``is_valid_result_text`` to this field itself, not only via the contract.

    Only stage 5's reference is patched, so the contract still accepts the marker; the pass
    fails only if Gate 2 checks this field (R1).
    """
    marker = "GATE2-MARKER"
    monkeypatch.setattr(stage5_gates, "is_valid_result_text", lambda value: marker not in value)
    assert isinstance(run(ai_dict()), ValidatedResults)  # control: unmarked text passes
    assert_clean(fail(set_field(ai_dict(), path, marker)), INVALID)


def test_gate2_unexpected_parser_error_propagates(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only ValueError and RecursionError from json.loads become ai_output_invalid (R4)."""

    def broken_loads(raw: str, *args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("unexpected parser failure")

    monkeypatch.setattr(json, "loads", broken_loads)
    with pytest.raises(RuntimeError, match="unexpected parser failure"):
        run(ai_dict())


def test_gate2_unexpected_validation_error_propagates(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only ValidationError from AiOutput.model_validate becomes ai_output_invalid (R4)."""

    class BrokenAiOutput:
        @staticmethod
        def model_validate(data: Any) -> Any:
            raise RuntimeError("unexpected validation failure")

    monkeypatch.setattr(stage5_gates, "AiOutput", BrokenAiOutput)
    with pytest.raises(RuntimeError, match="unexpected validation failure"):
        run(ai_dict())
    monkeypatch.undo()
    assert fail(remove_field(ai_dict(), ("quiz",))).code == INVALID  # expected failures unchanged


# --- Privacy -------------------------------------------------------------------------------


def _secret_failures() -> list[tuple[str, str, str, ExtractedDocument, str]]:
    """(id, raw_json, stop, document, expected code): every case carries the secret (R5)."""
    secret = ai_dict(text=SECRET)
    deep = '{"summary": "' + SECRET + '", "nested": ' + "[" * 100_000 + "]" * 100_000 + "}"
    digits = json.dumps(ai_dict(text=SECRET)).replace('"pages": [1]', '"pages": [' + "9" * 5000 + "]", 1)
    blank = ai_dict(text=SECRET)
    blank["quiz"][0]["answer"] = "   "
    few = ai_dict(text=SECRET)
    few["key_concepts"] = few["key_concepts"][:4]
    empty_item = ai_dict(text=SECRET)
    empty_item["flashcards"][0]["pages"] = [2]
    extra = ai_dict(text=SECRET)
    extra["leak"] = SECRET
    missing = remove_field(ai_dict(text=SECRET), ("quiz",))
    nested = {"status": "ok", "summary": {"text": {"deep": [SECRET]}}}
    return [
        ("gate1", json.dumps(secret), "length", pdf_doc(), INVALID),
        ("malformed", '{"summary": "' + SECRET, "complete", pdf_doc(), INVALID),
        ("deep", deep, "complete", pdf_doc(), INVALID),
        ("digit-limit", digits, "complete", pdf_doc(), INVALID),
        ("not-object", json.dumps([SECRET]), "complete", pdf_doc(), INVALID),
        ("bad-status", json.dumps({"status": "error", "summary": SECRET}), "complete", pdf_doc(), INVALID),
        ("insufficient", json.dumps({"status": INSUFFICIENT, "summary": SECRET}), "complete", pdf_doc(), INSUFFICIENT),
        ("missing-type", json.dumps(missing), "complete", pdf_doc(), INVALID),
        ("extra-field", json.dumps(extra), "complete", pdf_doc(), INVALID),
        ("nested-validation-error", json.dumps(nested), "complete", pdf_doc(), INVALID),
        ("text-rule", json.dumps(blank), "complete", pdf_doc(), INVALID),
        ("counts", json.dumps(few), "complete", pdf_doc(), INVALID),
        ("pdf-item-empty", json.dumps(empty_item), "complete", pdf_doc(), INVALID),
        ("plain-text-page", json.dumps(secret), "complete", text_doc(), INVALID),
    ]


SECRET_FAILURES = _secret_failures()
SECRET_PARAMS = [case[1:] for case in SECRET_FAILURES]
SECRET_IDS = [case[0] for case in SECRET_FAILURES]


def test_secret_cases_all_carry_the_secret() -> None:
    assert all(SECRET in raw for raw, *_ in SECRET_PARAMS)


@pytest.mark.parametrize(("raw", "stop", "doc", "expected"), SECRET_PARAMS, ids=SECRET_IDS)
def test_privacy_failure_object(raw: str, stop: str, doc: ExtractedDocument, expected: str) -> None:
    with pytest.raises(PassFailure) as caught:
        validate_output(reply(raw, stop), doc)
    error = caught.value
    assert error.code == expected
    assert vars(error) == {"code": expected, "limit": None}
    assert getattr(error, "__notes__", None) is None
    for text in (str(error), repr(error), repr(error.args)):
        assert SECRET not in text


@pytest.mark.parametrize(("raw", "stop", "doc", "expected"), SECRET_PARAMS, ids=SECRET_IDS)
def test_privacy_no_chained_exceptions(raw: str, stop: str, doc: ExtractedDocument, expected: str) -> None:
    """The nested example exercises the ValidationError path; the others cover JSON parsing."""
    with pytest.raises(PassFailure) as caught:
        validate_output(reply(raw, stop), doc)
    assert caught.value.__context__ is None
    assert caught.value.__cause__ is None
    assert caught.value.__suppress_context__ is False


def test_privacy_no_logs_or_output(caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]) -> None:
    caplog.set_level(logging.DEBUG)
    run(ai_dict(text=SECRET))
    run(ai_dict(text=SECRET, pages=[], summary_pages=[]), text_doc())
    for raw, stop, doc, expected in SECRET_PARAMS:
        with pytest.raises(PassFailure) as caught:
            validate_output(reply(raw, stop), doc)
        assert caught.value.code == expected
    assert caplog.records == []
    assert SECRET not in caplog.text
    captured = capsys.readouterr()
    assert captured.out == "" and captured.err == ""
    assert "logging" not in _imports(Path(stage5_gates.__file__))


def make_request() -> ConnectorRequest:
    return ConnectorRequest(
        system="SYSTEM",
        document_block="DOC",
        inputs=GenerationInputs(course_code="", detail_level="standard", output_language="nb"),
    )


def test_fake_connector_chain() -> None:
    ok = FakeConnector(raw_json=json.dumps(ai_dict())).generate(make_request())
    assert isinstance(validate_output(ok, pdf_doc()), ValidatedResults)
    cases = [
        (json.dumps(ai_dict()), "length", INVALID),
        ("{", "complete", INVALID),
        (json.dumps({"status": INSUFFICIENT}), "complete", INSUFFICIENT),
        (json.dumps(ai_dict(count=4)), "complete", INVALID),
    ]
    for raw, stop, code in cases:
        fake_reply = FakeConnector(raw_json=raw, stop=stop).generate(make_request())  # type: ignore[arg-type]
        with pytest.raises(PassFailure) as caught:
            validate_output(fake_reply, pdf_doc())
        assert caught.value.code == code


# --- Import boundary and wording -----------------------------------------------------------


def _imports(path: Path) -> list[str]:
    names: list[str] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            assert node.level == 0, path.name
            names.append(node.module or "")
    return names


def _inside(name: str, boundary: str) -> bool:
    return name == boundary or name.startswith(boundary + ".")


@pytest.mark.parametrize(
    ("module", "allowed"),
    [(stage5_gates, ("app.contracts", "app.pipeline")), (results_module, ("app.contracts",))],
    ids=["stage5_gates", "results"],
)
def test_import_boundary(module: Any, allowed: tuple[str, ...]) -> None:
    names = _imports(Path(module.__file__))
    assert names, "no imports found"
    for name in names:
        assert name != "app" and name.split(".")[0] != "logging", name
        if _inside(name, "app"):
            assert any(_inside(name, boundary) for boundary in allowed), name
        assert not any(_inside(name, bad) for bad in ("app.api", "app.connectors", "app.config")), name


FORBIDDEN = ("citation" + " verification", "content" + " verification")


def _docstrings(tree: ast.AST) -> list[str]:
    texts: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            doc = ast.get_docstring(node)
            if doc:
                texts.append(doc)
    return texts


def _comments(source: str) -> list[str]:
    return [tok.string for tok in tokenize.generate_tokens(io.StringIO(source).readline) if tok.type == tokenize.COMMENT]


def test_wording_page_marker_validation() -> None:
    texts: list[str] = []
    for module in (stage5_gates, results_module):
        source = Path(module.__file__).read_text(encoding="utf-8")
        texts += _docstrings(ast.parse(source)) + _comments(source)
    test_tree = ast.parse(Path(__file__).read_text(encoding="utf-8"))
    texts += _docstrings(test_tree)
    texts += [node.name for node in ast.walk(test_tree) if isinstance(node, ast.FunctionDef)]
    assert len(texts) > 10
    for text in texts:
        for phrase in FORBIDDEN:
            assert phrase not in text.lower(), text
    module_doc = (stage5_gates.__doc__ or "").lower()
    assert "page-marker validation" in module_doc
    assert "does not check that the page supports the item" in module_doc
    assert "semantic" in module_doc
