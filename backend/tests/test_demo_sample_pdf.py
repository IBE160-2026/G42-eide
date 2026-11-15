"""Story 1.14: ``GET /api/demo/sample.pdf`` serves the bundled sample PDF for demo page links.

One test (or one parametrised test) per row of the spec's I/O matrix that belongs to this
file: S1–S5, R1–R2, F1–F3, Q1–Q2, P1–P4, M1–M4, I1–I3 and L1 (24 rows). Rows R3, I4, E1
and E2 are covered by existing tests (``test_startup_wiring_real``,
``test_no_provider_or_http_client_imports``, ``test_demo.py``, ``test_errors.py``,
``test_status.py``, ``test_app.py``). Two route-metadata tests, added after the independent
implementation review, check the "Sync endpoint" rule (D3) and that the route declares no
request-controlled input (D7, D8) on the registered route itself.

Helpers are local to this module (not imported from other test modules), and the pinned
sample values are copied from ``test_sample_pdf.py``. Raw-ASGI rows are application-level
checks: they show what the app does with a given decoded ``path``, not that a real server
would accept the same request line.
"""

import ast
import asyncio
import hashlib
import inspect
import json
import logging
import re
import socket
import textwrap
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import app.api.demo as demo_api
from app.api.errors import LOGGER_NAME
from app.application import create_app
from app.config import Settings
from app.connectors.demo import DemoConnector
from app.contracts.errors import MESSAGES
from app.samples import SAMPLE_PDF, SAMPLES_DIR
from tests._fakes import FAKE_KEY

ROUTE = "/api/demo/sample.pdf"
ORIGIN = "http://localhost:3000"
# Copied from backend/tests/test_sample_pdf.py (PINNED_PDF_SHA256, PINNED_PDF_SIZE).
PINNED_PDF_SHA256 = "2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63"
PINNED_PDF_SIZE = 471_258
SAMPLE_PATH = SAMPLES_DIR / SAMPLE_PDF
# Headers the endpoint must never add (D3, D12).
FORBIDDEN_HEADERS = (
    "accept-ranges",
    "etag",
    "last-modified",
    "content-range",
    "cache-control",
    "x-content-type-options",
)


# --- helpers ------------------------------------------------------------------------------


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
def real_client(real: FastAPI) -> Iterator[TestClient]:
    with TestClient(real, headers={"Origin": ORIGIN}) as test_client:
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


def records(logs: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in logs.records if r.name == LOGGER_NAME]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def error_body(code: str) -> dict[str, str]:
    return {"error_code": code, "message": MESSAGES[code]}  # type: ignore[index]


def assert_error(response: Any, status: int, code: str) -> dict[str, Any]:
    assert response.status_code == status
    assert response.headers["content-type"] == "application/json"
    assert "content-disposition" not in response.headers
    assert not response.content.startswith(b"%PDF-")
    body = response.json()
    if code == "internal_error":
        assert set(body) == {"error_code", "message", "reference_id"}
        assert {k: body[k] for k in ("error_code", "message")} == error_body(code)
        assert re.fullmatch(r"[0-9a-f]{8}", body["reference_id"])
    else:
        assert body == error_body(code)
    return body


def assert_pdf(response: Any, expected: bytes | None = None) -> None:
    """A success reply with exactly the expected bytes (default: the pinned sample)."""
    assert response.status_code == 200
    if expected is None:
        assert sha256(response.content) == PINNED_PDF_SHA256
        assert len(response.content) == PINNED_PDF_SIZE
    else:
        assert response.content == expected
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == "inline"
    assert response.headers["content-length"] == str(len(response.content))


def one_line(logs: pytest.LogCaptureFixture, code: str, level: int) -> logging.LogRecord:
    found = records(logs)
    assert len(found) == 1, [r.getMessage() for r in found]
    assert found[0].levelno == level
    assert found[0].getMessage().startswith(f"stage=api code={code} ")
    assert found[0].exc_info is None
    return found[0]


