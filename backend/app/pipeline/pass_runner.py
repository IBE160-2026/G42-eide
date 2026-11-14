"""Run one Generation Pass: stages 1 → 2 → 3 → 4 → 5 → 6, one at a time (AD-1, AD-16).

``PassRunner`` is built once with its connector, settings and the app's shared
``PassGuard``; ``run_pass(doc, filename, inputs, source)`` keeps the architecture's call
shape. Pipeline failures raise ``PassFailure``; programming errors raise ``ValueError`` or
``TypeError``. The cost gate and the paid-call counter are not part of this module yet
(Epic 2).

Callers pass inputs built by ``read_generation_inputs``. Async routes must call
``run_pass`` through a thread pool, and every route must use ``app.state.pass_guard``.

Privacy: nothing here logs. Stage 4 records a valid connector code (or a flag) inside its
``except`` clause and raises only after the clause has ended, so no ``ConnectorError`` is
chained or kept in a frame local. Raised failures' traceback frames can still hold
document or AI text (for example ``request``); callers log only the failure code.
"""

from typing import Literal, get_args

from app.config import Settings
from app.contracts.connector import (
    CONNECTOR_ERROR_CODES,
    Connector,
    ConnectorError,
    ConnectorErrorCode,
    ConnectorReply,
    ConnectorRequest,
)
from app.contracts.inputs import GenerationInputs
from app.contracts.options import AiMode
from app.contracts.responses import GenerationResponse
from app.contracts.results import ValidatedResults
from app.pipeline.failures import PassFailure
from app.pipeline.pass_guard import PassGuard
from app.pipeline.stage1_validate import validate_bytes
from app.pipeline.stage2_extract import ExtractedDocument, extract_document
from app.pipeline.stage3_prompt import build_request
from app.pipeline.stage5_gates import validate_output

PassSource = Literal["upload", "sample"]
PASS_SOURCES: tuple[PassSource, ...] = get_args(PassSource)


def respond(
    results: ValidatedResults, extracted: ExtractedDocument, mode: AiMode
) -> GenerationResponse:
    """Stage 6: build the success envelope; accepts only ``ValidatedResults``."""
    if not isinstance(results, ValidatedResults):
        raise TypeError("stage 6 accepts only ValidatedResults")
    return GenerationResponse(mode=mode, results=results, skipped_pages=extracted.skipped_pages)


class PassRunner:
    """Runs Generation Passes with one connector, fixed settings and a shared guard."""

    def __init__(self, *, connector: Connector, settings: Settings, guard: PassGuard) -> None:
        self._connector = connector
        self._settings = settings
        self._guard = guard
        self._mode: AiMode = settings.ai_mode

    def run_pass(
        self, doc: bytes, filename: str, inputs: GenerationInputs, source: PassSource
    ) -> GenerationResponse:
        """Run one pass; return the success envelope or raise ``PassFailure``."""
        if not (type(source) is str and source in PASS_SOURCES):
            raise ValueError("unknown pass source")
        # Outside the try: a refused call never reaches the finally that releases the lock.
        if not self._guard.try_acquire():
            raise PassFailure("generation_in_progress")
        try:
            checked = validate_bytes(doc, filename, max_pdf_pages=self._settings.max_pdf_pages)
            extracted = extract_document(checked, max_text_chars=self._settings.max_text_chars)
            request = build_request(extracted, inputs)
            # Cost gate: not in this story (Epic 2).
            reply = self._generate(request)
            results = validate_output(reply, extracted)
            return respond(results, extracted, self._mode)
        finally:
            self._guard.release()

    def _generate(self, request: ConnectorRequest) -> ConnectorReply:
        """Stage 4: call the connector and map a valid ``ConnectorError`` code."""
        failed_code: ConnectorErrorCode | None = None
        invalid_code = False
        try:
            reply = self._connector.generate(request)
        except ConnectorError as error:
            code = getattr(error, "code", None)
            if type(code) is str and code in CONNECTOR_ERROR_CODES:
                failed_code = code
            else:
                invalid_code = True
            del code  # keep no possibly unsafe value in the frame
        else:
            if not isinstance(reply, ConnectorReply):
                raise TypeError("connector must return a ConnectorReply")
            return reply
        if invalid_code:
            raise TypeError("connector raised an invalid error code")
        raise PassFailure(failed_code)  # type: ignore[arg-type]
