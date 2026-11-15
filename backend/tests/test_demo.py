"""Story 1.13: the TEMPORARY demo fixture, ``DemoConnector`` and ``POST /api/demo``.

One test (or one parametrised test) per backend row of the spec's I/O matrix. The rows for
the recorded envelopes (``demo-response.json``, ``status-response.json``), the regeneration
script, the frontend and the README are added with those files. Raw-ASGI tests drive the
app with scripted ``receive`` messages wherever the number or kind of ASGI messages matters,
because ``TestClient`` reads a whole body into one message.
"""

import ast
import asyncio
import hashlib
import json
import logging
import re
import socket
import threading
import time
import unicodedata
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.api.demo as demo_api
import app.application as application_module
import app.connectors as connectors_package
import app.pipeline.pass_runner as pass_runner
from app.api.errors import LOGGER_NAME
from app.application import create_app
from app.config import Settings
from app.connectors.demo import DemoConnector
from app.contracts.ai_output import AiOutput
from app.contracts.connector import Connector, ConnectorError, ConnectorReply, ConnectorRequest
from app.contracts.errors import MESSAGES
from app.contracts.results import is_valid_result_text
from app.pipeline.pass_runner import PassRunner
from app.pipeline.stage1_validate import validate_bytes
from app.pipeline.stage2_extract import ExtractedDocument, extract_document
from app.pipeline.stage3_prompt import read_generation_inputs
from app.pipeline.stage5_gates import validate_output
from app.samples import DEMO_FIXTURE, DEMO_RESPONSE, SAMPLE_PDF, SAMPLES_DIR
from scripts import write_fixtures
from tests._fakes import FAKE_KEY

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = SAMPLES_DIR / DEMO_FIXTURE
SAMPLE_PATH = SAMPLES_DIR / SAMPLE_PDF
PROVENANCE_PATH = SAMPLES_DIR / "PROVENANCE.md"
ORIGIN = "http://localhost:3000"
TEXT_PAGES = {1, 2, 3, 5, 6}
ITEM_KEYS = {
    "flashcards": {"front", "back", "pages"},
    "quiz": {"question", "answer", "pages"},
    "key_concepts": {"term", "explanation", "pages"},
}
STAGE_NAMES = ("validate_bytes", "extract_document", "build_request", "validate_output")
# Captured once at import, before any test patches the module.
REAL_STAGES: dict[str, Callable[..., Any]] = {name: getattr(pass_runner, name) for name in STAGE_NAMES}
STORY_112_SECTION_SHA256 = "75093dc975910833d664ac0433d597b8c88d6f6649949be7b557d1c393eec399"
STORY_112_HEADING = "## Sample lecture: `innkjop-og-lager.pdf`"
FIXTURE_HEADING = "## Demo fixture: `demo-ai-output.json` (TEMPORARY)"


# --- helpers ------------------------------------------------------------------------------


def fixture_lf_bytes() -> bytes:
    return FIXTURE_PATH.read_bytes().replace(b"\r\n", b"\n")


def fixture_data() -> dict[str, Any]:
    return json.loads(fixture_lf_bytes().decode("utf-8"))