def forbidden_fragments(tmp_path: Path) -> list[str]:
    """Following ``_forbidden_fragments`` in ``test_demo.py``: never in a failure log or body."""
    return [
        str(tmp_path),
        str(SAMPLES_DIR),
        SAMPLE_PDF,
        "missing.pdf",
        "No such file",
        "Errno",
        "Traceback",
        "FileNotFoundError",
        "PermissionError",
        "IsADirectoryError",
        "OSError",
    ]


def raw_asgi(application: FastAPI, method: str, path: str, raw_path: bytes) -> list[dict[str, Any]]:
    """Drive the app with one request whose decoded ``path`` and ``raw_path`` are given;
    returns every message the app sent."""
    sent: list[dict[str, Any]] = []

    async def main() -> None:
        delivered = False

        async def receive() -> dict[str, Any]:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": b"", "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message: dict[str, Any]) -> None:
            sent.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "raw_path": raw_path,
            "query_string": b"",
            "root_path": "",
            "headers": [(b"host", b"testserver"), (b"origin", ORIGIN.encode())],
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
            "state": {},
        }
        await application(scope, receive, send)

    asyncio.run(main())
    return sent


def starts_and_body(sent: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], bytes]:
    starts = [m for m in sent if m["type"] == "http.response.start"]
    body = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
    return starts, body


# --- S: success ---------------------------------------------------------------------------


def test_s1_demo_success(client: TestClient) -> None:
    response = client.get(ROUTE)
    assert_pdf(response)
    assert response.content == SAMPLE_PATH.read_bytes()
    assert response.headers["content-length"] == "471258"


def test_s2_same_bytes_as_demo_pass(demo: FastAPI) -> None:
    runner = demo.state.demo_runner
    real_run_pass = runner.run_pass
    docs: list[bytes] = []

    def spy(doc: bytes, *args: Any, **kwargs: Any) -> Any:
        docs.append(doc)
        return real_run_pass(doc, *args, **kwargs)

    runner.run_pass = spy
    with TestClient(demo) as test_client:
        assert test_client.post("/api/demo").status_code == 200
        response = test_client.get(ROUTE)
    assert len(docs) == 1
    assert_pdf(response, expected=docs[0])


def test_s3_read_per_request(demo: FastAPI, tmp_path: Path) -> None:
    sample = tmp_path / "sample.pdf"
    sample.write_bytes(b"%PDF-1.4 version A")
    demo.state.demo_sample_pdf = sample
    with TestClient(demo) as test_client:
        first = test_client.get(ROUTE)
        sample.write_bytes(b"%PDF-1.4 version B, longer")
        second = test_client.get(ROUTE)
    assert_pdf(first, expected=b"%PDF-1.4 version A")
    assert_pdf(second, expected=b"%PDF-1.4 version B, longer")


def test_s4_no_range_handling(client: TestClient) -> None:
    response = client.get(ROUTE, headers={"Range": "bytes=0-99"})
    assert response.status_code == 200
    assert_pdf(response)
    for header in FORBIDDEN_HEADERS:
        assert header not in response.headers, header


def test_s5_no_origin(demo: FastAPI) -> None:
    with TestClient(demo) as test_client:
        response = test_client.get(ROUTE)
    assert_pdf(response)
    assert "access-control-allow-origin" not in response.headers


# --- R: real mode -------------------------------------------------------------------------


def test_r1_real_mode_refused(real_client: TestClient, logs: pytest.LogCaptureFixture) -> None:
    response = real_client.get(ROUTE)
    assert_error(response, 403, "demo_not_enabled")
    one_line(logs, "demo_not_enabled", logging.INFO)


