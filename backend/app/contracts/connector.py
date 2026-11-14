"""The connector contract: request, reply, error and interface (AD-4, A1, Story 1.9).

A contracts module imports from the app only other ``app.contracts`` modules (A9).
Test fakes live under ``backend/tests/``; the demo and real connectors come later.
"""

from typing import Annotated, Literal, Protocol, get_args, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, StrictStr

from app.contracts.inputs import GenerationInputs

StopReason = Literal["complete", "length", "refusal", "other"]
STOP_REASONS: tuple[StopReason, ...] = get_args(StopReason)

ConnectorErrorCode = Literal["ai_unavailable", "ai_rate_limited", "ai_credits_exhausted"]
CONNECTOR_ERROR_CODES: tuple[ConnectorErrorCode, ...] = get_args(ConnectorErrorCode)

TokenCount = Annotated[int, Field(strict=True, ge=0)]


class ConnectorRequest(BaseModel):
    """The system instruction, the delimited data block and the normalised inputs.

    ``document_block`` and ``inputs`` are hidden from ``repr()``/``str()`` only (D4); they
    still appear in ``model_dump()``, validation errors and tracebacks, so never log them.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    system: str
    document_block: str = Field(repr=False)
    inputs: GenerationInputs = Field(repr=False)


class ConnectorReply(BaseModel):
    """The AI's unparsed reply text, why it stopped, and the token counts.

    ``raw_json`` is exactly the text received; it is never parsed here (Gate 2 parses it).
    It is hidden from ``repr()``/``str()`` only (D4); never log it.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    raw_json: StrictStr = Field(repr=False)
    stop: StopReason
    input_tokens: TokenCount
    output_tokens: TokenCount


class ConnectorError(Exception):
    """A connector failure with one approved code and nothing else (D2).

    The constructor accepts only the code. Like any exception it stays mutable (notes,
    attributes, ``__cause__``/``__context__``, traceback locals); keeping provider data out
    of those is the connector's responsibility.
    """

    def __init__(self, code: ConnectorErrorCode) -> None:
        # Exact built-in str only: a str subclass or an object that merely compares equal
        # could carry extra data into the error (R1).
        if type(code) is not str or code not in CONNECTOR_ERROR_CODES:
            raise ValueError("unknown connector error code")
        super().__init__(code)
        self.code: ConnectorErrorCode = code


@runtime_checkable
class Connector(Protocol):
    """The one interface every AI connector implements (AD-4, D3).

    A connector:

    (a) sends ``request.system`` as the system instruction and ``request.document_block``
        as the user content exactly as given;
    (b) never inserts ``request.inputs.course_code``, or any other ``inputs`` value, into an
        instruction, prompt, HTML or anything else it builds; stage 3 has already placed
        the sanitised course code inside ``document_block``;
    (c) never logs the request, the reply or their contents;
    (d) returns the provider's text unparsed in ``ConnectorReply.raw_json``;
    (e) maps every provider exception to ``ConnectorError`` with an approved code, never
        raises SDK types, and keeps provider data out of the raised error;
    (f) never retries automatically.

    Both methods may raise ``ConnectorError`` and nothing else.

    ``isinstance(obj, Connector)`` checks only that attributes with these two names exist,
    not that they are callable or have the right signatures (D11).
    """

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        """The number of input tokens the request would use."""
        ...

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        """Send the request and return the unparsed reply."""
        ...
