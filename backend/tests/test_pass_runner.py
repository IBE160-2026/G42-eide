"""Story 1.11: run_pass, stage 4 and stage 6, PassGuard and the PassFailure handler.

One test (or one parametrised test) per new-behaviour row of the spec's I/O matrix, in the
same order. The rows "Existing handlers unchanged" and "Unchanged earlier stages" are
satisfied by rerunning the existing suite. Every ``run_pass`` call happens outside any
``except`` block. Secrets are marker strings only.

Every ``PassGuard`` built during these tests uses a substitute lock that records each
``acquire`` call and never waits: a regression to a blocking or timed acquire fails the
test at teardown instead of hanging it.
"""

import ast
import json
import logging
import sys
import threading
import time
import types
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.testclient import TestClient
from pydantic import ValidationError

import app.pipeline.pass_guard as pass_guard_module
import app.pipeline.pass_runner as pass_runner
from app.application import create_app
from app.config import Settings
from app.contracts.ai_output import AiOutput
from app.contracts.connector import ConnectorError, ConnectorReply, ConnectorRequest
from app.contracts.errors import HTTP_STATUS, MESSAGES
from app.contracts.inputs import GenerationInputs
from app.contracts.responses import GenerationResponse
from app.contracts.results import ValidatedResults
from app.pipeline.failures import PassFailure
from app.pipeline.pass_guard import PassGuard
from app.pipeline.pass_runner import PassRunner, respond
from app.pipeline.stage2_extract import ExtractedDocument
from app.pipeline.stage3_prompt import read_generation_inputs
from app.pipeline.stage5_gates import validate_output as stage5_validate_output
from tests._fake_connectors import FakeConnector
from tests._fakes import FAKE_KEY
from tests._pdf import BROKEN_PDF, IMAGE, make_pdf

SECRET = "PASS-SECRET"
ORDER = ["validate_bytes", "extract_document", "build_request", "generate", "validate_output", "respond"]
STAGE_NAMES = ("validate_bytes", "extract_document", "build_request", "validate_output", "respond")
# Captured once at import, before any test patches the module (R5).
REAL_STAGES: dict[str, Callable[..., Any]] = {name: getattr(pass_runner, name) for name in STAGE_NAMES}
APPROVED_CONNECTOR_CODES = ("ai_unavailable", "ai_rate_limited", "ai_credits_exhausted")
ITEM_FIELDS = {"flashcards": ("front", "back"), "quiz": ("question", "answer"), "key_concepts": ("term", "explanation")}
ORIGIN = "http://localhost:3000"
NON_BLOCKING = (False, -1)


# --- never-blocking guard lock (R2) ---------------------------------------------------------


class _NeverBlockingLock:
    """Stands in for ``threading.Lock`` inside ``PassGuard``: records every ``acquire`` call
    and never waits, so mutual exclusion is real but no test can hang on the guard."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.acquire_calls: list[tuple[bool, float]] = []

    def acquire(self, blocking: bool = True, timeout: float = -1) -> bool:
        self.acquire_calls.append((blocking, timeout))
        return self._lock.acquire(blocking=False)

    def release(self) -> None:
        self._lock.release()

    def locked(self) -> bool:
        return self._lock.locked()


@pytest.fixture(autouse=True)
def guard_locks(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[_NeverBlockingLock]]:
    created: list[_NeverBlockingLock] = []

    def make_lock() -> _NeverBlockingLock:
        lock = _NeverBlockingLock()
        created.append(lock)
        return lock

    monkeypatch.setattr(pass_guard_module, "threading", types.SimpleNamespace(Lock=make_lock))
    yield created
    calls = [call for lock in created for call in lock.acquire_calls]
    assert all(call == NON_BLOCKING for call in calls), "PassGuard must acquire with blocking=False only"


# --- builders ------------------------------------------------------------------------------


def reply_json(*, pages: list[int] | None = None, text: str = "Tekst", status: str = "ok") -> str:
    item_pages = [1] if pages is None else pages
    data: dict[str, Any] = {"status": status, "summary": {"text": f"Sammendrag {text}", "pages": list(item_pages)}}
    for name, (first, second) in ITEM_FIELDS.items():
        data[name] = [
            {first: f"{first} {i} {text}", second: f"{second} {i} {text}", "pages": list(item_pages)}
            for i in range(5)
        ]
    return json.dumps(data)


def default_pdf(text: str = "Lager og logistikk") -> bytes:
    return make_pdf(text, IMAGE, f"Side tre {text}")


def plain_text(text: str = "Lager og logistikk") -> bytes:
    return f"{text}\n".encode()


def inputs() -> GenerationInputs:
    return read_generation_inputs(course_code=None, detail_level=None, output_language=None)


class RecordingConnector:
    """Delegates to a FakeConnector, appends "count"/"generate" to a shared event list and
    keeps every reply it returned (R4)."""

    def __init__(self, fake: FakeConnector, events: list[str]) -> None:
        self.fake = fake
        self.events = events
        self.replies: list[ConnectorReply] = []

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        self.events.append("count")
        return self.fake.count_input_tokens(request)

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        self.events.append("generate")
        reply = self.fake.generate(request)
        self.replies.append(reply)
        return reply


class Harness:
    """A runner whose stage calls are recorded. Each harness installs its own recorders over
    the real stage functions before every run, so harnesses never wrap each other (R5)."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch, settings: Settings, fake: FakeConnector) -> None:
        self.monkeypatch = monkeypatch
        self.events: list[str] = []
        self.calls: dict[str, tuple[Any, ...]] = {}
        self.returns: dict[str, Any] = {}
        self.fake = fake
        self.connector = RecordingConnector(fake, self.events)
        self.guard = PassGuard()
        self.settings = settings
        self.runner = PassRunner(connector=self.connector, settings=settings, guard=self.guard)
        self.install()

    def install(self) -> None:
        for name in STAGE_NAMES:
            self.monkeypatch.setattr(pass_runner, name, self._recorder(name, REAL_STAGES[name]))

    def _recorder(self, name: str, real: Callable[..., Any]) -> Callable[..., Any]:
        def recorded(*args: Any, **kwargs: Any) -> Any:
            self.events.append(name)
            self.calls[name] = (args, kwargs, sys.exc_info())
            result = real(*args, **kwargs)
            self.returns[name] = result
            return result

        return recorded

    def run(self, doc: bytes | None = None, filename: str = "notat.pdf", source: Any = "upload") -> GenerationResponse:
        self.install()
        return self.runner.run_pass(default_pdf() if doc is None else doc, filename, inputs(), source)

    def fail(self, doc: bytes | None = None, filename: str = "notat.pdf") -> PassFailure:
        with pytest.raises(PassFailure) as caught:
            self.run(doc, filename)
        return caught.value

    def raises(self, kind: type[BaseException], doc: bytes | None = None, filename: str = "notat.pdf") -> BaseException:
        with pytest.raises(kind) as caught:
            self.run(doc, filename)
        return caught.value