def entries(data: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """The summary and the 15 items, in fixture order, with their 1-based names."""
    return [("summary", data["summary"])] + [
        (f"{kind}[{index}]", item)
        for kind in ("flashcards", "quiz", "key_concepts")
        for index, item in enumerate(data[kind], start=1)
    ]


def texts(data: dict[str, Any]) -> list[str]:
    return [value for _, entry in entries(data) for key, value in entry.items() if key != "pages"]


def raw_pages(data: dict[str, Any]) -> list[list[int]]:
    return [entry["pages"] for _, entry in entries(data)]


def validated_pages(results: Any) -> list[list[int]]:
    """Pages of a ``ValidatedResults`` or of the reply's ``results`` JSON, in fixture order."""
    if isinstance(results, dict):
        items = [results["summary"], *results["flashcards"], *results["quiz"], *results["key_concepts"]]
        return [list(item["pages"]) for item in items]
    items = [results.summary, *results.flashcards, *results.quiz, *results.key_concepts]
    return [list(item.pages) for item in items]


def sample_extracted() -> ExtractedDocument:
    checked = validate_bytes(SAMPLE_PATH.read_bytes(), SAMPLE_PDF, max_pdf_pages=80)
    return extract_document(checked, max_text_chars=200_000)


def reply_for(raw_json: str) -> ConnectorReply:
    return ConnectorReply(raw_json=raw_json, stop="complete", input_tokens=0, output_tokens=0)


def a_request() -> ConnectorRequest:
    inputs = read_generation_inputs(course_code=None, detail_level="standard", output_language="nb")
    return ConnectorRequest(system="s", document_block="d", inputs=inputs)


def error_body(code: str) -> dict[str, str]:
    return {"error_code": code, "message": MESSAGES[code]}  # type: ignore[index]


def assert_internal_error(body: dict[str, Any]) -> None:
    """``internal_error`` replies also carry an 8-hex-digit ``reference_id`` (AD-11)."""
    assert set(body) == {"error_code", "message", "reference_id"}
    assert {k: body[k] for k in ("error_code", "message")} == error_body("internal_error")
    assert re.fullmatch(r"[0-9a-f]{8}", body["reference_id"])


@pytest.fixture
def demo(make_settings: Callable[..., Settings]) -> FastAPI:
    return create_app(make_settings())


@pytest.fixture
def real(make_settings: Callable[..., Settings]) -> FastAPI:
    return create_app(make_settings(ai_mode="real", anthropic_api_key=FAKE_KEY))


@pytest.fixture
def client(demo: FastAPI) -> Iterator[TestClient]:
    with TestClient(demo, headers={"Origin": ORIGIN}) as test_client:
        yield test_client


@pytest.fixture
def logs(caplog: pytest.LogCaptureFixture) -> Iterator[pytest.LogCaptureFixture]:
    # ``app.errors`` does not propagate, so capture through the dedicated logger.
    error_logger = logging.getLogger(LOGGER_NAME)
    handler = caplog.handler
    error_logger.addHandler(handler)
    try:
        yield caplog
    finally:
        error_logger.removeHandler(handler)


@pytest.fixture
def stage_calls(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, tuple[Any, ...], dict[str, Any]]]:
    """Recorders around the real stages 1, 2, 3 and 5 (as in Story 1.11's tests)."""
    calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []
    for name in STAGE_NAMES:
        real_stage = REAL_STAGES[name]

        def recorder(*args: Any, _name: str = name, _real: Callable[..., Any] = real_stage, **kwargs: Any) -> Any:
            calls.append((_name, args, kwargs))
            return _real(*args, **kwargs)

        monkeypatch.setattr(pass_runner, name, recorder)
    return calls


class GuardSpy:
    """Wraps the app's guard to record ``try_acquire`` calls."""

    def __init__(self, application: FastAPI, monkeypatch: pytest.MonkeyPatch) -> None:
        self.calls = 0
        guard = application.state.pass_guard
        real_try = guard.try_acquire

        def spy() -> bool:
            self.calls += 1
            return real_try()

        monkeypatch.setattr(guard, "try_acquire", spy)


def assert_lock_free_afterwards(application: FastAPI, defaults: tuple[Any, Any]) -> None:
    """The matrix's "Lock free afterwards": no lock held, a fresh acquire works, and after
    restoring the replaced runner and sample path a following ``POST /api/demo`` gets 200."""
    guard = application.state.pass_guard
    assert not guard.locked()
    assert guard.try_acquire() is True
    guard.release()
    application.state.demo_runner, application.state.demo_sample_pdf = defaults
    with TestClient(application) as follow_up:
        assert follow_up.post("/api/demo").status_code == 200


def defaults_of(application: FastAPI) -> tuple[Any, Any]:
    return application.state.demo_runner, application.state.demo_sample_pdf


