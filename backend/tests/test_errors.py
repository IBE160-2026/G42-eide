import ast
import asyncio
import io
import logging
import re
import time
from collections.abc import Awaitable, Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI, Form
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient
from pydantic import BaseModel, ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

import app.api.errors as api_errors
import app.contracts.errors as contract
from app.api.errors import LOGGER_NAME, AppError
from app.application import create_app
from app.contracts.errors import ERROR_CODES, HTTP_STATUS, MESSAGES

ALLOWED = "http://localhost:3000"
TOKEN = "zq7tokenx91"
LINE = re.compile(r"^stage=api code=([a-z_]+) duration_ms=\d+( reference_id=([0-9a-f]{8}))?$")

EXPECTED_TABLE: dict[str, tuple[int, str]] = {
    "unsupported_file_type": (400, "Bare PDF- og tekstfiler (.pdf, .txt) støttes."),
    "bad_text_encoding": (400, "Tekstfilen er ikke lagret som UTF-8."),
    "unreadable_file": (400, "PDF-filen kunne ikke åpnes."),
    "no_extractable_text": (400, "Dokumentet inneholder ingen tekst som kan hentes ut."),
    "invalid_request": (400, "Forespørselen hadde feil format."),
    "demo_mode_no_uploads": (403, "Opplasting er slått av i demomodus."),
    "demo_not_enabled": (403, "Demoen er bare tilgjengelig i demomodus."),
    "not_found": (404, "Adressen finnes ikke."),
    "method_not_allowed": (405, "Metoden støttes ikke for denne adressen."),
    "generation_in_progress": (409, "En annen generering kjører allerede."),
    "file_too_large": (413, "Dokumentet overskrider en av grensene for opplasting."),
    "insufficient_content": (422, "KI-tjenesten fant for lite fagstoff i dokumentet."),
    "ai_rate_limited": (429, "KI-tjenesten tar imot for mange forespørsler akkurat nå."),
    "internal_error": (500, "Det oppstod en uventet feil i serveren."),
    "ai_unavailable": (502, "KI-tjenesten svarte ikke i tide eller er utilgjengelig."),
    "ai_output_invalid": (502, "Svaret fra KI-tjenesten besto ikke valideringen."),
    "ai_credits_exhausted": (503, "Kreditten hos KI-leverandøren er brukt opp."),
    "session_call_limit_reached": (503, "Grensen for KI-kall i denne serverøkten er nådd."),
}

RAISABLE = [code for code in ERROR_CODES if code not in ("not_found", "method_not_allowed")]


class _Body(BaseModel):
    n: int


def _stream_then_fail() -> Iterator[bytes]:
    yield b"first"
    raise RuntimeError(f"secret {TOKEN}")


def _add_test_routes(application: FastAPI) -> None:
    @application.get("/test/item")
    def item(n: int) -> dict[str, int]:
        return {"n": n}

    @application.post("/test/body")
    def body(payload: _Body) -> dict[str, int]:
        return {"n": payload.n}

    @application.post("/test/form")
    def form(name: str = Form()) -> dict[str, str]:
        return {"name": name}

    @application.get("/test/app-error/{code}")
    def app_error(code: str) -> None:
        raise AppError(code, limit="pages" if code == "file_too_large" else None)  # type: ignore[arg-type]

    @application.get("/test/http-418")
    def teapot() -> None:
        raise StarletteHTTPException(418, detail=f"secret {TOKEN}")

    @application.get("/test/http-400")
    def bad() -> None:
        raise StarletteHTTPException(400, detail=f"secret {TOKEN}")

    @application.get("/test/boom")
    def boom() -> None:
        raise RuntimeError(f"secret {TOKEN}")

    @application.api_route("/test/head-boom", methods=["GET", "HEAD"])
    def head_boom() -> None:
        raise RuntimeError(f"secret {TOKEN}")

    @application.api_route("/test/head-app-error", methods=["GET", "HEAD"])
    def head_app_error() -> None:
        raise AppError("generation_in_progress")

    @application.get("/test/slow-app-error")
    def slow_app_error() -> None:
        time.sleep(0.05)
        raise AppError("generation_in_progress")

    @application.get("/test/stream")
    def stream() -> StreamingResponse:
        return StreamingResponse(_stream_then_fail(), media_type="text/plain")