@pytest.fixture
def harness(monkeypatch: pytest.MonkeyPatch, make_settings: Callable[..., Settings]) -> Callable[..., Harness]:
    def build(fake: FakeConnector | None = None, **settings: Any) -> Harness:
        return Harness(monkeypatch, make_settings(**settings), fake or FakeConnector(raw_json=reply_json()))

    return build


def frame_locals_hold(error: BaseException, kinds: tuple[type, ...]) -> bool:
    tb = error.__traceback__
    while tb is not None:
        if any(isinstance(value, kinds) for value in dict(tb.tb_frame.f_locals).values()):
            return True
        tb = tb.tb_next
    return False


def wait_or_fail(event: threading.Event, what: str) -> None:
    """A bounded wait whose side effect never sits inside an ``assert`` (R6)."""
    if not event.wait(timeout=5):
        raise AssertionError(f"timed out waiting for {what}")


# --- order and stage arguments -------------------------------------------------------------


def test_order_pdf_success(harness: Callable[..., Harness]) -> None:
    h = harness()
    result = h.run()
    assert h.events == ORDER
    assert isinstance(result, GenerationResponse)
    assert h.fake.count_calls == 0


def test_order_plain_text_success(harness: Callable[..., Harness]) -> None:
    h = harness(FakeConnector(raw_json=reply_json(pages=[])))
    result = h.run(plain_text(), "notat.txt")
    assert h.events == ORDER
    assert result.skipped_pages == ()
    assert h.fake.count_calls == 0


def test_stage_arguments(harness: Callable[..., Harness]) -> None:
    h = harness()
    given = inputs()
    h.install()
    result = h.runner.run_pass(default_pdf(), "notat.pdf", given, "upload")
    (_, stage1_kwargs, _) = h.calls["validate_bytes"]
    assert stage1_kwargs == {"max_pdf_pages": h.settings.max_pdf_pages}
    (_, stage2_kwargs, _) = h.calls["extract_document"]
    assert stage2_kwargs == {"max_text_chars": h.settings.max_text_chars}
    (stage3_args, _, _) = h.calls["build_request"]
    extracted = h.returns["extract_document"]
    assert isinstance(extracted, ExtractedDocument)
    assert stage3_args[0] is extracted
    assert stage3_args[1] is given
    # Exactly one generation call; its own request and reply are the ones passed on (R4).
    assert h.fake.generate_calls == 1
    assert len(h.connector.replies) == 1
    assert h.fake.generate_requests[0] is h.returns["build_request"]
    (stage5_args, _, _) = h.calls["validate_output"]
    assert stage5_args[0] is h.connector.replies[0]
    assert stage5_args[1] is extracted
    (stage6_args, _, _) = h.calls["respond"]
    assert stage6_args[0] is h.returns["validate_output"]
    assert stage6_args[1] is extracted
    assert stage6_args[2] == h.settings.ai_mode
    assert result is h.returns["respond"]
    assert result.results is h.returns["validate_output"]


# --- stopping at each stage ----------------------------------------------------------------