def raw_asgi(application: FastAPI, messages: list[dict[str, Any]]) -> tuple[int, bytes, list[dict[str, Any]]]:
    """Drive the app with scripted ``receive`` messages; returns status, body and every
    message ``receive`` handed out (one per call)."""
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/demo",
        "raw_path": b"/api/demo",
        "root_path": "",
        "query_string": b"",
        "headers": [(b"host", b"testserver")],
        "client": ("127.0.0.1", 50000),
        "server": ("testserver", 80),
    }
    script = list(messages)
    received: list[dict[str, Any]] = []
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        message = script.pop(0) if script else {"type": "http.disconnect"}
        received.append(message)
        return message

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    asyncio.run(application(scope, receive, send))
    status = next(m["status"] for m in sent if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return status, body, received


def body_message(data: bytes, more: bool) -> dict[str, Any]:
    return {"type": "http.request", "body": data, "more_body": more}


# --- fixture rows ---------------------------------------------------------------------------


def test_fixture_shape() -> None:
    data = fixture_data()
    output = AiOutput.model_validate(data)
    assert output.status == "ok"
    assert (len(output.flashcards), len(output.quiz), len(output.key_concepts)) == (5, 5, 5)
    assert set(data) == {"status", "summary", "flashcards", "quiz", "key_concepts"}
    assert set(data["summary"]) == {"text", "pages"}
    for kind, keys in ITEM_KEYS.items():
        assert all(set(item) == keys for item in data[kind])


def test_fixture_text() -> None:
    for text in texts(fixture_data()):
        assert is_valid_result_text(text)
        assert not any(unicodedata.category(char) == "Cc" for char in text)
        assert not re.search(r"[<>`]|\*\*", text)


def test_fixture_pages() -> None:
    for pages in raw_pages(fixture_data()):
        assert pages
        assert all(earlier < later for earlier, later in zip(pages, pages[1:]))
        assert set(pages) <= TEXT_PAGES
        assert 4 not in pages


def test_fixture_coverage() -> None:
    assert {page for pages in raw_pages(fixture_data()) for page in pages} == TEXT_PAGES


def test_fixture_language() -> None:
    assert any(letter in "".join(texts(fixture_data())) for letter in "æøå")


def test_fixture_encoding() -> None:
    data = fixture_lf_bytes()
    data.decode("utf-8")
    assert not data.startswith(b"\xef\xbb\xbf")
    assert b"\r" not in data
    assert data.endswith(b"\n") and not data.endswith(b"\n\n")


def test_no_silent_removal_stage5() -> None:
    data = fixture_data()
    results = validate_output(reply_for(fixture_lf_bytes().decode("utf-8")), sample_extracted())
    assert validated_pages(results) == raw_pages(data)


def test_no_silent_removal_end_to_end(client: TestClient) -> None:
    response = client.post("/api/demo")
    assert response.status_code == 200
    assert validated_pages(response.json()["results"]) == raw_pages(fixture_data())


def test_page4_control() -> None:
    data = fixture_data()
    data["flashcards"][0]["pages"] = sorted({*data["flashcards"][0]["pages"], 4})
    results = validate_output(reply_for(json.dumps(data, ensure_ascii=False)), sample_extracted())
    assert 4 not in results.flashcards[0].pages  # stage 5 drops page 4 without an error ...
    assert validated_pages(results) != raw_pages(data)  # ... so the comparison detects it


# --- connector rows -------------------------------------------------------------------------


def test_connector_reply() -> None:
    reply = DemoConnector(FIXTURE_PATH).generate(a_request())
    assert reply.raw_json == FIXTURE_PATH.read_text(encoding="utf-8")
    assert reply.stop == "complete"
    assert (reply.input_tokens, reply.output_tokens) == (0, 0)


def test_connector_protocol() -> None:
    # The project's own runtime-checkable protocol (it checks that both methods exist).
    connector = DemoConnector(FIXTURE_PATH)
    assert isinstance(connector, Connector)
    assert callable(connector.count_input_tokens) and callable(connector.generate)


def test_connector_tokens() -> None:
    assert DemoConnector(FIXTURE_PATH).count_input_tokens(a_request()) == 0


def test_connector_reads_per_call(tmp_path: Path) -> None:
    path = tmp_path / "fixture.json"
    path.write_text('{"first": 1}\n', encoding="utf-8")
    connector = DemoConnector(path)
    assert connector.generate(a_request()).raw_json == '{"first": 1}\n'
    path.write_text('{"second": 2}\n', encoding="utf-8")
    assert connector.generate(a_request()).raw_json == '{"second": 2}\n'


def test_connector_missing_file(tmp_path: Path) -> None:
    with pytest.raises(OSError) as caught:
        DemoConnector(tmp_path / "missing.json").generate(a_request())
    assert not isinstance(caught.value, ConnectorError)


def test_connector_imports() -> None:
    tree = ast.parse((Path(__file__).resolve().parents[1] / "app" / "connectors" / "demo.py").read_text("utf-8"))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imported.add(node.module or "")
    assert imported == {"pathlib", "app.contracts.connector"}


# --- route rows -----------------------------------------------------------------------------


TEXT_FIELDS = {
    "flashcards": ("front", "back"),
    "quiz": ("question", "answer"),
    "key_concepts": ("term", "explanation"),
}


def test_demo_success(client: TestClient) -> None:
    response = client.post("/api/demo")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"mode", "results", "skipped_pages"}
    assert body["mode"] == "demo"
    assert body["skipped_pages"] == [4]
    assert response.headers.get("access-control-allow-origin") == ORIGIN
    results = body["results"]
    assert set(results) == {"summary", "flashcards", "quiz", "key_concepts"}
    # Every approved text, compared field by field with the committed fixture itself (not
    # with stage 5's output), so any change to the approved wording fails here.
    data = fixture_data()
    assert results["summary"]["text"] == data["summary"]["text"]
    for kind, fields in TEXT_FIELDS.items():
        assert len(results[kind]) == len(data[kind]) == 5
        for returned, approved in zip(results[kind], data[kind], strict=True):
            for field in fields:
                assert returned[field] == approved[field], (kind, field)
    # The exact citations, also against the fixture.
    assert validated_pages(results) == raw_pages(data)


