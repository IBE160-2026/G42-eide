"""The closed list of error codes, their HTTP statuses and messages, and the error body.

This module imports nothing from the app (AD-11, AR-12).
"""

from typing import Any, Literal, Self, get_args

from pydantic import BaseModel, ConfigDict, Field, model_validator

ErrorCode = Literal[
    "unsupported_file_type",
    "bad_text_encoding",
    "unreadable_file",
    "no_extractable_text",
    "invalid_request",
    "demo_mode_no_uploads",
    "demo_not_enabled",
    "not_found",
    "method_not_allowed",
    "generation_in_progress",
    "file_too_large",
    "insufficient_content",
    "ai_rate_limited",
    "internal_error",
    "ai_unavailable",
    "ai_output_invalid",
    "ai_credits_exhausted",
    "session_call_limit_reached",
]
ERROR_CODES: tuple[ErrorCode, ...] = get_args(ErrorCode)

LimitKind = Literal["bytes", "pages", "characters", "tokens"]
LIMIT_KINDS: tuple[LimitKind, ...] = get_args(LimitKind)

HTTP_STATUS: dict[ErrorCode, int] = {
    "unsupported_file_type": 400,
    "bad_text_encoding": 400,
    "unreadable_file": 400,
    "no_extractable_text": 400,
    "invalid_request": 400,
    "demo_mode_no_uploads": 403,
    "demo_not_enabled": 403,
    "not_found": 404,
    "method_not_allowed": 405,
    "generation_in_progress": 409,
    "file_too_large": 413,
    "insufficient_content": 422,
    "ai_rate_limited": 429,
    "internal_error": 500,
    "ai_unavailable": 502,
    "ai_output_invalid": 502,
    "ai_credits_exhausted": 503,
    "session_call_limit_reached": 503,
}

MESSAGES: dict[ErrorCode, str] = {
    "unsupported_file_type": "Bare PDF- og tekstfiler (.pdf, .txt) støttes.",
    "bad_text_encoding": "Tekstfilen er ikke lagret som UTF-8.",
    "unreadable_file": "PDF-filen kunne ikke åpnes.",
    "no_extractable_text": "Dokumentet inneholder ingen tekst som kan hentes ut.",
    "invalid_request": "Forespørselen hadde feil format.",
    "demo_mode_no_uploads": "Opplasting er slått av i demomodus.",
    "demo_not_enabled": "Demoen er bare tilgjengelig i demomodus.",
    "not_found": "Adressen finnes ikke.",
    "method_not_allowed": "Metoden støttes ikke for denne adressen.",
    "generation_in_progress": "En annen generering kjører allerede.",
    "file_too_large": "Dokumentet overskrider en av grensene for opplasting.",
    "insufficient_content": "KI-tjenesten fant for lite fagstoff i dokumentet.",
    "ai_rate_limited": "KI-tjenesten tar imot for mange forespørsler akkurat nå.",
    "internal_error": "Det oppstod en uventet feil i serveren.",
    "ai_unavailable": "KI-tjenesten svarte ikke i tide eller er utilgjengelig.",
    "ai_output_invalid": "Svaret fra KI-tjenesten besto ikke valideringen.",
    "ai_credits_exhausted": "Kreditten hos KI-leverandøren er brukt opp.",
    "session_call_limit_reached": "Grensen for KI-kall i denne serverøkten er nådd.",
}


class ErrorResponse(BaseModel):
    """Body of every non-2xx reply: ``{error_code, message, limit?, reference_id?}``."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    error_code: ErrorCode
    message: str
    limit: LimitKind | None = None
    reference_id: str | None = Field(default=None, pattern=r"^[0-9a-f]{8}$")

    @model_validator(mode="after")
    def _matches_code(self) -> Self:
        if self.message != MESSAGES[self.error_code]:
            raise ValueError("message must be the approved message for the code")
        if (self.limit is not None) != (self.error_code == "file_too_large"):
            raise ValueError("limit is set exactly for file_too_large")
        if (self.reference_id is not None) != (self.error_code == "internal_error"):
            raise ValueError("reference_id is set exactly for internal_error")
        return self

    def to_body(self) -> dict[str, Any]:
        """The JSON body, without optional fields that are not set."""
        return self.model_dump(exclude_none=True)