def test_r2_real_mode_reads_nothing(real_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[Path] = []
    real_read_bytes = Path.read_bytes

    def recorder(self: Path) -> bytes:
        calls.append(self)
        return real_read_bytes(self)

    monkeypatch.setattr(Path, "read_bytes", recorder)
    response = real_client.get(ROUTE)
    assert_error(response, 403, "demo_not_enabled")
    assert calls == []


# --- F: installation faults ---------------------------------------------------------------


@pytest.mark.parametrize("case", ["missing", "unreadable"])
def test_f1_f2_sample_fault(
    demo: FastAPI,
    tmp_path: Path,
    logs: pytest.LogCaptureFixture,
    capsys: pytest.CaptureFixture[str],
    case: str,
) -> None:
    # F1: a missing file. F2: a directory (IsADirectoryError on Linux, PermissionError on
    # Windows; both OSError).
    demo.state.demo_sample_pdf = tmp_path / "missing.pdf" if case == "missing" else tmp_path
    with TestClient(demo, headers={"Origin": ORIGIN}) as test_client:
        response = test_client.get(ROUTE)
    body = assert_error(response, 500, "internal_error")
    record = one_line(logs, "internal_error", logging.ERROR)
    assert f"reference_id={body['reference_id']}" in record.getMessage()
    stderr = capsys.readouterr().err
    for fragment in forbidden_fragments(tmp_path):
        assert fragment not in record.getMessage(), fragment
        assert fragment not in logs.text, fragment
        assert fragment not in stderr, fragment
        assert fragment not in response.text, fragment


def test_f3_recovery_after_fault(demo: FastAPI, tmp_path: Path) -> None:
    demo.state.demo_sample_pdf = tmp_path / "missing.pdf"
    with TestClient(demo) as test_client:
        assert test_client.get(ROUTE).status_code == 500
        demo.state.demo_sample_pdf = SAMPLES_DIR / SAMPLE_PDF
        response = test_client.get(ROUTE)
    assert_pdf(response)


# --- Q: query strings ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "query",
    [
        "?file=../backend/.env",
        "?path=demo-ai-output.json",
        "?page=2",
        "?download=1",
        "?q=" + "x" * 4_000,
        "?file=a&file=b",
    ],
    ids=["traversal", "other-file", "page", "download", "long", "repeated-key"],
)
def test_q1_query_ignored(client: TestClient, query: str) -> None:
    assert_pdf(client.get(ROUTE + query))


def test_q2_query_in_real_mode(real_client: TestClient) -> None:
    assert_error(real_client.get(ROUTE + "?file=innkjop-og-lager.pdf"), 403, "demo_not_enabled")


# --- P: paths -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "path",
    [
        "/api/demo/sample.pdf/",
        "/api/demo/Sample.pdf",
        "/api/demo/sample.PDF",
        "/api/demo/sample",
        "/api/demo/sample.pdf.json",
        "/api/demo/innkjop-og-lager.pdf",
        "/api/demo/demo-ai-output.json",
        "/api/demo/demo-response.json",
        "/api/demo/PROVENANCE.md",
        "/samples/innkjop-og-lager.pdf",
        "/api/samples/innkjop-og-lager.pdf",
        "/api/demo/sample.pdf;x=1",
    ],
)
def test_p1_near_miss_paths(client: TestClient, path: str) -> None:
    assert_error(client.get(path), 404, "not_found")


@pytest.mark.parametrize(
    ("path", "raw_path"),
    [
        ("/api/demo/../demo/sample.pdf", b"/api/demo/../demo/sample.pdf"),
        ("/api/demo/./sample.pdf", b"/api/demo/./sample.pdf"),
        ("//api/demo/sample.pdf", b"//api/demo/sample.pdf"),
        ("/api/demo/../sample.pdf", b"/api/demo/%2e%2e/sample.pdf"),
        ("/api/demo/sample.pdf\x00", b"/api/demo/sample.pdf%00"),
    ],
    ids=["dot-dot", "dot", "double-slash", "encoded-dot-dot", "encoded-nul"],
)
def test_p2_unnormalised_paths_raw_asgi(demo: FastAPI, path: str, raw_path: bytes) -> None:
    starts, body = starts_and_body(raw_asgi(demo, "GET", path, raw_path))
    assert len(starts) == 1
    assert starts[0]["status"] == 404
    assert not body.startswith(b"%PDF-")
    assert json.loads(body) == error_body("not_found")


def test_p3_paths_in_real_mode(real_client: TestClient) -> None:
    assert_error(real_client.get("/api/demo/sample.pdf/"), 404, "not_found")