# Provider SDKs and HTTP clients that none of the demo path's modules may import (AD-13).
PROHIBITED_IMPORTS = ("anthropic", "openai", "httpx", "httpx2", "requests", "urllib3", "aiohttp", "urllib.request", "http.client", "socket")
DEMO_PATH_MODULES = ("connectors/demo.py", "api/demo.py", "samples.py", "application.py")


def _imported_modules(path: Path) -> set[str]:
    imported: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            imported.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module)
    return imported


@pytest.mark.parametrize("module", DEMO_PATH_MODULES)
def test_no_provider_or_http_client_imports(module: str) -> None:
    # The static guarantee: no module on the demo path imports a provider SDK or an HTTP
    # client, so no provider client can be created and no network call can be made by it.
    imported = _imported_modules(Path(__file__).resolve().parents[1] / "app" / module)
    assert imported, module
    for name in imported:
        for prohibited in PROHIBITED_IMPORTS:
            assert name != prohibited and not name.startswith(prohibited + "."), (module, name)


def test_no_network_during_demo_request(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # A runtime guard only: it fails if anything on the request path opens a socket. It cannot
    # prove the absence of providers on its own (TestClient itself uses no sockets); the static
    # import check above is the guarantee.
    def no_network(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("the demo must not open a network connection")

    monkeypatch.setattr(socket.socket, "connect", no_network)
    monkeypatch.setattr(socket, "create_connection", no_network)
    assert client.post("/api/demo").status_code == 200


def test_fixed_inputs(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    input_calls: list[dict[str, Any]] = []
    requests: list[ConnectorRequest] = []

    def spy_inputs(**kwargs: Any) -> Any:
        input_calls.append(kwargs)
        return read_generation_inputs(**kwargs)

    real_generate = DemoConnector.generate

    def spy_generate(self: DemoConnector, request: ConnectorRequest) -> ConnectorReply:
        requests.append(request)
        return real_generate(self, request)

    monkeypatch.setattr(demo_api, "read_generation_inputs", spy_inputs)
    monkeypatch.setattr(DemoConnector, "generate", spy_generate)
    assert client.post("/api/demo").status_code == 200
    assert input_calls == [{"course_code": None, "detail_level": "standard", "output_language": "nb"}]
    assert len(requests) == 1
    assert (requests[0].inputs.detail_level, requests[0].inputs.output_language) == ("standard", "nb")


def test_real_stages_run(client: TestClient, stage_calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]]) -> None:
    assert client.post("/api/demo").status_code == 200
    assert [name for name, _, _ in stage_calls] == list(STAGE_NAMES)
    _, args, _ = stage_calls[0]
    assert args[0] == SAMPLE_PATH.read_bytes()
    assert args[1] == SAMPLE_PDF


def test_startup_wiring_demo(demo: FastAPI) -> None:
    runner = demo.state.demo_runner
    assert isinstance(runner, PassRunner)
    assert runner._guard is demo.state.pass_guard  # private attribute, inspected deliberately
    assert demo.state.demo_sample_pdf == SAMPLES_DIR / SAMPLE_PDF


def test_startup_wiring_real(monkeypatch: pytest.MonkeyPatch, make_settings: Callable[..., Settings]) -> None:
    constructed: list[Any] = []

    class SpyConnector(DemoConnector):
        def __init__(self, fixture_path: Path) -> None:
            constructed.append(fixture_path)
            super().__init__(fixture_path)

    monkeypatch.setattr(application_module, "DemoConnector", SpyConnector)
    application = create_app(make_settings(ai_mode="real", anthropic_api_key=FAKE_KEY))
    assert application.state.demo_runner is None
    assert application.state.demo_sample_pdf is None
    assert constructed == []


def test_real_mode_refused(real: FastAPI, monkeypatch: pytest.MonkeyPatch) -> None:
    spy = GuardSpy(real, monkeypatch)
    reads: list[Path] = []
    real_read_bytes, real_read_text = Path.read_bytes, Path.read_text

    def spy_read_bytes(self: Path) -> bytes:
        reads.append(self)
        return real_read_bytes(self)

    def spy_read_text(self: Path, *args: Any, **kwargs: Any) -> str:
        reads.append(self)
        return real_read_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_bytes", spy_read_bytes)
    monkeypatch.setattr(Path, "read_text", spy_read_text)
    with TestClient(real) as test_client:
        response = test_client.post("/api/demo")
    assert response.status_code == 403
    assert response.json() == error_body("demo_not_enabled")
    assert not any(path.parent == SAMPLES_DIR for path in reads)
    assert spy.calls == 0


def test_body_check_after_mode(real: FastAPI) -> None:
    with TestClient(real) as test_client:
        response = test_client.post("/api/demo", json={"x": 1})
    assert response.status_code == 403
    assert response.json() == error_body("demo_not_enabled")


def _chunked(*parts: bytes) -> Iterator[bytes]:
    yield from parts


@pytest.mark.parametrize(
    "send",
    [
        pytest.param(lambda c: c.post("/api/demo", json={}), id="json"),
        pytest.param(lambda c: c.post("/api/demo", data={"a": "b"}), id="form"),
        pytest.param(lambda c: c.post("/api/demo", content=_chunked(b"x")), id="chunked-generator"),
    ],
)
def test_body_refused(
    demo: FastAPI,
    monkeypatch: pytest.MonkeyPatch,
    stage_calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]],
    send: Callable[[TestClient], Any],
) -> None:
    # Through TestClient these cases differ only in headers, not in ASGI framing.
    spy = GuardSpy(demo, monkeypatch)
    with TestClient(demo) as test_client:
        response = send(test_client)
    assert response.status_code == 400
    assert response.json() == error_body("invalid_request")
    assert stage_calls == []
    assert spy.calls == 0