STAGE1_CASES = [
    (b"\x89PNG\r\n\x1a\n" + b"\x00" * 32, "bilde.txt", {}, ("unsupported_file_type", None)),
    ("blåbær".encode("latin-1"), "notat.txt", {}, ("bad_text_encoding", None)),
    (BROKEN_PDF, "notat.pdf", {}, ("unreadable_file", None)),
    (make_pdf("a", "b", "c"), "notat.pdf", {"max_pdf_pages": 2}, ("file_too_large", "pages")),
]


@pytest.mark.parametrize(("doc", "filename", "settings", "expected"), STAGE1_CASES, ids=["image", "latin1", "broken", "pages"])
def test_stop_at_stage1(harness: Callable[..., Harness], doc: bytes, filename: str, settings: dict[str, Any], expected: tuple[str, str | None]) -> None:
    h = harness(**settings)
    error = h.fail(doc, filename)
    assert (error.code, error.limit) == expected
    assert h.events == ["validate_bytes"]
    assert (h.fake.generate_calls, h.fake.count_calls) == (0, 0)
    assert not h.guard.locked()


STAGE2_CASES = [
    (make_pdf(IMAGE, IMAGE), "notat.pdf", {}, ("no_extractable_text", None)),
    (plain_text("x" * 50), "notat.txt", {"max_text_chars": 10}, ("file_too_large", "characters")),
]


@pytest.mark.parametrize(("doc", "filename", "settings", "expected"), STAGE2_CASES, ids=["no-text", "characters"])
def test_stop_at_stage2(harness: Callable[..., Harness], doc: bytes, filename: str, settings: dict[str, Any], expected: tuple[str, str | None]) -> None:
    h = harness(**settings)
    error = h.fail(doc, filename)
    assert (error.code, error.limit) == expected
    assert h.events == ["validate_bytes", "extract_document"]
    assert (h.fake.generate_calls, h.fake.count_calls) == (0, 0)
    assert not h.guard.locked()


def test_stage3_unexpected_error(monkeypatch: pytest.MonkeyPatch, harness: Callable[..., Harness]) -> None:
    h = harness()

    def broken(*args: Any, **kwargs: Any) -> Any:
        h.events.append("build_request")
        raise RuntimeError("unexpected stage 3 failure")

    h.install()
    monkeypatch.setattr(pass_runner, "build_request", broken)
    with pytest.raises(RuntimeError, match="unexpected stage 3 failure"):
        h.runner.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
    assert h.events == ["validate_bytes", "extract_document", "build_request"]
    assert not h.guard.locked()
    assert h.fake.count_calls == 0


@pytest.mark.parametrize("code", APPROVED_CONNECTOR_CODES)
def test_stop_at_stage4(harness: Callable[..., Harness], code: str) -> None:
    h = harness(FakeConnector(raw_json=reply_json(), generate_error=code))  # type: ignore[arg-type]
    error = h.fail()
    assert error.code == code
    assert h.events == ORDER[:4]
    assert (h.fake.generate_calls, h.fake.count_calls) == (1, 0)
    assert not h.guard.locked()


@pytest.mark.parametrize("code", APPROVED_CONNECTOR_CODES)
def test_stage4_no_chaining(harness: Callable[..., Harness], code: str) -> None:
    h = harness(FakeConnector(raw_json=reply_json(), generate_error=code))  # type: ignore[arg-type]
    error = h.fail()
    assert error.__context__ is None
    assert error.__cause__ is None
    assert error.__suppress_context__ is False
    assert not frame_locals_hold(error, (ConnectorError,))
    assert vars(error) == {"code": code, "limit": None}


class _SecretCode(str):
    def __format__(self, spec: str) -> str:
        return SECRET

    def __str__(self) -> str:
        return SECRET

    def __repr__(self) -> str:
        return SECRET


class _MutatingConnector:
    def __init__(self, mutate: Callable[[ConnectorError], None]) -> None:
        self.mutate = mutate

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        raise AssertionError("count_input_tokens must not be called")

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        error = ConnectorError("ai_unavailable")
        self.mutate(error)
        raise error


INVALID_CODES: dict[str, Callable[[ConnectorError], None]] = {
    "internal_error": lambda e: setattr(e, "code", "internal_error"),
    "not_found": lambda e: setattr(e, "code", "not_found"),
    "empty": lambda e: setattr(e, "code", ""),
    "none": lambda e: setattr(e, "code", None),
    "str-subclass": lambda e: setattr(e, "code", _SecretCode("ai_unavailable")),
    "deleted": lambda e: delattr(e, "code"),
}


@pytest.mark.parametrize("mutate", INVALID_CODES.values(), ids=INVALID_CODES.keys())
def test_stage4_invalid_error_code(harness: Callable[..., Harness], mutate: Callable[[ConnectorError], None]) -> None:
    h = harness()
    h.runner = PassRunner(connector=_MutatingConnector(mutate), settings=h.settings, guard=h.guard)
    error = h.raises(TypeError)
    assert str(error) == "connector raised an invalid error code"
    for text in (str(error), repr(error), repr(error.args)):
        assert SECRET not in text
    assert error.__context__ is None
    assert error.__cause__ is None
    assert not frame_locals_hold(error, (ConnectorError, _SecretCode))
    assert "validate_output" not in h.events and "respond" not in h.events
    assert not h.guard.locked()