@pytest.fixture
def test_app(demo_app: FastAPI) -> FastAPI:
    _add_test_routes(demo_app)
    return demo_app


@pytest.fixture
def tclient(test_app: FastAPI) -> Iterator[TestClient]:
    with TestClient(test_app, headers={"Origin": ALLOWED}) as test_client:
        yield test_client


@pytest.fixture
def logs(caplog: pytest.LogCaptureFixture) -> Iterator[pytest.LogCaptureFixture]:
    # ``app.errors`` does not propagate, so capture through the dedicated logger.
    # ``caplog.handler`` differs per test phase, so remove the same object we added.
    error_logger = logging.getLogger(LOGGER_NAME)
    handler = caplog.handler
    error_logger.addHandler(handler)
    try:
        yield caplog
    finally:
        error_logger.removeHandler(handler)


def _records(caplog: pytest.LogCaptureFixture) -> list[logging.LogRecord]:
    return [r for r in caplog.records if r.name == LOGGER_NAME]


def _error_log_text(caplog: pytest.LogCaptureFixture) -> str:
    """Everything ``app.errors`` logged, including any formatted exception text.

    Other loggers (such as the test client's own request lines) are not the app's output.
    """
    parts: list[str] = []
    for record in _records(caplog):
        parts.append(record.getMessage())
        if record.exc_text:
            parts.append(record.exc_text)
        if record.exc_info:
            parts.append(logging.Formatter().formatException(record.exc_info))
        if record.stack_info:
            parts.append(record.stack_info)
    return "\n".join(parts)


def _one_line(caplog: pytest.LogCaptureFixture, code: str) -> re.Match[str]:
    records = _records(caplog)
    assert len(records) == 1, [r.getMessage() for r in records]
    record = records[0]
    match = LINE.match(record.getMessage())
    assert match is not None, record.getMessage()
    assert match.group(1) == code
    assert (match.group(3) is not None) == (code == "internal_error")
    expected_level = logging.ERROR if HTTP_STATUS[code] >= 500 else logging.INFO  # type: ignore[index]
    assert record.levelno == expected_level
    assert record.exc_info is None and record.exc_text is None
    return match


def _assert_envelope(response: Any, code: str) -> dict[str, Any]:
    assert response.status_code == EXPECTED_TABLE[code][0]
    assert response.headers["content-type"] == "application/json"
    assert response.headers["access-control-allow-origin"] == ALLOWED
    body: dict[str, Any] = response.json()
    assert body["error_code"] == code
    assert body["message"] == EXPECTED_TABLE[code][1]
    assert set(body) <= {"error_code", "message", "limit", "reference_id"}
    return body


# --- contract -----------------------------------------------------------------------------


def test_contract_matches_the_decisions_table() -> None:
    assert len(ERROR_CODES) == 18
    assert set(ERROR_CODES) == set(EXPECTED_TABLE)
    assert HTTP_STATUS == {code: status for code, (status, _) in EXPECTED_TABLE.items()}
    assert MESSAGES == {code: message for code, (_, message) in EXPECTED_TABLE.items()}