@pytest.mark.parametrize(
    "path",
    ["/api/demo%2Fsample.pdf", "/api/demo/sample%2Epdf", "/api/demo/sample.pdf%0A"],
    ids=["encoded-slash", "encoded-dot", "trailing-newline"],
)
def test_p4_encoded_forms_reach_the_route(client: TestClient, path: str) -> None:
    # D9: routing uses the decoded path; these decode to the route path and can only
    # return the fixed sample.
    assert_pdf(client.get(path))


# --- M: methods and preflight ---------------------------------------------------------------


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def test_m1_other_methods(client: TestClient, logs: pytest.LogCaptureFixture, method: str) -> None:
    response = client.request(method, ROUTE)
    assert_error(response, 405, "method_not_allowed")
    assert response.headers["allow"] == "GET"
    one_line(logs, "method_not_allowed", logging.INFO)


@pytest.mark.parametrize("mode", ["demo", "real"])
def test_m2_head_headers_only(
    make_settings: Callable[..., Settings], logs: pytest.LogCaptureFixture, mode: str
) -> None:
    settings = make_settings() if mode == "demo" else make_settings(ai_mode="real", anthropic_api_key=FAKE_KEY)
    starts, body = starts_and_body(raw_asgi(create_app(settings), "HEAD", ROUTE, ROUTE.encode()))
    assert len(starts) == 1
    assert starts[0]["status"] == 405
    headers = {k.decode().lower(): v.decode() for k, v in starts[0]["headers"]}
    assert headers["allow"] == "GET"
    assert headers["content-length"] == "0"
    assert "content-type" not in headers
    assert headers["access-control-allow-origin"] == ORIGIN
    assert body == b""
    one_line(logs, "method_not_allowed", logging.INFO)