class _ReturningConnector:
    def __init__(self, value: Any) -> None:
        self.value = value

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        raise AssertionError("count_input_tokens must not be called")

    def generate(self, request: ConnectorRequest) -> Any:
        return self.value


INVALID_REPLIES = [None, {"raw_json": "{}"}, AiOutput.model_validate_json(reply_json())]


@pytest.mark.parametrize("value", INVALID_REPLIES, ids=["none", "dict", "ai-output"])
def test_stage4_invalid_reply(harness: Callable[..., Harness], value: Any) -> None:
    h = harness()
    h.runner = PassRunner(connector=_ReturningConnector(value), settings=h.settings, guard=h.guard)
    error = h.raises(TypeError)
    assert str(error) == "connector must return a ConnectorReply"
    assert error.__context__ is None
    assert "validate_output" not in h.events and "respond" not in h.events
    assert not h.guard.locked()


class _RaisingConnector:
    def count_input_tokens(self, request: ConnectorRequest) -> int:
        raise AssertionError("count_input_tokens must not be called")

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        raise RuntimeError("unexpected connector failure")


def test_stage4_unexpected_error(harness: Callable[..., Harness]) -> None:
    h = harness()
    h.runner = PassRunner(connector=_RaisingConnector(), settings=h.settings, guard=h.guard)
    with pytest.raises(RuntimeError, match="unexpected connector failure"):
        h.run()
    assert "validate_output" not in h.events and "respond" not in h.events
    assert not h.guard.locked()


@pytest.mark.parametrize(
    ("fake", "code"),
    [
        (FakeConnector(raw_json=reply_json(), stop="length"), "ai_output_invalid"),
        (FakeConnector(raw_json=reply_json(status="insufficient_content")), "insufficient_content"),
    ],
    ids=["stop-length", "insufficient"],
)
def test_stop_at_stage5(harness: Callable[..., Harness], fake: FakeConnector, code: str) -> None:
    h = harness(fake)
    assert h.fail().code == code
    assert h.events == ORDER[:5]
    assert h.fake.count_calls == 0
    assert not h.guard.locked()


def test_stage5_outside_except(harness: Callable[..., Harness]) -> None:
    h = harness()
    h.run()
    assert h.calls["validate_output"][2] == (None, None, None)
    failing = harness(FakeConnector(raw_json=reply_json(), stop="length"))
    failing.fail()
    assert failing.calls["validate_output"][2] == (None, None, None)
    assert h.events == ORDER  # the second harness's run didn't leak into the first (R5)


# --- stage 6 -------------------------------------------------------------------------------


def _extracted() -> ExtractedDocument:
    return ExtractedDocument(kind="pdf", text="x", supplied_pages=(1, 3), skipped_pages=(2,))


@pytest.mark.parametrize("value", [AiOutput.model_validate_json(reply_json()), {}, None], ids=["ai-output", "dict", "none"])
def test_stage6_accepts_only_validated_results(monkeypatch: pytest.MonkeyPatch, harness: Callable[..., Harness], value: Any) -> None:
    with pytest.raises(TypeError, match="^stage 6 accepts only ValidatedResults$"):
        respond(value, _extracted(), "demo")
    h = harness()
    h.install()
    monkeypatch.setattr(pass_runner, "validate_output", lambda reply, extracted: value)
    with pytest.raises(TypeError, match="^stage 6 accepts only ValidatedResults$"):
        h.runner.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
    assert not h.guard.locked()


# --- no cost gate --------------------------------------------------------------------------


def test_no_cost_gate(harness: Callable[..., Harness]) -> None:
    paths: list[Harness] = []
    ok = harness()
    ok.run()
    paths.append(ok)
    for doc, filename, settings, _ in STAGE1_CASES + STAGE2_CASES:
        h = harness(**settings)
        h.fail(doc, filename)
        paths.append(h)
    for code in APPROVED_CONNECTOR_CODES:
        h = harness(FakeConnector(raw_json=reply_json(), generate_error=code))  # type: ignore[arg-type]
        h.fail()
        paths.append(h)
    stage5 = harness(FakeConnector(raw_json=reply_json(), stop="length"))
    stage5.fail()
    paths.append(stage5)
    for h in paths:
        assert h.fake.count_calls == 0
        assert "count" not in h.events
    tree = ast.parse(Path(pass_runner.__file__).read_text(encoding="utf-8"))
    names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    attributes = {node.attr for node in ast.walk(tree) if isinstance(node, ast.Attribute)}
    assert "count_input_tokens" not in names | attributes


# --- envelope ------------------------------------------------------------------------------


def test_envelope_shape(harness: Callable[..., Harness]) -> None:
    result = harness().run()
    dumped = result.model_dump(mode="json")
    assert list(dumped) == ["mode", "results", "skipped_pages"]
    assert list(dumped["results"]) == ["summary", "flashcards", "quiz", "key_concepts"]
    assert type(dumped["skipped_pages"]) is list
    for name in ITEM_FIELDS:
        assert type(dumped["results"][name]) is list
        assert all(type(item["pages"]) is list for item in dumped["results"][name])
    assert type(dumped["results"]["summary"]["pages"]) is list
    assert jsonable_encoder(result) == dumped
    assert json.loads(result.model_dump_json()) == dumped