def test_contract_imports_nothing_from_the_app() -> None:
    tree = ast.parse(Path(contract.__file__).read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            assert node.level == 0
            names = [node.module or ""]
        else:
            continue
        for name in names:
            assert name != "app" and not name.startswith("app."), name


def test_error_response_omits_unset_optional_fields() -> None:
    body = contract.ErrorResponse(error_code="not_found", message=MESSAGES["not_found"]).to_body()
    assert body == {"error_code": "not_found", "message": "Adressen finnes ikke."}


def test_error_response_requires_the_approved_message() -> None:
    with pytest.raises(ValidationError):
        contract.ErrorResponse(error_code="not_found", message="Noe annet.")


def test_error_response_limit_exactly_for_file_too_large() -> None:
    message = MESSAGES["file_too_large"]
    assert contract.ErrorResponse(
        error_code="file_too_large", message=message, limit="bytes"
    ).to_body() == {"error_code": "file_too_large", "message": message, "limit": "bytes"}
    with pytest.raises(ValidationError):
        contract.ErrorResponse(error_code="file_too_large", message=message)
    with pytest.raises(ValidationError):
        contract.ErrorResponse(
            error_code="invalid_request", message=MESSAGES["invalid_request"], limit="bytes"
        )


def test_error_response_reference_id_exactly_for_internal_error() -> None:
    message = MESSAGES["internal_error"]
    body = contract.ErrorResponse(
        error_code="internal_error", message=message, reference_id="abcdef01"
    ).to_body()
    assert body == {"error_code": "internal_error", "message": message, "reference_id": "abcdef01"}
    with pytest.raises(ValidationError):
        contract.ErrorResponse(error_code="internal_error", message=message)
    with pytest.raises(ValidationError):
        contract.ErrorResponse(
            error_code="not_found", message=MESSAGES["not_found"], reference_id="abcdef01"
        )


# --- AppError ------------------------------------------------------------------------------


@pytest.mark.parametrize("code", ["not_found", "method_not_allowed", "nope"])
def test_app_error_refuses_framework_and_unknown_codes(code: str) -> None:
    with pytest.raises(ValueError):
        AppError(code)  # type: ignore[arg-type]


def test_app_error_requires_limit_for_file_too_large() -> None:
    with pytest.raises(ValueError):
        AppError("file_too_large")
    with pytest.raises(ValueError):
        AppError("file_too_large", limit="kilos")  # type: ignore[arg-type]


@pytest.mark.parametrize("code", [c for c in RAISABLE if c != "file_too_large"])
def test_app_error_refuses_limit_on_other_codes(code: str) -> None:
    with pytest.raises(ValueError):
        AppError(code, limit="bytes")  # type: ignore[arg-type]


@pytest.mark.parametrize("code", RAISABLE)
def test_app_error_reply(tclient: TestClient, logs: pytest.LogCaptureFixture, code: str) -> None:
    response = tclient.get(f"/test/app-error/{code}")
    body = _assert_envelope(response, code)
    if code == "file_too_large":
        assert body["limit"] == "pages"
    else:
        assert "limit" not in body
    match = _one_line(logs, code)
    if code == "internal_error":
        assert re.fullmatch(r"[0-9a-f]{8}", body["reference_id"])
        assert match.group(3) == body["reference_id"]
    else:
        assert "reference_id" not in body


# --- framework errors ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path"),
    [("GET", f"/nope-{TOKEN}"), ("POST", f"/nope-{TOKEN}"), ("GET", f"/api/status/?q={TOKEN}")],
)
def test_unknown_path_is_not_found(
    tclient: TestClient, logs: pytest.LogCaptureFixture, method: str, path: str
) -> None:
    response = tclient.request(method, path, follow_redirects=False)
    body = _assert_envelope(response, "not_found")
    assert body == {"error_code": "not_found", "message": "Adressen finnes ikke."}
    assert "location" not in response.headers
    assert TOKEN not in response.text
    _one_line(logs, "not_found")
    assert TOKEN not in _error_log_text(logs)


@pytest.mark.parametrize("method", ["POST", "OPTIONS"])
def test_unsupported_method(tclient: TestClient, logs: pytest.LogCaptureFixture, method: str) -> None:
    response = tclient.request(method, "/api/status")
    body = _assert_envelope(response, "method_not_allowed")
    assert body == {
        "error_code": "method_not_allowed",
        "message": "Metoden støttes ikke for denne adressen.",
    }
    assert response.headers["allow"] == "GET"
    _one_line(logs, "method_not_allowed")


