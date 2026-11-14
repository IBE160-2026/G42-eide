"""Story 1.9: connector contracts, AD-9 output models, the fake connector and import rules.

One test (or one parametrised test) per row of the spec's I/O & Edge-Case Matrix, in the
same order. Secrets in these tests are marker strings only.
"""

import ast
import json
import logging
import pickle
import re
import sys
from enum import IntEnum
from pathlib import Path
from typing import Any, get_args, get_origin

import pytest
from pydantic import BaseModel, ValidationError

import app
import app.contracts as contracts_package
import app.pipeline as pipeline_package
from app.contracts.ai_output import AiOutput, Flashcard, KeyConcept, QuizItem, Summary
from app.contracts.connector import (
    CONNECTOR_ERROR_CODES,
    STOP_REASONS,
    Connector,
    ConnectorError,
    ConnectorReply,
    ConnectorRequest,
)
from app.contracts.errors import ERROR_CODES
from app.contracts.inputs import GenerationInputs
from app.pipeline import stage3_prompt
from tests import _fake_connectors
from tests._fake_connectors import FakeConnector

APPROVED_CODES = ("ai_unavailable", "ai_rate_limited", "ai_credits_exhausted")
UNKNOWN_CODE_MESSAGE = "unknown connector error code"
AI_MODELS = (AiOutput, Summary, Flashcard, QuizItem, KeyConcept)


def make_request(
    *, system: str = "SYSTEM", document_block: str = "DOC", course_code: str = ""
) -> ConnectorRequest:
    return ConnectorRequest(
        system=system,
        document_block=document_block,
        inputs=GenerationInputs(
            course_code=course_code, detail_level="standard", output_language="nb"
        ),
    )


def reply_fields(**overrides: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "raw_json": '{"a": 1}',
        "stop": "complete",
        "input_tokens": 10,
        "output_tokens": 20,
    }
    fields.update(overrides)
    return fields


def ai_output_dict(status: str = "ok") -> dict[str, Any]:
    return {
        "status": status,
        "summary": {"text": "Sammendrag om lager", "pages": [1]},
        "flashcards": [{"front": "Hva er sikkerhetslager?", "back": "En buffer.", "pages": [1]}],
        "quiz": [{"question": "Hva er EOQ?", "answer": "Optimal ordrestørrelse.", "pages": [2]}],
        "key_concepts": [{"term": "Ledetid", "explanation": "Tid fra ordre.", "pages": [1, 2]}],
    }


def _remove(data: dict[str, Any], path: tuple[Any, ...]) -> dict[str, Any]:
    target: Any = data
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    return data


def _set(data: dict[str, Any], path: tuple[Any, ...], value: Any) -> dict[str, Any]:
    target: Any = data
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return data


# --- ConnectorReply ------------------------------------------------------------------------


@pytest.mark.parametrize("stop", ["complete", "length", "refusal", "other"])
@pytest.mark.parametrize("tokens", [0, 1234])
@pytest.mark.parametrize("raw_json", ['{"a": 1}', "not json {", "  padded  ", ""])
def test_reply_valid(stop: str, tokens: int, raw_json: str) -> None:
    reply = ConnectorReply(raw_json=raw_json, stop=stop, input_tokens=tokens, output_tokens=tokens)
    assert type(reply.raw_json) is str
    assert reply.raw_json == raw_json
    assert reply.stop == stop
    assert (reply.input_tokens, reply.output_tokens) == (tokens, tokens)


@pytest.mark.parametrize("stop", ["stop", "COMPLETE", "", None])
def test_reply_invalid_stop(stop: object) -> None:
    with pytest.raises(ValidationError):
        ConnectorReply(**reply_fields(stop=stop))