def test_misleading_header(client: TestClient) -> None:
    # In-process only: a real HTTP/1.1 server would frame by the header.
    response = client.post("/api/demo", content=b"abc", headers={"Content-Length": "0"})
    assert response.status_code == 400
    assert response.json() == error_body("invalid_request")


@pytest.mark.parametrize(
    "send",
    [
        pytest.param(lambda c: c.post("/api/demo"), id="no-body"),
        pytest.param(lambda c: c.post("/api/demo", headers={"Content-Length": "0"}), id="content-length-0"),
        pytest.param(lambda c: c.post("/api/demo", content=_chunked(b"")), id="empty-generator"),
    ],
)
def test_empty_body_accepted(client: TestClient, send: Callable[[TestClient], Any]) -> None:
    response = send(client)
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"


def test_bounded_read_raw_asgi(
    demo: FastAPI, monkeypatch: pytest.MonkeyPatch, stage_calls: list[tuple[str, tuple[Any, ...], dict[str, Any]]]
) -> None:
    spy = GuardSpy(demo, monkeypatch)
    messages = [
        body_message(b"", True),
        body_message(b"x" * 70_000, True),
        body_message(b"b", True),
        body_message(b"c", False),
    ]
    status, body, received = raw_asgi(demo, messages)
    assert status == 400
    assert json.loads(body) == error_body("invalid_request")
    assert len(received) == 2
    assert stage_calls == []
    assert spy.calls == 0


def test_empty_messages_raw_asgi(demo: FastAPI) -> None:
    status, body, _ = raw_asgi(demo, [body_message(b"", True), body_message(b"", False)])
    assert status == 200
    assert json.loads(body)["mode"] == "demo"


@pytest.mark.parametrize(
    "messages",
    [
        pytest.param([body_message(b"", True), {"type": "http.disconnect"}], id="mid-body"),
        pytest.param([{"type": "http.disconnect"}], id="first-message"),
    ],
)
def test_client_disconnect_raw_asgi(
    demo: FastAPI, monkeypatch: pytest.MonkeyPatch, logs: pytest.LogCaptureFixture, messages: list[dict[str, Any]]
) -> None:
    spy = GuardSpy(demo, monkeypatch)
    status, body, _ = raw_asgi(demo, messages)
    assert status == 400
    assert json.loads(body) == error_body("invalid_request")
    records = [r for r in logs.records if r.name == LOGGER_NAME]
    assert len(records) == 1
    assert records[0].levelno == logging.INFO
    assert "code=invalid_request" in records[0].getMessage()
    assert "internal_error" not in logs.text
    assert spy.calls == 0


def test_query_ignored(client: TestClient) -> None:
    response = client.post("/api/demo?x=1")
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"


@pytest.mark.parametrize("method", ["GET", "PUT", "HEAD"])
def test_methods(client: TestClient, method: str) -> None:
    response = client.request(method, "/api/demo")
    assert response.status_code == 405
    assert response.headers.get("allow") == "POST"
    if method == "HEAD":
        assert response.content == b""
    else:
        assert response.json() == error_body("method_not_allowed")


def test_busy_guard(demo: FastAPI) -> None:
    guard = demo.state.pass_guard
    assert guard.try_acquire() is True
    try:
        with TestClient(demo) as test_client:
            started = time.perf_counter()
            response = test_client.post("/api/demo")
            elapsed = time.perf_counter() - started
        assert response.status_code == 409
        assert response.json() == error_body("generation_in_progress")
        assert elapsed < 1
        assert guard.locked()  # the holder's lock is untouched
    finally:
        guard.release()