@pytest.mark.parametrize(("path", "status", "code"), [
    ("/api/status", 405, "method_not_allowed"),
    ("/nope", 404, "not_found"),
])
def test_head_gets_headers_only(
    tclient: TestClient, logs: pytest.LogCaptureFixture, path: str, status: int, code: str
) -> None:
    response = tclient.head(path)
    assert response.status_code == status
    assert response.headers["access-control-allow-origin"] == ALLOWED
    assert "content-type" not in response.headers
    assert response.headers.get("content-length", "0") == "0"
    if status == 405:
        assert response.headers["allow"] == "GET"
    _one_line(logs, code)


def test_invalid_parameter_type(tclient: TestClient, logs: pytest.LogCaptureFixture) -> None:
    response = tclient.get("/test/item", params={"n": TOKEN})
    body = _assert_envelope(response, "invalid_request")
    assert body == {"error_code": "invalid_request", "message": "Forespørselen hadde feil format."}
    assert TOKEN not in response.text
    _one_line(logs, "invalid_request")
    assert TOKEN not in _error_log_text(logs)


@pytest.mark.parametrize(
    "content", [f'{{"n": "{TOKEN}"'.encode(), f'{{"n": "{TOKEN}"}}'.encode()]
)
def test_malformed_or_invalid_json_body(
    tclient: TestClient, logs: pytest.LogCaptureFixture, content: bytes
) -> None:
    response = tclient.post(
        "/test/body", content=content, headers={"Content-Type": "application/json"}
    )
    _assert_envelope(response, "invalid_request")
    assert TOKEN not in response.text
    _one_line(logs, "invalid_request")
    assert TOKEN not in _error_log_text(logs)


def test_body_parsing_400_is_invalid_request(
    tclient: TestClient, logs: pytest.LogCaptureFixture
) -> None:
    # No boundary: the multipart parser fails and the framework raises HTTPException(400).
    response = tclient.post(
        "/test/form",
        content=f"--b\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n{TOKEN}".encode(),
        headers={"Content-Type": "multipart/form-data"},
    )
    _assert_envelope(response, "invalid_request")
    assert TOKEN not in response.text
    _one_line(logs, "invalid_request")
    assert TOKEN not in _error_log_text(logs) and "secret" not in _error_log_text(logs)


def test_framework_400_is_invalid_request(
    tclient: TestClient, logs: pytest.LogCaptureFixture
) -> None:
    response = tclient.get("/test/http-400")
    _assert_envelope(response, "invalid_request")
    assert "secret" not in response.text and TOKEN not in response.text
    _one_line(logs, "invalid_request")
    assert TOKEN not in _error_log_text(logs) and "secret" not in _error_log_text(logs)


@pytest.mark.parametrize("path", ["/test/http-418", "/test/boom"])
def test_unexpected_errors_are_internal(
    tclient: TestClient,
    logs: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
    path: str,
) -> None:
    # A fixed id without "4", "1" or "8" keeps the "418" check deterministic.
    monkeypatch.setattr(api_errors, "_new_reference_id", lambda: "abcdefab")
    response = tclient.get(path)
    body = _assert_envelope(response, "internal_error")
    assert set(body) == {"error_code", "message", "reference_id"}
    assert re.fullmatch(r"[0-9a-f]{8}", body["reference_id"])
    assert body["reference_id"] == "abcdefab"
    match = _one_line(logs, "internal_error")
    assert match.group(3) == body["reference_id"]
    for text in (response.text, _error_log_text(logs)):
        for forbidden in ("secret", TOKEN, "RuntimeError", "HTTPException", "Traceback", "418"):
            assert forbidden not in text


def test_each_internal_error_gets_a_fresh_reference_id(tclient: TestClient) -> None:
    ids = {tclient.get("/test/boom").json()["reference_id"] for _ in range(5)}
    assert len(ids) == 5


def test_duration_is_measured_from_the_request_start(
    tclient: TestClient, logs: pytest.LogCaptureFixture
) -> None:
    response = tclient.get("/test/slow-app-error")
    _assert_envelope(response, "generation_in_progress")
    _one_line(logs, "generation_in_progress")
    duration = int(_records(logs)[0].getMessage().split("duration_ms=")[1].split()[0])
    assert duration >= 50