def test_envelope_skipped_pages(harness: Callable[..., Harness]) -> None:
    pdf = harness().run(make_pdf("en", IMAGE, "tre", IMAGE, "fem"))
    assert pdf.skipped_pages == (2, 4)
    assert pdf.model_dump(mode="json")["skipped_pages"] == [2, 4]
    text = harness(FakeConnector(raw_json=reply_json(pages=[]))).run(plain_text(), "notat.txt")
    assert text.skipped_pages == ()
    assert text.model_dump(mode="json")["skipped_pages"] == []


@pytest.mark.parametrize("source", ["upload", "sample"])
@pytest.mark.parametrize(("settings", "mode"), [({}, "demo"), ({"ai_mode": "real", "anthropic_api_key": FAKE_KEY}, "real")], ids=["demo", "real"])
def test_envelope_mode(harness: Callable[..., Harness], settings: dict[str, Any], mode: str, source: str) -> None:
    assert harness(**settings).run(source=source).mode == mode


def _request() -> ConnectorRequest:
    return ConnectorRequest(system="s", document_block="d", inputs=inputs())


def _validated() -> ValidatedResults:
    # Calls stage 5 directly, never through the patchable pass_runner name (R7).
    return stage5_validate_output(FakeConnector(raw_json=reply_json()).generate(_request()), _extracted())


def test_envelope_contract() -> None:
    valid = respond(_validated(), _extracted(), "demo")
    with pytest.raises(ValidationError):
        valid.mode = "real"  # type: ignore[misc]
    base = {"mode": "demo", "results": _validated(), "skipped_pages": (2,)}
    bad_cases = [
        {**base, "extra": SECRET},
        {**base, "mode": "other"},
        {**base, "results": _validated().model_dump()},
        {**base, "results": AiOutput.model_validate_json(reply_json())},
        {**base, "skipped_pages": [2, 1]},
        {**base, "skipped_pages": [0]},
        {**base, "skipped_pages": [True]},
    ]
    for case in bad_cases:
        with pytest.raises(ValidationError) as caught:
            GenerationResponse(**case)
        assert SECRET not in str(caught.value)
    config = GenerationResponse.model_config
    assert (config.get("extra"), config.get("frozen"), config.get("hide_input_in_errors")) == ("forbid", True, True)


class _UploadLike(str):
    pass


@pytest.mark.parametrize("source", ["demo", "", None, "UPLOAD", _UploadLike("upload")], ids=["demo", "empty", "none", "upper", "str-subclass"])
def test_source_validation(harness: Callable[..., Harness], source: Any) -> None:
    h = harness()
    with pytest.raises(ValueError, match="^unknown pass source$"):
        h.run(source=source)
    assert not h.guard.locked()
    assert h.events == []
    assert isinstance(h.run(source="upload"), GenerationResponse)
    assert isinstance(h.run(source="sample"), GenerationResponse)


# --- lock ----------------------------------------------------------------------------------


def test_lock_busy(harness: Callable[..., Harness]) -> None:
    h = harness()
    assert h.guard.try_acquire()
    try:
        error = h.fail()
        assert error.code == "generation_in_progress"
        assert h.events == []
        assert h.fake.generate_calls == 0
        assert h.guard.locked()  # the refused call didn't release the holder's lock
        assert HTTP_STATUS["generation_in_progress"] == 409
    finally:
        h.guard.release()


class _NestingConnector:
    def __init__(self, fake: FakeConnector) -> None:
        self.fake = fake
        self.inner: list[str] = []
        self.runner: PassRunner | None = None

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        raise AssertionError("count_input_tokens must not be called")

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        if self.runner is None:
            raise AssertionError("inner runner not set")
        caught: PassFailure | None = None
        try:
            self.runner.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
        except PassFailure as failure:
            caught = failure
        self.inner.append(caught.code if caught is not None else "not refused")
        return self.fake.generate(request)


def test_lock_nested_run_pass_refused(make_settings: Callable[..., Settings]) -> None:
    guard = PassGuard()
    connector = _NestingConnector(FakeConnector(raw_json=reply_json()))
    runner = PassRunner(connector=connector, settings=make_settings(), guard=guard)
    connector.runner = PassRunner(connector=FakeConnector(raw_json=reply_json()), settings=make_settings(), guard=guard)
    result = runner.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
    assert connector.inner == ["generation_in_progress"]
    assert isinstance(result, GenerationResponse)
    assert not guard.locked()


def test_lock_released_after_success(harness: Callable[..., Harness]) -> None:
    h = harness()
    h.run()
    assert not h.guard.locked()
    assert isinstance(h.run(), GenerationResponse)