class _BlockingConnector:
    def __init__(self, inner: DemoConnector) -> None:
        self.inner = inner
        self.entered = threading.Event()
        self.release = threading.Event()

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        return self.inner.count_input_tokens(request)

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        self.entered.set()
        if not self.release.wait(timeout=5):
            raise AssertionError("the test never released the first request")
        return self.inner.generate(request)


def test_concurrent_requests(demo: FastAPI, make_settings: Callable[..., Settings]) -> None:
    defaults = defaults_of(demo)
    blocking = _BlockingConnector(DemoConnector(FIXTURE_PATH))
    demo.state.demo_runner = PassRunner(connector=blocking, settings=make_settings(), guard=demo.state.pass_guard)
    outcome: dict[str, Any] = {}

    def first() -> None:
        try:
            with TestClient(demo) as first_client:
                outcome["first"] = first_client.post("/api/demo").status_code
        except BaseException as error:  # reported to the main thread below
            outcome["error"] = error

    thread = threading.Thread(target=first, daemon=True)
    thread.start()
    try:
        assert blocking.entered.wait(timeout=5), "the first request never reached the connector"
        with TestClient(demo) as second_client:
            started = time.perf_counter()
            second = second_client.post("/api/demo")
            elapsed = time.perf_counter() - started
        assert second.status_code == 409
        assert second.json() == error_body("generation_in_progress")
        assert elapsed < 1
    finally:
        blocking.release.set()
        thread.join(timeout=10)
    assert not thread.is_alive()
    assert "error" not in outcome, repr(outcome.get("error"))
    assert outcome["first"] == 200
    assert_lock_free_afterwards(demo, defaults)


def test_missing_sample(demo: FastAPI, tmp_path: Path) -> None:
    defaults = defaults_of(demo)
    demo.state.demo_sample_pdf = tmp_path / "missing.pdf"
    with TestClient(demo) as test_client:
        response = test_client.post("/api/demo")
    assert response.status_code == 500
    assert_internal_error(response.json())
    assert_lock_free_afterwards(demo, defaults)


def _runner_with_fixture(demo: FastAPI, settings: Settings, path: Path) -> PassRunner:
    return PassRunner(connector=DemoConnector(path), settings=settings, guard=demo.state.pass_guard)


def test_missing_fixture(demo: FastAPI, tmp_path: Path, make_settings: Callable[..., Settings]) -> None:
    defaults = defaults_of(demo)
    demo.state.demo_runner = _runner_with_fixture(demo, make_settings(), tmp_path / "missing.json")
    with TestClient(demo) as test_client:
        response = test_client.post("/api/demo")
    assert response.status_code == 500
    assert_internal_error(response.json())
    assert_lock_free_afterwards(demo, defaults)


def test_broken_fixture(demo: FastAPI, tmp_path: Path, make_settings: Callable[..., Settings]) -> None:
    defaults = defaults_of(demo)
    broken = tmp_path / "broken.json"
    broken.write_text("{not json", encoding="utf-8")
    demo.state.demo_runner = _runner_with_fixture(demo, make_settings(), broken)
    with TestClient(demo) as test_client:
        response = test_client.post("/api/demo")
    assert response.status_code == 502
    assert response.json() == error_body("ai_output_invalid")
    assert_lock_free_afterwards(demo, defaults)


def test_logs_on_success(client: TestClient, logs: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]) -> None:
    assert client.post("/api/demo").status_code == 200
    assert [r for r in logs.records if r.name == LOGGER_NAME] == []
    assert capsys.readouterr().err == ""


def _forbidden_fragments(tmp_path: Path) -> list[str]:
    data = fixture_data()
    return [
        str(tmp_path),
        str(SAMPLES_DIR),
        "missing.pdf",
        "missing.json",
        "broken.json",
        DEMO_FIXTURE,
        SAMPLE_PDF,
        "No such file",
        "Errno",
        "Traceback",
        "<page",
        data["summary"]["text"][:40],
        data["flashcards"][0]["front"],
        "Innkjøpsfunksjonen har en sentral rolle",  # sample text (page 1)
    ]