def test_error_without_origin_has_no_cors_header(
    test_app: FastAPI, logs: pytest.LogCaptureFixture
) -> None:
    with TestClient(test_app) as client:
        response = client.get("/nope")
    assert response.status_code == 404
    assert response.json() == {"error_code": "not_found", "message": "Adressen finnes ikke."}
    assert "access-control-allow-origin" not in response.headers
    _one_line(logs, "not_found")


# --- ASGI level ----------------------------------------------------------------------------


def _run_asgi(
    application: FastAPI,
    method: str,
    path: str,
    on_send: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
) -> list[dict[str, Any]]:
    sent: list[dict[str, Any]] = []

    async def main() -> None:
        delivered = False
        never = asyncio.Event()

        async def receive() -> dict[str, Any]:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": b"", "more_body": False}
            await never.wait()
            return {"type": "http.disconnect"}

        async def send(message: dict[str, Any]) -> None:
            if on_send is not None:
                await on_send(message)
            sent.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "root_path": "",
            "headers": [(b"host", b"testserver"), (b"origin", ALLOWED.encode())],
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
            "state": {},
        }
        await application(scope, receive, send)

    asyncio.run(main())
    return sent


@pytest.mark.parametrize(
    ("path", "status", "code"),
    [
        ("/api/status", 405, "method_not_allowed"),
        ("/nope", 404, "not_found"),
        ("/test/head-boom", 500, "internal_error"),
        ("/test/head-app-error", 409, "generation_in_progress"),
    ],
)
def test_head_sends_no_body_bytes(
    test_app: FastAPI, logs: pytest.LogCaptureFixture, path: str, status: int, code: str
) -> None:
    sent = _run_asgi(test_app, "HEAD", path)
    starts = [m for m in sent if m["type"] == "http.response.start"]
    assert len(starts) == 1
    assert starts[0]["status"] == status
    headers = {k.decode().lower(): v.decode() for k, v in starts[0]["headers"]}
    assert "content-type" not in headers
    assert headers["content-length"] == "0"
    assert headers["access-control-allow-origin"] == ALLOWED
    if status == 405:
        assert headers["allow"] == "GET"
    else:
        assert "allow" not in headers
    assert b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body") == b""
    _one_line(logs, code)
    assert "secret" not in _error_log_text(logs) and TOKEN not in _error_log_text(logs)


def test_error_after_start_logs_and_leaves_reply_incomplete(
    test_app: FastAPI, logs: pytest.LogCaptureFixture
) -> None:
    sent = _run_asgi(test_app, "GET", "/test/stream")
    starts = [m for m in sent if m["type"] == "http.response.start"]
    assert len(starts) == 1
    assert starts[0]["status"] == 200
    bodies = [m for m in sent if m["type"] == "http.response.body"]
    assert len(bodies) >= 1
    assert b"".join(m.get("body", b"") for m in bodies) == b"first"
    assert all(m.get("more_body", False) is True for m in bodies)
    _one_line(logs, "internal_error")
    for forbidden in ("secret", TOKEN, "RuntimeError", "Traceback"):
        assert forbidden not in _error_log_text(logs)