def test_m3_allowed_preflight(demo: FastAPI, logs: pytest.LogCaptureFixture) -> None:
    # Rejected preflights are covered by test_rejected_preflight_is_unchanged (test_errors.py).
    with TestClient(demo) as test_client:
        response = test_client.options(
            ROUTE, headers={"Origin": ORIGIN, "Access-Control-Request-Method": "GET"}
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert "error_code" not in response.text
    assert records(logs) == []


def test_m4_wrong_method_in_real_mode(real_client: TestClient) -> None:
    response = real_client.post(ROUTE)
    assert_error(response, 405, "method_not_allowed")
    assert response.headers["allow"] == "GET"


# --- I: isolation -------------------------------------------------------------------------


def test_i1_pass_lock_not_used(demo: FastAPI) -> None:
    guard = demo.state.pass_guard
    assert guard.try_acquire() is True
    try:
        with TestClient(demo) as test_client:
            response = test_client.get(ROUTE)
        assert_pdf(response)
        assert guard.locked() is True
    finally:
        guard.release()


class AccessSpy:
    """Records every attribute access, then fails it."""

    def __init__(self, accesses: list[str]) -> None:
        object.__setattr__(self, "_accesses", accesses)

    def __getattribute__(self, name: str) -> Any:
        object.__getattribute__(self, "_accesses").append(name)
        raise AssertionError(f"the sample route must not touch the demo runner ({name})")


def test_i2_no_pipeline_or_connector(demo: FastAPI, monkeypatch: pytest.MonkeyPatch) -> None:
    accesses: list[str] = []
    connector_calls: list[str] = []

    def generate(self: DemoConnector, *args: Any, **kwargs: Any) -> Any:
        connector_calls.append("generate")
        raise AssertionError("generate must not run")

    def count_input_tokens(self: DemoConnector, *args: Any, **kwargs: Any) -> Any:
        connector_calls.append("count_input_tokens")
        raise AssertionError("count_input_tokens must not run")

    monkeypatch.setattr(DemoConnector, "generate", generate)
    monkeypatch.setattr(DemoConnector, "count_input_tokens", count_input_tokens)
    with TestClient(demo) as test_client:
        demo.state.demo_runner = AccessSpy(accesses)
        response = test_client.get(ROUTE)
    # The records catch an access even if it was swallowed into a 500.
    assert accesses == []
    assert connector_calls == []
    assert_pdf(response)


def test_i3_no_outbound_network(demo: FastAPI, monkeypatch: pytest.MonkeyPatch) -> None:
    attempts: list[str] = []

    def blocker(name: str) -> Callable[..., Any]:
        def no_network(*args: Any, **kwargs: Any) -> Any:
            attempts.append(name)
            raise AssertionError(f"the sample route must not use the network ({name})")

        return no_network

    # Patch only after the client (and its event loop) is open: on Windows, starting an
    # event loop calls socket.connect internally. monkeypatch restores all of them afterwards.
    with TestClient(demo) as test_client:
        monkeypatch.setattr(socket.socket, "connect", blocker("socket.connect"))
        monkeypatch.setattr(socket.socket, "connect_ex", blocker("socket.connect_ex"))
        monkeypatch.setattr(socket, "create_connection", blocker("create_connection"))
        monkeypatch.setattr(socket, "getaddrinfo", blocker("getaddrinfo"))
        response = test_client.get(ROUTE)
    # The record catches an attempt even if the code swallowed the blocker's exception.
    assert attempts == []
    assert_pdf(response)


# --- route metadata (D3 sync endpoint, D7/D8 no request-controlled input) ------------------


def registered_route(application: FastAPI) -> APIRoute:
    """The ``GET /api/demo/sample.pdf`` route as registered on the app.

    FastAPI 0.162 keeps each included router behind a wrapper whose ``original_router``
    holds the routes the app dispatches to, so the search descends into it.
    """
    found: list[APIRoute] = []
    for entry in application.routes:
        nested = getattr(getattr(entry, "original_router", None), "routes", [entry])
        found += [r for r in nested if isinstance(r, APIRoute) and r.path == ROUTE]
    assert len(found) == 1, found
    return found[0]


def test_route_is_a_sync_endpoint(demo: FastAPI) -> None:
    # D3 and "Sync endpoint": a plain ``def``, so FastAPI runs the file read in its thread pool.
    route = registered_route(demo)
    assert route.endpoint is demo_api.get_sample_pdf
    assert inspect.isfunction(route.endpoint)
    assert not inspect.iscoroutinefunction(route.endpoint)
    assert not inspect.isasyncgenfunction(route.endpoint)


def test_route_declares_no_request_inputs(demo: FastAPI) -> None:
    # D7 and D8: nothing from the request can select the file. The only parameter is the
    # framework's ``Request`` injection, which is not a user-controlled input.
    route = registered_route(demo)
    assert route.methods == {"GET"}
    assert route.dependencies == []
    dependant = route.dependant
    assert dependant.request_param_name == "request"
    assert dependant.path_params == []
    assert dependant.query_params == []
    assert dependant.header_params == []
    assert dependant.cookie_params == []
    assert dependant.body_params == []
    assert dependant.dependencies == []
    assert list(inspect.signature(route.endpoint).parameters) == ["request"]
    # Undeclared reads (``request.query_params``, ``.url``, ``.headers`` …) leave no trace in
    # the metadata above, so the endpoint's own source is checked too: every direct attribute
    # access on the parameter named ``request`` must be ``app`` (for ``app.state``). This is an
    # extra layer, not a proof: indirect access (``getattr``, an alias, a helper function, item
    # access such as ``request["query_string"]`` or a decorator's wrapper) is not detected here.
    # The behavioural rows Q1 and P1–P4 remain the guarantee that nothing from the request
    # selects the file.
    tree = ast.parse(textwrap.dedent(inspect.getsource(route.endpoint)))
    reads = {
        node.attr
        for node in ast.walk(tree)
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id == "request"
    }
    assert reads == {"app"}


# --- L: logging -------------------------------------------------------------------------


def test_l1_no_success_logging(
    client: TestClient, logs: pytest.LogCaptureFixture, capsys: pytest.CaptureFixture[str]
) -> None:
    assert_pdf(client.get(ROUTE))
    assert records(logs) == []
    assert capsys.readouterr().err == ""