@pytest.mark.parametrize("case", ["missing-sample", "missing-fixture", "broken-fixture", "body-refused"])
def test_logs_on_failure(
    demo: FastAPI,
    tmp_path: Path,
    make_settings: Callable[..., Settings],
    logs: pytest.LogCaptureFixture,
    capsys: pytest.CaptureFixture[str],
    case: str,
) -> None:
    expected = {
        "missing-sample": "internal_error",
        "missing-fixture": "internal_error",
        "broken-fixture": "ai_output_invalid",
        "body-refused": "invalid_request",
    }[case]
    if case == "missing-sample":
        demo.state.demo_sample_pdf = tmp_path / "missing.pdf"
    elif case == "missing-fixture":
        demo.state.demo_runner = _runner_with_fixture(demo, make_settings(), tmp_path / "missing.json")
    elif case == "broken-fixture":
        broken = tmp_path / "broken.json"
        broken.write_text("{not json", encoding="utf-8")
        demo.state.demo_runner = _runner_with_fixture(demo, make_settings(), broken)
    with TestClient(demo) as test_client:
        response = test_client.post("/api/demo", json={} if case == "body-refused" else None)
    if expected == "internal_error":
        assert_internal_error(response.json())
    else:
        assert response.json() == error_body(expected)
    records = [r for r in logs.records if r.name == LOGGER_NAME]
    assert len(records) == 1
    assert f"code={expected}" in records[0].getMessage()
    assert records[0].exc_info is None
    stderr = capsys.readouterr().err
    for fragment in _forbidden_fragments(tmp_path):
        assert fragment not in records[0].getMessage(), fragment
        assert fragment not in logs.text, fragment
        assert fragment not in stderr, fragment
        assert fragment not in response.text, fragment


# --- provenance and docstring rows ----------------------------------------------------------


def _provenance_lines() -> list[str]:
    return PROVENANCE_PATH.read_bytes().decode("utf-8").replace("\r\n", "\n").split("\n")


def _section(lines: list[str], heading: str) -> str:
    start = lines.index(heading)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return "\n".join(lines[start:end]).rstrip()


def test_provenance() -> None:
    lines = _provenance_lines()
    story_112 = _section(lines, STORY_112_HEADING)
    assert hashlib.sha256(story_112.encode("utf-8")).hexdigest() == STORY_112_SECTION_SHA256
    section = _section(lines, FIXTURE_HEADING)
    normalised = " ".join(section.replace("*", "").split())
    first_sentence = section.split("\n\n")[1]
    assert "TEMPORARY" in FIXTURE_HEADING and "TEMPORARY" in first_sentence
    for statement in (
        "not recorded from a real AI run",
        "must be replaced by a fixture recorded from one approved real AI run",
        "before final demo acceptance and submission",
        "U-1",
        hashlib.sha256(fixture_lf_bytes()).hexdigest(),
    ):
        assert statement in normalised, statement


def test_provenance_citation_table() -> None:
    section = _section(_provenance_lines(), FIXTURE_HEADING).split("\n")
    header = "| Entry | Page | Page supports entry | Content matches sample | Reviewer | Date |"
    start = section.index(header)
    rows = []
    for line in section[start + 2 :]:
        if not line.startswith("|"):
            break
        rows.append([cell.strip() for cell in line.strip("|").split("|")])
    expected = [(name, page) for name, entry in entries(fixture_data()) for page in entry["pages"]]
    assert [(row[0], int(row[1])) for row in rows] == expected
    assert len(rows) == len(set((row[0], row[1]) for row in rows))
    for row in rows:
        assert row[2] == "yes" and row[3] == "yes"
        assert row[4]
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", row[5])


def test_connectors_docstring() -> None:
    doc = connectors_package.__doc__ or ""
    assert "(demo, test fakes, real)" not in doc
    assert "demo connector" in doc
    assert "backend/tests/" in doc


# --- recorded envelopes (D8, D10): written only by scripts/write_fixtures.py main() ---------

DEMO_RESPONSE_PATH = SAMPLES_DIR / DEMO_RESPONSE
STATUS_RESPONSE_PATH = REPO_ROOT / "frontend" / "__tests__" / "status-response.json"


def _committed(path: Path) -> Any:
    return json.loads(path.read_bytes().replace(b"\r\n", b"\n").decode("utf-8"))


@pytest.fixture(scope="module")
def rendered() -> dict[Path, bytes]:
    return write_fixtures.render_fixtures()


def test_render_paths(rendered: dict[Path, bytes]) -> None:
    assert set(rendered) == {DEMO_RESPONSE_PATH, STATUS_RESPONSE_PATH}
    assert write_fixtures.DEMO_RESPONSE_PATH == DEMO_RESPONSE_PATH
    assert write_fixtures.STATUS_RESPONSE_PATH == STATUS_RESPONSE_PATH


