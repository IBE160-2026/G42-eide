"""Application settings: the one place every setting value is defined (AR-6).

Values come from the environment and ``backend/.env`` only. ``AI_MODE`` defaults to
``demo``; ``real`` without an API key refuses to start and never falls back (AR-5).
"""

from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import Field, PositiveInt, SecretStr, ValidationError, field_validator, model_validator
from pydantic_core import PydanticCustomError
from pydantic_settings import BaseSettings, SettingsConfigDict, SettingsError

from app.contracts.options import DEFAULT_AI_MODE, AiMode

# ``backend/.env``, resolved from this file rather than the working directory.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

MISSING_KEY_MESSAGE = (
    "Backend starter ikke: AI_MODE=real krever en API-nøkkel i ANTHROPIC_API_KEY "
    "(backend/.env). Legg inn nøkkelen, eller bruk AI_MODE=demo."
)
INVALID_MODE_MESSAGE = "Backend starter ikke: AI_MODE må være «demo» eller «real» (små bokstaver)."
INVALID_SETTINGS_MESSAGE = (
    "Backend starter ikke: en innstilling i miljøet eller backend/.env har ugyldig verdi."
)

_MISSING_KEY_ERROR = "missing_api_key"

PositiveFiniteFloat = Annotated[float, Field(gt=0, allow_inf_nan=False)]


class SettingsRefused(Exception):
    """The settings are not usable; the backend must not start.

    The message is a fixed Norwegian text and never contains a setting value.
    """


def _is_single_origin(value: str) -> bool:
    """True for exactly one ``http(s)://host:port`` origin, nothing more."""
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        return False
    default_port = {"http": 80, "https": 443}.get(parts.scheme)
    return (
        default_port is not None
        and bool(parts.hostname)
        and port is not None
        and port > 0
        # Browsers send the port without leading zeros and omit the scheme's default.
        and parts.netloc.rsplit(":", 1)[1] == str(port)
        and port != default_port
        and value.isascii()
        and "%" not in parts.netloc
        and "\\" not in parts.netloc
        and "@" not in parts.netloc
        and value == f"{parts.scheme}://{parts.netloc}"
        and value == value.lower()
        and not any(char.isspace() for char in value)
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    ai_mode: AiMode = DEFAULT_AI_MODE
    anthropic_api_key: SecretStr | None = None

    ai_provider: str = "anthropic"
    ai_model: str = "claude-haiku-5-5"
    ai_effort: str = "low"
    ai_max_tokens: PositiveInt = 16000
    ai_timeout_seconds: PositiveFiniteFloat = 90
    ai_call_cap: PositiveInt = 20

    max_upload_bytes: PositiveInt = 10485760
    max_pdf_pages: PositiveInt = 80
    max_text_chars: PositiveInt = 200000
    max_input_tokens: PositiveInt = 60000

    allowed_origin: str = "http://localhost:3000"

    @field_validator("allowed_origin")
    @classmethod
    def _one_explicit_origin(cls, value: str) -> str:
        if not _is_single_origin(value):
            raise PydanticCustomError("invalid_origin", "invalid origin")
        return value

    @model_validator(mode="after")
    def _real_mode_needs_key(self) -> "Settings":
        if self.ai_mode == "real" and not self.has_api_key:
            raise PydanticCustomError(_MISSING_KEY_ERROR, MISSING_KEY_MESSAGE)
        return self

    @property
    def has_api_key(self) -> bool:
        """True when a key is set; empty or whitespace-only counts as missing."""
        key = self.anthropic_api_key
        return key is not None and key.get_secret_value().strip() != ""


def load_settings(**overrides: object) -> Settings:
    """Build the settings, or raise :class:`SettingsRefused` with a Norwegian message.

    ``overrides`` go straight to :class:`Settings` (tests pass ``_env_file=None``).
    Original errors are dropped because they can carry input values.
    """
    try:
        return Settings(**overrides)  # type: ignore[arg-type]
    except ValidationError as error:
        errors = error.errors()
    except (UnicodeDecodeError, OSError, SettingsError):
        raise SettingsRefused(INVALID_SETTINGS_MESSAGE) from None
    if any(item["loc"] and item["loc"][0] == "ai_mode" for item in errors):
        raise SettingsRefused(INVALID_MODE_MESSAGE)
    if any(item["type"] == _MISSING_KEY_ERROR for item in errors):
        raise SettingsRefused(MISSING_KEY_MESSAGE)
    raise SettingsRefused(INVALID_SETTINGS_MESSAGE)
