"""One error format for every failure (AD-11, AR-12) and one log line per error reply (AR-26).

Replies and log lines never echo a path, query, input value, exception class name,
exception message, document content or secret.
"""

import logging
import secrets
import sys
import time
from collections.abc import Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.contracts.errors import (
    ERROR_CODES,
    HTTP_STATUS,
    LIMIT_KINDS,
    MESSAGES,
    ErrorCode,
    ErrorResponse,
    LimitKind,
)

LOGGER_NAME = "app.errors"
logger = logging.getLogger(LOGGER_NAME)

# Key in ``scope["state"]`` holding the request start time (``time.perf_counter()``).
START_KEY = "error_timer_start"

_FRAMEWORK_ONLY: frozenset[ErrorCode] = frozenset({"not_found", "method_not_allowed"})


class AppError(Exception):
    """An application failure with a code from the closed list."""

    def __init__(self, code: ErrorCode, limit: LimitKind | None = None) -> None:
        if code not in ERROR_CODES:
            raise ValueError("unknown error code")
        if code in _FRAMEWORK_ONLY:
            raise ValueError("this error code comes only from the framework")
        if code == "file_too_large":
            if limit not in LIMIT_KINDS:
                raise ValueError("file_too_large needs a limit")
        elif limit is not None:
            raise ValueError("only file_too_large takes a limit")
        super().__init__(code)
        self.code: ErrorCode = code
        self.limit: LimitKind | None = limit


def _new_reference_id() -> str:
    return secrets.token_hex(4)


def _duration_ms(scope: Scope) -> int:
    state = scope.get("state")
    start = state.get(START_KEY) if isinstance(state, Mapping) else None
    if not isinstance(start, float):
        return 0
    return max(0, round((time.perf_counter() - start) * 1000))


def _log_error(scope: Scope, code: ErrorCode, reference_id: str | None) -> None:
    line = f"stage=api code={code} duration_ms={_duration_ms(scope)}"
    if reference_id is not None:
        line += f" reference_id={reference_id}"
    level = logging.ERROR if HTTP_STATUS[code] >= 500 else logging.INFO
    logger.log(level, line)


def build_error_response(
    scope: Scope,
    code: ErrorCode,
    limit: LimitKind | None = None,
    allow: str | None = None,
) -> Response:
    """The single builder for every error reply; it also writes the one log line."""
    reference_id = _new_reference_id() if code == "internal_error" else None
    status = HTTP_STATUS[code]
    headers = {"Allow": allow} if allow is not None else None
    response: Response
    if scope.get("method") == "HEAD":
        # Status and headers only: no body, no content-type, length 0.
        response = Response(status_code=status, headers=headers)
    else:
        body = ErrorResponse(
            error_code=code, message=MESSAGES[code], limit=limit, reference_id=reference_id
        )
        response = JSONResponse(body.to_body(), status_code=status, headers=headers)
    # Logged only once the reply exists, so a failed build never leaves a second line.
    _log_error(scope, code, reference_id)
    return response


async def _app_error_handler(request: Request, exc: Exception) -> Response:
    if not isinstance(exc, AppError):
        return build_error_response(request.scope, "internal_error")
    return build_error_response(request.scope, exc.code, limit=exc.limit)


async def _http_exception_handler(request: Request, exc: Exception) -> Response:
    if not isinstance(exc, StarletteHTTPException):
        return build_error_response(request.scope, "internal_error")
    if exc.status_code == 404:
        return build_error_response(request.scope, "not_found")
    if exc.status_code == 405:
        allow = (exc.headers or {}).get("Allow")
        return build_error_response(request.scope, "method_not_allowed", allow=allow)
    if exc.status_code == 400:
        return build_error_response(request.scope, "invalid_request")
    # Any other framework HTTP error has no approved mapping (Decisions, Q1).
    return build_error_response(request.scope, "internal_error")


async def _validation_error_handler(request: Request, exc: Exception) -> Response:
    return build_error_response(request.scope, "invalid_request")


def register_error_handlers(application: FastAPI) -> None:
    application.add_exception_handler(AppError, _app_error_handler)
    application.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    application.add_exception_handler(RequestValidationError, _validation_error_handler)


class CatchAllMiddleware:
    """Pure ASGI catch-all, added inside ``CORSMiddleware``.

    Records the start time and turns an uncaught exception into ``internal_error``.
    After a reply has started it only logs and returns: it never re-raises and never
    completes the reply.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        state = scope.get("state")
        if not isinstance(state, dict):
            state = {}
            scope["state"] = state
        state[START_KEY] = time.perf_counter()

        started = False

        async def send_tracking(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_tracking)
        except Exception:
            if started:
                _log_error(scope, "internal_error", _new_reference_id())
                return
            try:
                response = build_error_response(scope, "internal_error")
            except Exception:
                # The builder logs only after building, so this is the one line.
                _log_error(scope, "internal_error", _new_reference_id())
                return
            try:
                await response(scope, receive, send)
            except Exception:
                return


class _CurrentStderrHandler(logging.StreamHandler):  # type: ignore[type-arg]
    """Writes to whatever ``sys.stderr`` is at the time of each record."""

    def emit(self, record: logging.LogRecord) -> None:
        self.stream = sys.stderr
        super().emit(record)


def configure_logging() -> None:
    """Switch off Uvicorn's access log and give ``app.errors`` one handler (idempotent).

    ``app.errors`` does not propagate, so no line is duplicated when the root logger
    has handlers.
    """
    logging.getLogger("uvicorn.access").disabled = True
    if not any(isinstance(h, _CurrentStderrHandler) for h in logger.handlers):
        handler = _CurrentStderrHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