@pytest.mark.parametrize("which", ["demo", "status"])
def test_render_byte_format(rendered: dict[Path, bytes], which: str) -> None:
    data = rendered[DEMO_RESPONSE_PATH if which == "demo" else STATUS_RESPONSE_PATH]
    assert not data.startswith(b"\xef\xbb\xbf")
    assert b"\r" not in data
    assert data.endswith(b"}\n") and not data.endswith(b"\n\n")
    value = json.loads(data.decode("utf-8"))
    assert data == (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if which == "demo":
        assert "ø".encode() in data and b"\\u00f8" not in data  # letters as characters, not escapes


def test_render_is_deterministic(rendered: dict[Path, bytes]) -> None:
    assert write_fixtures.render_fixtures() == rendered


def test_response_fixture(rendered: dict[Path, bytes], client: TestClient) -> None:
    committed = _committed(DEMO_RESPONSE_PATH)
    assert committed == json.loads(rendered[DEMO_RESPONSE_PATH])
    response = client.post("/api/demo")
    assert response.status_code == 200
    assert committed == response.json()
    # The committed bytes (LF-normalised) are exactly what the command writes.
    assert DEMO_RESPONSE_PATH.read_bytes().replace(b"\r\n", b"\n") == rendered[DEMO_RESPONSE_PATH]


def test_response_fixture_shape() -> None:
    body = _committed(DEMO_RESPONSE_PATH)
    assert set(body) == {"mode", "results", "skipped_pages"}
    assert body["mode"] == "demo"
    assert body["skipped_pages"] == [4]
    results = body["results"]
    assert set(results) == {"summary", "flashcards", "quiz", "key_concepts"}
    assert isinstance(results["summary"]["pages"], list)
    for kind in ("flashcards", "quiz", "key_concepts"):
        assert isinstance(results[kind], list) and len(results[kind]) == 5
        assert all(isinstance(item["pages"], list) for item in results[kind])
    # The recorded envelope carries exactly the approved fixture's texts and citations.
    data = fixture_data()
    assert results["summary"] == data["summary"]
    for kind in ("flashcards", "quiz", "key_concepts"):
        assert results[kind] == data[kind]


def test_status_fixture(rendered: dict[Path, bytes], make_settings: Callable[..., Settings]) -> None:
    committed = _committed(STATUS_RESPONSE_PATH)
    assert committed == json.loads(rendered[STATUS_RESPONSE_PATH])
    with TestClient(create_app(make_settings())) as test_client:
        response = test_client.get("/api/status")
    assert response.status_code == 200
    assert committed == response.json()
    assert committed["mode"] == "demo"
    assert STATUS_RESPONSE_PATH.read_bytes().replace(b"\r\n", b"\n") == rendered[STATUS_RESPONSE_PATH]


def test_regeneration_isolation(rendered: dict[Path, bytes], monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    # ``ai_mode`` and ``AI_MODE`` are distinct variables only on case-sensitive systems such
    # as Linux CI; on Windows they are the same variable.
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ai_mode", "real")
    monkeypatch.setenv("MAX_PDF_PAGES", "5")
    monkeypatch.setenv("ALLOWED_ORIGIN", "not a valid origin")
    env_file = tmp_path / "probe.env"
    env_file.write_text("AI_MODE=real\nMAX_PDF_PAGES=3\n", encoding="utf-8")
    monkeypatch.setitem(Settings.model_config, "env_file", env_file)
    assert write_fixtures.render_fixtures() == rendered


def test_rendering_never_writes(rendered: dict[Path, bytes], monkeypatch: pytest.MonkeyPatch) -> None:
    import builtins

    attempts: list[str] = []

    def is_write(mode: Any) -> bool:
        return isinstance(mode, str) and any(flag in mode for flag in "wax+")

    def refuse(what: str) -> None:
        attempts.append(what)
        raise AssertionError(f"render_fixtures attempted a write: {what}")

    real_open = builtins.open
    real_path_open = Path.open

    def guarded_open(file: Any, mode: str = "r", *args: Any, **kwargs: Any) -> Any:
        if is_write(mode):
            refuse(f"open({file!r}, {mode!r})")
        return real_open(file, mode, *args, **kwargs)

    def guarded_path_open(self: Path, mode: str = "r", *args: Any, **kwargs: Any) -> Any:
        if is_write(mode):
            refuse(f"Path.open({self!r}, {mode!r})")
        return real_path_open(self, mode, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", guarded_open)
    monkeypatch.setattr(Path, "open", guarded_path_open)
    monkeypatch.setattr(Path, "write_bytes", lambda self, data: refuse(f"write_bytes({self!r})"))
    monkeypatch.setattr(Path, "write_text", lambda self, *a, **k: refuse(f"write_text({self!r})"))
    result = write_fixtures.render_fixtures()
    assert attempts == []
    assert result == rendered