def test_failed_reply_build_logs_once(
    test_app: FastAPI, logs: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(self: contract.ErrorResponse) -> dict[str, Any]:
        raise RuntimeError(f"secret {TOKEN}")

    monkeypatch.setattr(contract.ErrorResponse, "to_body", broken)
    sent = _run_asgi(test_app, "GET", "/nope")
    assert [m for m in sent if m["type"] == "http.response.start"] == []
    _one_line(logs, "internal_error")
    assert "secret" not in _error_log_text(logs) and TOKEN not in _error_log_text(logs)


def test_failed_send_of_the_500_does_not_escape(
    test_app: FastAPI, logs: pytest.LogCaptureFixture
) -> None:
    async def refuse_start(message: dict[str, Any]) -> None:
        if message["type"] == "http.response.start":
            raise OSError("client gone")

    sent = _run_asgi(test_app, "GET", "/test/boom", on_send=refuse_start)
    assert sent == []
    _one_line(logs, "internal_error")


# --- preflight, status and logging setup ---------------------------------------------------


@pytest.mark.parametrize("path", ["/api/status", "/nope"])
def test_allowed_preflight_is_unchanged(
    test_app: FastAPI, logs: pytest.LogCaptureFixture, path: str
) -> None:
    with TestClient(test_app) as client:
        response = client.options(
            path, headers={"Origin": ALLOWED, "Access-Control-Request-Method": "GET"}
        )
    assert response.status_code == 200
    assert "error_code" not in response.text
    assert _records(logs) == []


@pytest.mark.parametrize(
    "headers",
    [
        {"Origin": "http://evil.test", "Access-Control-Request-Method": "GET"},
        {"Origin": ALLOWED, "Access-Control-Request-Method": "DELETE"},
        {
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-Foo",
        },
    ],
    ids=["origin", "method", "header"],
)
def test_rejected_preflight_is_unchanged(
    test_app: FastAPI, logs: pytest.LogCaptureFixture, headers: dict[str, str]
) -> None:
    with TestClient(test_app) as client:
        response = client.options("/api/status", headers=headers)
    assert response.status_code == 400
    assert response.headers["content-type"].startswith("text/plain")
    assert "error_code" not in response.text
    assert _records(logs) == []


def test_status_writes_no_log_line(tclient: TestClient, logs: pytest.LogCaptureFixture) -> None:
    assert tclient.get("/api/status").status_code == 200
    assert _records(logs) == []


def test_logging_setup_is_idempotent(
    make_settings: Any, caplog: pytest.LogCaptureFixture
) -> None:
    create_app(make_settings())
    application = create_app(make_settings())
    error_logger = logging.getLogger(LOGGER_NAME)
    # Pytest itself attaches its capture handlers to every non-propagating logger.
    pytest_handler_type = type(caplog.handler)
    own = [h for h in error_logger.handlers if not isinstance(h, pytest_handler_type)]
    assert len(own) == 1
    assert error_logger.propagate is False
    handler = caplog.handler
    error_logger.addHandler(handler)
    try:
        with TestClient(application) as client:
            client.get("/nope")
    finally:
        error_logger.removeHandler(handler)
    _one_line(caplog, "not_found")


def test_uvicorn_access_log_is_disabled(demo_app: FastAPI) -> None:
    assert logging.getLogger("uvicorn.access").disabled is True
    assert logging.getLogger("uvicorn").disabled is False
    assert logging.getLogger("uvicorn.error").disabled is False


@pytest.mark.parametrize(
    ("path", "code"), [("/nope", "not_found"), ("/test/boom", "internal_error")]
)
def test_console_shows_exactly_one_line_per_error(
    test_app: FastAPI, capsys: pytest.CaptureFixture[str], path: str, code: str
) -> None:
    with TestClient(test_app) as client:
        capsys.readouterr()
        client.get(path)
        captured = capsys.readouterr()
    lines = captured.err.splitlines()
    assert len(lines) == 1, lines
    match = LINE.match(lines[0])
    assert match is not None and match.group(1) == code
    assert (match.group(3) is not None) == (code == "internal_error")
    assert captured.out == ""


def test_root_handler_does_not_duplicate_lines(
    test_app: FastAPI, capsys: pytest.CaptureFixture[str]
) -> None:
    root = logging.getLogger()
    saved_handlers, saved_level = root.handlers[:], root.level
    root_stream = io.StringIO()
    root.handlers = []
    logging.basicConfig(stream=root_stream, level=logging.INFO)
    try:
        with TestClient(test_app) as client:
            capsys.readouterr()
            client.get("/nope")
            captured = capsys.readouterr()
    finally:
        for handler in root.handlers[:]:
            root.removeHandler(handler)
        root.handlers = saved_handlers
        root.setLevel(saved_level)
    lines = captured.err.splitlines()
    assert len(lines) == 1, lines
    assert LINE.match(lines[0])
    assert "stage=api" not in root_stream.getvalue()