def test_lock_released_after_pass_failures(harness: Callable[..., Harness]) -> None:
    # R1: each case keeps its own harness and checks its own guard right after the failure.
    cases: list[tuple[Harness, bytes | None, str]] = [
        (harness(), BROKEN_PDF, "unreadable_file"),  # stage 1
        (harness(), make_pdf(IMAGE), "no_extractable_text"),  # stage 2
        (harness(FakeConnector(raw_json=reply_json(), generate_error="ai_unavailable")), None, "ai_unavailable"),  # stage 4
        (harness(FakeConnector(raw_json=reply_json(), stop="length")), None, "ai_output_invalid"),  # stage 5
        (harness(FakeConnector(raw_json=reply_json(status="insufficient_content"))), None, "insufficient_content"),  # stage 5
    ]
    for h, doc, code in cases:
        assert h.fail(doc).code == code
        assert not h.guard.locked(), code
        assert isinstance(h.guard, PassGuard) and h.guard.try_acquire(), code
        h.guard.release()


@pytest.mark.parametrize("where", ["stage2", "connector", "stage4-code", "stage4-reply", "stage6"])
def test_lock_released_after_unexpected_exception(monkeypatch: pytest.MonkeyPatch, harness: Callable[..., Harness], where: str) -> None:
    h = harness()
    expected: type[BaseException] = TypeError
    h.install()
    if where == "stage2":

        def broken_stage2(*args: Any, **kwargs: Any) -> Any:
            raise RuntimeError("unexpected stage 2 failure")

        monkeypatch.setattr(pass_runner, "extract_document", broken_stage2)
        expected = RuntimeError
    elif where == "connector":
        h.runner = PassRunner(connector=_RaisingConnector(), settings=h.settings, guard=h.guard)
        expected = RuntimeError
    elif where == "stage4-code":
        h.runner = PassRunner(connector=_MutatingConnector(INVALID_CODES["none"]), settings=h.settings, guard=h.guard)
    elif where == "stage4-reply":
        h.runner = PassRunner(connector=_ReturningConnector(None), settings=h.settings, guard=h.guard)
    else:
        monkeypatch.setattr(pass_runner, "validate_output", lambda reply, extracted: None)
    with pytest.raises(expected):
        h.runner.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
    assert not h.guard.locked()


class _BlockingConnector:
    def __init__(self, fake: FakeConnector) -> None:
        self.fake = fake
        self.entered = threading.Event()
        self.release = threading.Event()

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        raise AssertionError("count_input_tokens must not be called")

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        self.entered.set()
        wait_or_fail(self.release, "the test to release thread A")
        return self.fake.generate(request)


def test_lock_concurrent_threads(make_settings: Callable[..., Settings]) -> None:
    guard = PassGuard()
    blocking = _BlockingConnector(FakeConnector(raw_json=reply_json()))
    runner_a = PassRunner(connector=blocking, settings=make_settings(), guard=guard)
    runner_b = PassRunner(connector=FakeConnector(raw_json=reply_json()), settings=make_settings(), guard=guard)
    doc_a, doc_b, inputs_a, inputs_b = default_pdf(), default_pdf(), inputs(), inputs()
    outcome: dict[str, Any] = {}

    def run_a() -> None:
        try:
            outcome["a"] = runner_a.run_pass(doc_a, "notat.pdf", inputs_a, "upload")
        except BaseException as error:  # reported to the main thread below
            outcome["error"] = error

    thread_a = threading.Thread(target=run_a)
    thread_a.start()
    try:
        wait_or_fail(blocking.entered, "thread A to enter stage 4")
        started = time.perf_counter()
        with pytest.raises(PassFailure) as caught:
            runner_b.run_pass(doc_b, "notat.pdf", inputs_b, "upload")
        refusal_seconds = time.perf_counter() - started
        assert caught.value.code == "generation_in_progress"
        assert refusal_seconds < 1
    finally:
        blocking.release.set()
        thread_a.join(timeout=5)
    assert not thread_a.is_alive()
    assert "error" not in outcome, repr(outcome.get("error"))
    assert isinstance(outcome.get("a"), GenerationResponse)
    assert not guard.locked()
    assert isinstance(runner_b.run_pass(doc_b, "notat.pdf", inputs_b, "upload"), GenerationResponse)


def test_lock_scope_per_app_instance(make_settings: Callable[..., Settings]) -> None:
    first, second = create_app(make_settings()), create_app(make_settings())
    assert isinstance(first.state.pass_guard, PassGuard)
    assert isinstance(second.state.pass_guard, PassGuard)
    assert first.state.pass_guard is not second.state.pass_guard
    shared_a = PassRunner(connector=FakeConnector(raw_json=reply_json()), settings=make_settings(), guard=first.state.pass_guard)
    shared_b = PassRunner(connector=FakeConnector(raw_json=reply_json()), settings=make_settings(), guard=first.state.pass_guard)
    other = PassRunner(connector=FakeConnector(raw_json=reply_json()), settings=make_settings(), guard=second.state.pass_guard)
    assert first.state.pass_guard.try_acquire()
    try:
        with pytest.raises(PassFailure) as caught:
            shared_a.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
        assert caught.value.code == "generation_in_progress"
        with pytest.raises(PassFailure):
            shared_b.run_pass(default_pdf(), "notat.pdf", inputs(), "upload")
        assert isinstance(other.run_pass(default_pdf(), "notat.pdf", inputs(), "upload"), GenerationResponse)
    finally:
        first.state.pass_guard.release()


