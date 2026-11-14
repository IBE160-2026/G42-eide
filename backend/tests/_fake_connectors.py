"""A deterministic fake AI connector for tests (Story 1.9, D3, D9). Test-only.

Create one ``FakeConnector`` per test; never at module level or in a fixture wider than
function scope, so recorded requests never leak between tests. The recorded requests hold
document text and course codes: assert on identity or marker strings, never print them.
"""

from app.contracts.connector import (
    CONNECTOR_ERROR_CODES,
    ConnectorError,
    ConnectorErrorCode,
    ConnectorReply,
    ConnectorRequest,
    StopReason,
)


def _check_token_value(value: object) -> int:
    # Exact int only: rejects bool and other int subclasses such as IntEnum members (R2).
    if type(value) is not int or value < 0:
        raise ValueError("token values must be non-negative integers")
    return value


def _check_error_code(code: object) -> ConnectorErrorCode | None:
    if code is not None and code not in CONNECTOR_ERROR_CODES:
        raise ValueError("unknown connector error code")
    return code  # type: ignore[return-value]


class FakeConnector:
    """Returns one fixed reply and token count, or raises a chosen ``ConnectorError``.

    Every configuration value is checked here, so ``generate`` and ``count_input_tokens``
    can raise only ``ConnectorError``. It never reads ``request.inputs``, never parses
    ``raw_json`` and writes no logs.
    """

    def __init__(
        self,
        *,
        raw_json: str,
        stop: StopReason = "complete",
        token_count: int = 1000,
        input_tokens: int = 1000,
        output_tokens: int = 500,
        count_error: ConnectorErrorCode | None = None,
        generate_error: ConnectorErrorCode | None = None,
    ) -> None:
        # Built once: a bad raw_json, stop or reply token fails here with ValidationError.
        self._reply = ConnectorReply(
            raw_json=raw_json, stop=stop, input_tokens=input_tokens, output_tokens=output_tokens
        )
        self._token_count = _check_token_value(token_count)
        self._count_error = _check_error_code(count_error)
        self._generate_error = _check_error_code(generate_error)
        self.count_requests: list[ConnectorRequest] = []
        self.generate_requests: list[ConnectorRequest] = []

    @property
    def count_calls(self) -> int:
        return len(self.count_requests)

    @property
    def generate_calls(self) -> int:
        return len(self.generate_requests)

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        self.count_requests.append(request)
        if self._count_error is not None:
            raise ConnectorError(self._count_error)
        return self._token_count

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        self.generate_requests.append(request)
        if self._generate_error is not None:
            raise ConnectorError(self._generate_error)
        return self._reply