@pytest.mark.parametrize("field", ["input_tokens", "output_tokens"])
@pytest.mark.parametrize("value", [-1, True, 1.0, "1", None])
def test_reply_token_strictness_python(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        ConnectorReply(**reply_fields(**{field: value}))


def _reply_json(field: str, value: str) -> str:
    other = "output_tokens" if field == "input_tokens" else "input_tokens"
    return f'{{"raw_json": "x", "stop": "complete", "{field}": {value}, "{other}": 1}}'


@pytest.mark.parametrize("field", ["input_tokens", "output_tokens"])
def test_reply_token_json_template_is_valid(field: str) -> None:
    # Positive control (R3): the same template validates with a valid integer.
    reply = ConnectorReply.model_validate_json(_reply_json(field, "1"))
    assert getattr(reply, field) == 1


@pytest.mark.parametrize("field", ["input_tokens", "output_tokens"])
@pytest.mark.parametrize("value", ["-1", "true", "1.0", '"1"', "null"])
def test_reply_token_strictness_json(field: str, value: str) -> None:
    with pytest.raises(ValidationError) as caught:
        ConnectorReply.model_validate_json(_reply_json(field, value))
    # The failure is on the tested token field, not elsewhere in the template (R3).
    assert [error["loc"] for error in caught.value.errors(include_input=False)] == [(field,)]


@pytest.mark.parametrize("raw_json", [b"{}", {}, None])
def test_reply_raw_json_type(raw_json: object) -> None:
    with pytest.raises(ValidationError):
        ConnectorReply(**reply_fields(raw_json=raw_json))


def test_reply_contract() -> None:
    reply = ConnectorReply(**reply_fields())
    with pytest.raises(ValidationError):
        reply.stop = "length"  # type: ignore[misc]
    with pytest.raises(ValidationError):
        ConnectorReply(**reply_fields(extra="x"))
    for field in ("raw_json", "stop", "input_tokens", "output_tokens"):
        fields = reply_fields()
        del fields[field]
        with pytest.raises(ValidationError):
            ConnectorReply(**fields)
    assert list(ConnectorReply.model_fields) == ["raw_json", "stop", "input_tokens", "output_tokens"]
    assert isinstance(hash(reply), int)


def test_reply_repr_hides_raw_json() -> None:
    reply = ConnectorReply(**reply_fields(raw_json='{"text": "AI-OUTPUT-SECRET"}'))
    assert "AI-OUTPUT-SECRET" not in repr(reply)
    assert "AI-OUTPUT-SECRET" not in str(reply)
    assert "stop='complete'" in repr(reply)
    assert reply.model_dump()["raw_json"] == '{"text": "AI-OUTPUT-SECRET"}'


# --- ConnectorRequest ----------------------------------------------------------------------


def test_request_repr_hides_document_and_inputs() -> None:
    request = make_request(document_block="xx DOC-SECRET xx", course_code="CODE-SECRET")
    for text in (repr(request), str(request)):
        assert "DOC-SECRET" not in text
        assert "CODE-SECRET" not in text
        assert "SYSTEM" in text
    dumped = request.model_dump()
    assert "DOC-SECRET" in dumped["document_block"]
    assert dumped["inputs"]["course_code"] == "CODE-SECRET"


def test_request_contract_unchanged() -> None:
    fields = ConnectorRequest.model_fields
    assert list(fields) == ["system", "document_block", "inputs"]
    assert [fields[name].annotation for name in fields] == [str, str, GenerationInputs]
    assert all(field.is_required() for field in fields.values())
    request = make_request()
    with pytest.raises(ValidationError):
        request.system = "other"  # type: ignore[misc]
    with pytest.raises(ValidationError):
        ConnectorRequest(system="s", document_block="d", inputs=request.inputs, extra="x")
    assert make_request() == make_request()
    assert make_request(document_block="A") != make_request(document_block="B")
    assert isinstance(hash(request), int)


# --- ConnectorError ------------------------------------------------------------------------


@pytest.mark.parametrize("code", APPROVED_CODES)
def test_error_approved_codes(code: str) -> None:
    error = ConnectorError(code)  # type: ignore[arg-type]
    assert isinstance(error, Exception)
    assert error.code == code
    assert str(error) == code
    assert error.args == (code,)
    assert repr(error) == f"ConnectorError({code!r})"
    restored = pickle.loads(pickle.dumps(error))
    assert type(restored) is ConnectorError
    assert restored.code == code
    assert restored.args == (code,)


@pytest.mark.parametrize(
    "code", ["ai_output_invalid", "internal_error", "AI_UNAVAILABLE", "", "PROVIDER-SECRET", None]
)
def test_error_unapproved_codes(code: object) -> None:
    with pytest.raises(ValueError) as caught:
        ConnectorError(code)  # type: ignore[arg-type]
    assert str(caught.value) == UNKNOWN_CODE_MESSAGE


class _CodeWithPayload(str):
    """A str subclass that compares equal to an approved code but carries extra data."""

    secret = "PROVIDER-SECRET"


class _EqualsEverything:
    def __eq__(self, other: object) -> bool:
        return True

    def __hash__(self) -> int:
        return 0

    def __repr__(self) -> str:
        return "PROVIDER-SECRET"


@pytest.mark.parametrize(
    "code",
    [_CodeWithPayload("ai_unavailable"), _EqualsEverything()],
    ids=["str-subclass", "equals-everything"],
)
def test_error_rejects_non_str_codes(code: object) -> None:
    # R1: only an exact built-in str with an approved value is accepted.
    with pytest.raises(ValueError) as caught:
        ConnectorError(code)  # type: ignore[arg-type]
    assert str(caught.value) == UNKNOWN_CODE_MESSAGE
    assert "PROVIDER-SECRET" not in repr(caught.value)


def test_error_takes_no_extra_payload() -> None:
    with pytest.raises(TypeError):
        ConnectorError("ai_unavailable", "provider says x")  # type: ignore[call-arg]
    with pytest.raises(TypeError):
        ConnectorError("ai_unavailable", message="x")  # type: ignore[call-arg]
    with pytest.raises(TypeError):
        ConnectorError()  # type: ignore[call-arg]


def test_error_codes_subset() -> None:
    assert CONNECTOR_ERROR_CODES == APPROVED_CODES
    assert all(code in ERROR_CODES for code in CONNECTOR_ERROR_CODES)
    assert STOP_REASONS == ("complete", "length", "refusal", "other")


# --- AD-9 output models --------------------------------------------------------------------


def test_ai_output_full_ok() -> None:
    data = ai_output_dict()
    output = AiOutput.model_validate_json(json.dumps(data))
    assert output.model_dump() == data
    assert output.status == "ok"
    assert isinstance(output.flashcards[0], Flashcard)
    assert isinstance(output.quiz[0], QuizItem)
    assert isinstance(output.key_concepts[0], KeyConcept)
    assert isinstance(output.summary, Summary)


def test_ai_output_insufficient_content() -> None:
    data = {
        "status": "insufficient_content",
        "summary": {"text": "", "pages": []},
        "flashcards": [],
        "quiz": [],
        "key_concepts": [],
    }
    output = AiOutput.model_validate_json(json.dumps(data))
    assert output.status == "insufficient_content"
    assert output.model_dump() == data


@pytest.mark.parametrize("pages", [[], [0], [-3], [2, 2]])
def test_ai_output_shape_only(pages: list[int]) -> None:
    data = {
        "status": "ok",
        "summary": {"text": "", "pages": pages},
        "flashcards": [{"front": "", "back": "", "pages": pages}],
        "quiz": [{"question": "", "answer": "", "pages": pages}],
        "key_concepts": [{"term": "", "explanation": "", "pages": pages}],
    }
    output = AiOutput.model_validate_json(json.dumps(data))
    assert output.model_dump() == data
    empty = {**data, "flashcards": [], "quiz": [], "key_concepts": []}
    assert AiOutput.model_validate_json(json.dumps(empty)).model_dump() == empty


@pytest.mark.parametrize("status", ["OK", "error", None])
def test_ai_output_invalid_status(status: object) -> None:
    with pytest.raises(ValidationError):
        AiOutput.model_validate_json(json.dumps(_set(ai_output_dict(), ("status",), status)))


MISSING_PATHS = [
    ("status",),
    ("summary",),
    ("flashcards",),
    ("quiz",),
    ("key_concepts",),
    ("summary", "text"),
    ("summary", "pages"),
    ("flashcards", 0, "front"),
    ("flashcards", 0, "back"),
    ("flashcards", 0, "pages"),
    ("quiz", 0, "question"),
    ("quiz", 0, "answer"),
    ("quiz", 0, "pages"),
    ("key_concepts", 0, "term"),
    ("key_concepts", 0, "explanation"),
    ("key_concepts", 0, "pages"),
]


@pytest.mark.parametrize("path", MISSING_PATHS, ids=lambda path: ".".join(map(str, path)))
def test_ai_output_missing_field(path: tuple[Any, ...]) -> None:
    with pytest.raises(ValidationError):
        AiOutput.model_validate_json(json.dumps(_remove(ai_output_dict(), path)))


@pytest.mark.parametrize(
    "path",
    [(), ("summary",), ("flashcards", 0), ("quiz", 0), ("key_concepts", 0)],
    ids=["top", "summary", "flashcard", "quiz", "key_concept"],
)
def test_ai_output_extra_field(path: tuple[Any, ...]) -> None:
    data = ai_output_dict()
    target: Any = data
    for key in path:
        target = target[key]
    target["extra"] = "x"
    with pytest.raises(ValidationError):
        AiOutput.model_validate_json(json.dumps(data))


PAGES_PATHS = [
    ("summary", "pages"),
    ("flashcards", 0, "pages"),
    ("quiz", 0, "pages"),
    ("key_concepts", 0, "pages"),
]


@pytest.mark.parametrize("path", PAGES_PATHS, ids=lambda path: str(path[0]))
@pytest.mark.parametrize("bad", ["1", 1.0, True, None])
def test_ai_output_page_strictness(path: tuple[Any, ...], bad: object) -> None:
    data = _set(ai_output_dict(), path, [bad])
    with pytest.raises(ValidationError):
        AiOutput.model_validate_json(json.dumps(data))


ITEM_FIELDS: list[tuple[type[BaseModel], dict[str, str]]] = [
    (Summary, {"text": "t"}),
    (Flashcard, {"front": "f", "back": "b"}),
    (QuizItem, {"question": "q", "answer": "a"}),
    (KeyConcept, {"term": "t", "explanation": "e"}),
]


@pytest.mark.parametrize(("model", "texts"), ITEM_FIELDS, ids=lambda value: getattr(value, "__name__", ""))
@pytest.mark.parametrize("bad", ["1", 1.0, True, None])
def test_ai_item_page_strictness_python(
    model: type[BaseModel], texts: dict[str, str], bad: object
) -> None:
    # R6: the Python path (model_validate / constructor) is as strict as the JSON path.
    assert model(**texts, pages=[1, 2]).pages == [1, 2]  # type: ignore[attr-defined]
    with pytest.raises(ValidationError):
        model(**texts, pages=[bad])
    with pytest.raises(ValidationError):
        model.model_validate({**texts, "pages": [bad]})


SECRET = "AI-SECRET-TEXT"
HIDDEN_INPUT_CASES = {
    "summary-as-string": json.dumps({**ai_output_dict(), "summary": SECRET}),
    "extra-key": json.dumps({**ai_output_dict(), "leak": SECRET}),
    "malformed-json": '{"status": "ok", "summary": ' + SECRET,
}


@pytest.mark.parametrize("text", HIDDEN_INPUT_CASES.values(), ids=HIDDEN_INPUT_CASES.keys())
def test_ai_output_hidden_input(text: str) -> None:
    with pytest.raises(ValidationError) as caught:
        AiOutput.model_validate_json(text)
    error = caught.value
    assert SECRET not in str(error)
    assert SECRET not in repr(error)
    # The documented limit (V1): errors() and json() still carry the input by default.
    assert SECRET in repr(error.errors())
    assert SECRET in error.json()
    assert SECRET not in repr(error.errors(include_input=False))
    assert SECRET not in error.json(include_input=False)


@pytest.mark.parametrize("model", AI_MODELS, ids=lambda model: model.__name__)
def test_ai_models_config(model: type[BaseModel]) -> None:
    assert model.model_config.get("hide_input_in_errors") is True
    assert model.model_config.get("extra") == "forbid"
    assert model.model_config.get("frozen") is True


EXPECTED_KEYS = [
    "status",
    "summary",
    "text",
    "pages",
    "flashcards",
    "front",
    "back",
    "pages",
    "quiz",
    "question",
    "answer",
    "pages",
    "key_concepts",
    "term",
    "explanation",
    "pages",
]


def _response_block_keys() -> list[str]:
    lines = stage3_prompt.SYSTEM_TEMPLATE.split("\n")
    starts = [i for i, line in enumerate(lines) if line.startswith('  {"status"')]
    ends = [i for i, line in enumerate(lines) if '"key_concepts"' in line]
    assert len(starts) == 1 and len(ends) == 1 and starts[0] <= ends[0]
    block = "\n".join(lines[starts[0] : ends[0] + 1])
    return re.findall(r'"(\w+)":', block)


def _model_keys(model: type[BaseModel]) -> list[str]:
    keys: list[str] = []
    for name, field in model.model_fields.items():
        keys.append(name)
        annotation = field.annotation
        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            keys.extend(_model_keys(annotation))
        elif get_origin(annotation) is list:
            (item,) = get_args(annotation)
            if isinstance(item, type) and issubclass(item, BaseModel):
                keys.extend(_model_keys(item))
    return keys


def test_ai_output_field_names_match_d11() -> None:
    assert _response_block_keys() == EXPECTED_KEYS
    assert _model_keys(AiOutput) == EXPECTED_KEYS


def test_ai_output_frozen() -> None:
    output = AiOutput.model_validate_json(json.dumps(ai_output_dict()))
    targets = [
        (output, "status", "insufficient_content"),
        (output.summary, "text", "x"),
        (output.flashcards[0], "front", "x"),
        (output.quiz[0], "answer", "x"),
        (output.key_concepts[0], "term", "x"),
    ]
    for model, field, value in targets:
        with pytest.raises(ValidationError):
            setattr(model, field, value)
    # Frozen is shallow: models holding lists can't be hashed (V3).
    with pytest.raises(TypeError):
        hash(output.summary)


# --- FakeConnector -------------------------------------------------------------------------


def test_fake_satisfies_protocol() -> None:
    assert isinstance(FakeConnector(raw_json="{}"), Connector)


@pytest.mark.parametrize("stop", ["complete", "length", "refusal", "other"])
def test_fake_returns_chosen_reply(stop: str) -> None:
    fake = FakeConnector(raw_json="CHOSEN not json", stop=stop, input_tokens=7, output_tokens=9)  # type: ignore[arg-type]
    first = fake.generate(make_request())
    assert isinstance(first, ConnectorReply)
    assert (first.raw_json, first.stop, first.input_tokens, first.output_tokens) == (
        "CHOSEN not json",
        stop,
        7,
        9,
    )
    assert fake.generate(make_request()) is first


def test_fake_fixed_token_count() -> None:
    fake = FakeConnector(raw_json="{}", token_count=4321)
    assert [fake.count_input_tokens(make_request()) for _ in range(3)] == [4321, 4321, 4321]


@pytest.mark.parametrize("code", APPROVED_CODES)
def test_fake_generate_errors(code: str) -> None:
    fake = FakeConnector(raw_json="{}", generate_error=code)  # type: ignore[arg-type]
    request = make_request()
    with pytest.raises(ConnectorError) as caught:
        fake.generate(request)
    assert caught.value.code == code
    assert fake.generate_requests == [request] and fake.generate_requests[0] is request
    assert fake.generate_calls == 1
    assert fake.count_input_tokens(request) == 1000


@pytest.mark.parametrize("code", APPROVED_CODES)
def test_fake_count_errors(code: str) -> None:
    fake = FakeConnector(raw_json="{}", count_error=code)  # type: ignore[arg-type]
    request = make_request()
    with pytest.raises(ConnectorError) as caught:
        fake.count_input_tokens(request)
    assert caught.value.code == code
    assert fake.count_requests[0] is request
    assert fake.count_calls == 1
    assert fake.generate(request).raw_json == "{}"


def test_fake_records_requests() -> None:
    fake = FakeConnector(raw_json="{}")
    first, second, third = (make_request(document_block=f"DOC-{n}") for n in range(3))
    fake.count_input_tokens(first)
    fake.generate(first)
    fake.generate(second)
    fake.count_input_tokens(third)
    assert [r is e for r, e in zip(fake.generate_requests, [first, second], strict=True)] == [True, True]
    assert [r is e for r, e in zip(fake.count_requests, [first, third], strict=True)] == [True, True]
    assert (fake.count_calls, fake.generate_calls) == (2, 2)
    fresh = FakeConnector(raw_json="{}")
    assert (fresh.count_requests, fresh.generate_requests) == ([], [])
    assert (fresh.count_calls, fresh.generate_calls) == (0, 0)


def test_fake_ignores_inputs() -> None:
    fake = FakeConnector(raw_json="{}")
    plain = fake.generate(make_request(course_code=""))
    with_code = fake.generate(make_request(course_code="CODE-SECRET"))
    assert plain is with_code
    assert fake.count_input_tokens(make_request(course_code="")) == fake.count_input_tokens(
        make_request(course_code="CODE-SECRET")
    )


class _Tokens(IntEnum):
    FIVE = 5


def _override_id(overrides: dict[str, Any]) -> str:
    return next(iter(overrides)) + "=" + repr(next(iter(overrides.values())))


@pytest.mark.parametrize(
    "overrides",
    [
        {"raw_json": b"{}"},
        {"raw_json": None},
        {"stop": "stop"},
        {"input_tokens": -1},
        {"input_tokens": True},
        {"output_tokens": -1},
        {"output_tokens": True},
    ],
    ids=_override_id,
)
def test_fake_invalid_reply_config(overrides: dict[str, Any]) -> None:
    # Reply fields are checked by ConnectorReply at construction: Pydantic's ValidationError
    # (a ValueError subclass), before any call (R6).
    arguments: dict[str, Any] = {"raw_json": "{}", **overrides}
    with pytest.raises(ValidationError):
        FakeConnector(**arguments)


@pytest.mark.parametrize(
    "overrides",
    [
        {"token_count": -1},
        {"token_count": True},
        {"token_count": _Tokens.FIVE},
        {"count_error": "ai_output_invalid"},
        {"generate_error": "internal_error"},
    ],
    ids=_override_id,
)
def test_fake_invalid_own_config(overrides: dict[str, Any]) -> None:
    # The fake's own checks raise a plain ValueError, not a ValidationError (R2, R6).
    arguments: dict[str, Any] = {"raw_json": "{}", **overrides}
    with pytest.raises(ValueError) as caught:
        FakeConnector(**arguments)
    assert type(caught.value) is ValueError


def test_fake_requires_raw_json() -> None:
    with pytest.raises(TypeError):
        FakeConnector()  # type: ignore[call-arg]


def test_fake_writes_no_logs(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    request = make_request(document_block="DOC-SECRET", course_code="CODE-SECRET")
    fake = FakeConnector(raw_json="AI-OUTPUT-SECRET")
    fake.count_input_tokens(request)
    fake.generate(request)
    for code in APPROVED_CODES:
        failing = FakeConnector(raw_json="{}", count_error=code, generate_error=code)  # type: ignore[arg-type]
        with pytest.raises(ConnectorError):
            failing.count_input_tokens(request)
        with pytest.raises(ConnectorError):
            failing.generate(request)
    assert caplog.records == []
    source = Path(_fake_connectors.__file__).read_text(encoding="utf-8")
    assert all(_top(name) != "logging" for name in imported_names(source))


# --- Import-boundary scanner (D8, D10, F5) -------------------------------------------------

RELATIVE = "<relative import>"
BARE_APP = "<bare import app>"
SENTINELS = (RELATIVE, BARE_APP)


def imported_names(source: str) -> list[str]:
    """Every imported module name in ``source``, from every AST node (not only top level)."""
    names: list[str] = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Import):
            names.extend(BARE_APP if alias.name == "app" else alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level != 0:
                names.append(RELATIVE)
            elif node.module == "app":
                names.extend(f"app.{alias.name}" for alias in node.names)
            else:
                names.append(node.module or "")
    return names


def _inside(name: str, boundary: str) -> bool:
    return name == boundary or name.startswith(boundary + ".")


def _top(name: str) -> str:
    return name.split(".")[0]


def pipeline_allows(name: str) -> bool:
    if name in SENTINELS:
        return False
    if _inside(name, "app"):
        return _inside(name, "app.contracts") or _inside(name, "app.pipeline") or name == "app.config"
    return _top(name) in sys.stdlib_module_names or _top(name) in {"pydantic", "pypdf"}


def contracts_allows(name: str) -> bool:
    """The D1 rule; also the F5 rule for ``app/config.py``: app imports only from contracts."""
    if name in SENTINELS:
        return False
    return not _inside(name, "app") or _inside(name, "app.contracts")


def sdk_allows(name: str) -> bool:
    return name not in SENTINELS and _top(name) != "anthropic"


APP_DIR = Path(app.__file__).parent
CONTRACTS_DIR = Path(contracts_package.__file__).parent
PIPELINE_DIR = Path(pipeline_package.__file__).parent
CONFIG_FILE = APP_DIR / "config.py"
REAL_CONNECTOR = APP_DIR / "connectors" / "real.py"
EXPECTED_CONTRACTS = {"__init__.py", "connector.py", "inputs.py", "options.py", "errors.py", "ai_output.py"}
EXPECTED_PIPELINE = {
    "__init__.py",
    "failures.py",
    "stage1_validate.py",
    "stage2_extract.py",
    "stage3_prompt.py",
}


def _python_files(directory: Path, expected: set[str]) -> list[Path]:
    files = sorted(directory.rglob("*.py"))
    assert expected <= {path.name for path in files}, "expected modules not found"
    return files


def _violations(files: list[Path], allows: Any) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for path in files:
        for name in imported_names(path.read_text(encoding="utf-8")):
            if not allows(name):
                found.append((path.relative_to(APP_DIR).as_posix(), name))
    return found


def test_contracts_import_boundary() -> None:
    files = _python_files(CONTRACTS_DIR, EXPECTED_CONTRACTS)
    assert _violations(files, contracts_allows) == []


def test_pipeline_import_allowlist() -> None:
    files = _python_files(PIPELINE_DIR, EXPECTED_PIPELINE)
    assert _violations(files, pipeline_allows) == []


def test_config_import_boundary() -> None:
    assert CONFIG_FILE.is_file()
    assert _violations([CONFIG_FILE], contracts_allows) == []


def test_sdk_isolation() -> None:
    assert CONFIG_FILE.is_file() and CONTRACTS_DIR.is_dir() and PIPELINE_DIR.is_dir()
    files = [path for path in _python_files(APP_DIR, {"config.py"}) if path != REAL_CONNECTOR]
    assert {CONTRACTS_DIR, PIPELINE_DIR} <= {path.parent for path in files}
    assert _violations(files, sdk_allows) == []


NESTED_SOURCE = """\
def load():
    import json

try:
    import pypdf
except ImportError:
    pass

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.api import errors
"""

# (source, exact sorted names, pipeline, contracts, config.py, SDK); None = not specified.
SELF_TEST_CASES = [
    (NESTED_SOURCE, ["app.api", "json", "pypdf", "typing"], False, None, None, None),
    ("from . import x", [RELATIVE], False, False, False, False),
    ("import pydantic_settings", ["pydantic_settings"], False, None, None, None),
    ("import app.config_x", ["app.config_x"], False, None, None, None),
    ("import app.contracts_evil", ["app.contracts_evil"], None, False, None, None),
    ("import anthropic.types", ["anthropic.types"], False, None, None, False),
    ("from anthropic import Anthropic", ["anthropic"], False, None, None, False),
    ("import app", [BARE_APP], False, False, False, False),
    ("import pydantic.fields", ["pydantic.fields"], True, None, None, None),
    ("from app import config", ["app.config"], True, False, False, None),
    ("import app.config.sub", ["app.config.sub"], False, None, None, None),
    ("from app.contracts import errors", ["app.contracts"], True, True, True, None),
]


@pytest.mark.parametrize(
    ("source", "names", "pipeline", "contracts", "config", "sdk"),
    SELF_TEST_CASES,
    ids=[case[0].splitlines()[0] for case in SELF_TEST_CASES],
)
def test_scanner_self_test(
    source: str,
    names: list[str],
    pipeline: bool | None,
    contracts: bool | None,
    config: bool | None,
    sdk: bool | None,
) -> None:
    extracted = imported_names(source)
    assert sorted(extracted) == names
    for expected, allows in ((pipeline, pipeline_allows), (contracts, contracts_allows), (config, contracts_allows), (sdk, sdk_allows)):
        if expected is not None:
            assert all(allows(name) for name in extracted) is expected


def test_contracts_write_no_logs() -> None:
    for path in _python_files(CONTRACTS_DIR, EXPECTED_CONTRACTS):
        names = imported_names(path.read_text(encoding="utf-8"))
        assert all(_top(name) != "logging" for name in names), path.name


def test_contracts_docstring_states_a9() -> None:
    docstring = contracts_package.__doc__ or ""
    assert "imports from the app only other app.contracts modules" in docstring
    assert "imports nothing from the app" not in docstring