def test_pass_guard_api(guard_locks: list[_NeverBlockingLock]) -> None:
    guard = PassGuard()
    lock = guard_locks[-1]
    assert not guard.locked()
    assert guard.try_acquire() is True
    assert guard.locked()
    assert guard.try_acquire() is False
    # R2: deterministic — every acquire was a non-blocking call, with no timeout.
    assert lock.acquire_calls == [NON_BLOCKING, NON_BLOCKING]
    guard.release()
    assert not guard.locked()
    with pytest.raises(RuntimeError):
        guard.release()


def test_pass_guard_refusal_is_immediate_with_a_real_lock(monkeypatch: pytest.MonkeyPatch) -> None:
    """Timing check against a real threading.Lock (R2, D1).

    The refused attempt runs in a daemon worker joined with a 1 s bound, so a regression to
    a blocking acquire fails this test instead of hanging it, and the blocked daemon can
    never keep the process alive. The worker times only its own ``try_acquire()`` call.
    """
    monkeypatch.setattr(pass_guard_module, "threading", threading)
    guard = PassGuard()
    held = guard.try_acquire()
    if held is not True:
        raise AssertionError("the guard could not be taken for the test")
    result: dict[str, Any] = {}

    def attempt() -> None:
        try:
            started = time.perf_counter()
            result["refused"] = guard.try_acquire()
            result["elapsed"] = time.perf_counter() - started
        except BaseException as error:  # reported to the test below
            result["error"] = error

    worker = threading.Thread(target=attempt, daemon=True)
    try:
        worker.start()
        worker.join(timeout=1)
        assert not worker.is_alive(), "try_acquire() blocked: it must refuse at once"
        assert "error" not in result, repr(result.get("error"))
        assert result["refused"] is False
        assert result["elapsed"] < 0.1  # refused at once, never waits
    finally:
        guard.release()  # also unblocks a worker stuck in a blocking acquire


# --- HTTP mapping --------------------------------------------------------------------------

HTTP_CASES = [
    ("generation_in_progress", None),
    ("unsupported_file_type", None),
    ("bad_text_encoding", None),
    ("unreadable_file", None),
    ("no_extractable_text", None),
    ("file_too_large", "pages"),
    ("file_too_large", "characters"),
    ("insufficient_content", None),
    ("ai_rate_limited", None),
    ("ai_unavailable", None),
    ("ai_output_invalid", None),
    ("ai_credits_exhausted", None),
]


def _app_with_failure_route(make_settings: Callable[..., Settings]) -> FastAPI:
    application = create_app(make_settings())

    def raise_failure(code: str, limit: str = "") -> None:
        document_text = f"document {SECRET}"  # a local holding sensitive text
        try:
            raise ValueError(document_text)
        except ValueError as error:
            raise PassFailure(code, limit or None) from error  # type: ignore[arg-type]

    application.add_api_route("/__test/fail/{code}", raise_failure, methods=["GET"])
    return application


@pytest.mark.parametrize(("code", "limit"), HTTP_CASES, ids=[f"{c}-{l}" if l else c for c, l in HTTP_CASES])
def test_http_mapping(make_settings: Callable[..., Settings], code: str, limit: str | None) -> None:
    with TestClient(_app_with_failure_route(make_settings)) as client:
        response = client.get(f"/__test/fail/{code}", params={"limit": limit or ""}, headers={"Origin": ORIGIN})
    assert response.status_code == HTTP_STATUS[code]  # type: ignore[index]
    body = response.json()
    expected = {"error_code": code, "message": MESSAGES[code]}  # type: ignore[index]
    if code == "file_too_large":
        expected["limit"] = limit  # type: ignore[assignment]
    assert body == expected
    assert SECRET not in response.text
    assert response.headers.get("access-control-allow-origin") == ORIGIN


def test_http_mapping_logging(make_settings: Callable[..., Settings], caplog: pytest.LogCaptureFixture) -> None:
    application = _app_with_failure_route(make_settings)
    caplog.set_level(logging.DEBUG)
    error_logger = logging.getLogger("app.errors")
    handler = caplog.handler
    error_logger.addHandler(handler)
    try:
        with TestClient(application) as client:
            for code, limit in HTTP_CASES:
                caplog.clear()
                client.get(f"/__test/fail/{code}", params={"limit": limit or ""})
                records = [r for r in caplog.records if r.name == "app.errors"]
                assert len(records) == 1
                message = records[0].getMessage()
                assert message.startswith(f"stage=api code={code} duration_ms=")
                assert "reference_id" not in message
                assert records[0].exc_info is None and records[0].exc_text is None
                # The failure was chained from an exception carrying sensitive text (R3).
                assert all(SECRET not in r.getMessage() for r in caplog.records)
                assert SECRET not in caplog.text
    finally:
        error_logger.removeHandler(handler)


# --- privacy -------------------------------------------------------------------------------


def _app_records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == "app" or r.name.startswith("app.")]


def _assert_no_leak(caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str], errors: list[BaseException]) -> None:
    assert _app_records(caplog) == []
    assert all(r.name.startswith("pypdf") for r in caplog.records)  # only existing pypdf warnings (Q2)
    assert all(SECRET not in r.getMessage() for r in caplog.records)
    captured = capsys.readouterr()
    assert captured.out == "" and captured.err == ""
    for error in errors:
        for text in (str(error), repr(error), repr(error.args), repr(vars(error))):
            assert SECRET not in text


def test_privacy_no_app_logs_or_output(harness: Callable[..., Harness], caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]) -> None:
    caplog.set_level(logging.DEBUG)
    secret_pdf = default_pdf(SECRET)
    secret_reply = reply_json(text=SECRET)
    harness(FakeConnector(raw_json=secret_reply)).run(secret_pdf)
    harness(FakeConnector(raw_json=reply_json(pages=[], text=SECRET))).run(plain_text(SECRET), "notat.txt")
    failures: list[BaseException] = [
        harness().fail(BROKEN_PDF + SECRET.encode()),
        harness().fail(make_pdf(IMAGE)),
        harness(max_text_chars=5).fail(plain_text(SECRET), "notat.txt"),
        harness(FakeConnector(raw_json=secret_reply, generate_error="ai_unavailable")).fail(secret_pdf),
        harness(FakeConnector(raw_json=secret_reply, stop="length")).fail(secret_pdf),
        harness(FakeConnector(raw_json=reply_json(status="insufficient_content", text=SECRET))).fail(secret_pdf),
    ]
    _assert_no_leak(caplog, capsys, failures)


def test_privacy_programming_error_and_busy_paths(monkeypatch: pytest.MonkeyPatch, harness: Callable[..., Harness], caplog: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]) -> None:
    """R3: invalid codes (incl. the malicious str subclass), invalid replies, unexpected
    connector and stage 3 errors, stage 6 invalid results and busy refusal, all with a
    document and AI output that carry the marker."""
    caplog.set_level(logging.DEBUG)
    secret_pdf = default_pdf(SECRET)
    errors: list[BaseException] = []
    for mutate in INVALID_CODES.values():
        h = harness()
        h.runner = PassRunner(connector=_MutatingConnector(mutate), settings=h.settings, guard=h.guard)
        errors.append(h.raises(TypeError, secret_pdf))
    for value in INVALID_REPLIES:
        h = harness()
        h.runner = PassRunner(connector=_ReturningConnector(value), settings=h.settings, guard=h.guard)
        errors.append(h.raises(TypeError, secret_pdf))
    connector_error = harness()
    connector_error.runner = PassRunner(connector=_RaisingConnector(), settings=connector_error.settings, guard=connector_error.guard)
    errors.append(connector_error.raises(RuntimeError, secret_pdf))
    stage3 = harness(FakeConnector(raw_json=reply_json(text=SECRET)))
    stage3.install()

    def broken_stage3(*args: Any, **kwargs: Any) -> Any:
        raise RuntimeError("unexpected stage 3 failure")

    monkeypatch.setattr(pass_runner, "build_request", broken_stage3)
    with pytest.raises(RuntimeError) as stage3_error:
        stage3.runner.run_pass(secret_pdf, "notat.pdf", inputs(), "upload")
    errors.append(stage3_error.value)
    stage6 = harness(FakeConnector(raw_json=reply_json(text=SECRET)))
    stage6.install()
    monkeypatch.setattr(pass_runner, "validate_output", lambda reply, extracted: AiOutput.model_validate_json(reply.raw_json))
    with pytest.raises(TypeError) as stage6_error:
        stage6.runner.run_pass(secret_pdf, "notat.pdf", inputs(), "upload")
    errors.append(stage6_error.value)
    busy = harness(FakeConnector(raw_json=reply_json(text=SECRET)))
    assert busy.guard.try_acquire()
    try:
        errors.append(busy.fail(secret_pdf))
    finally:
        busy.guard.release()
    assert len(errors) == len(INVALID_CODES) + len(INVALID_REPLIES) + 4
    _assert_no_leak(caplog, capsys, errors)


# --- import boundary -----------------------------------------------------------------------


def _imports(path: Path) -> list[tuple[str, int]]:
    found: list[tuple[str, int]] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found.extend((alias.name, 0) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            found.append((node.module or "", node.level))
    return found


def test_import_boundary_new_modules() -> None:
    guard_imports = _imports(Path(pass_guard_module.__file__))
    assert guard_imports, "no imports found"
    for name, level in guard_imports:
        assert level == 0
        assert name.split(".")[0] in sys.stdlib_module_names, name
        assert name.split(".")[0] != "logging"
    runner_imports = _imports(Path(pass_runner.__file__))
    assert runner_imports, "no imports found"
    for name, level in runner_imports:
        assert level == 0
        assert name.split(".")[0] != "logging"
        for forbidden in ("app.api", "app.connectors"):
            assert not (name == forbidden or name.startswith(forbidden + ".")), name
