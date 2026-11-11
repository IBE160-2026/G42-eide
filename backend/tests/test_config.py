import logging
import os
from collections.abc import Callable
from pathlib import Path

import pytest

from app.config import (
    ENV_FILE,
    INVALID_MODE_MESSAGE,
    INVALID_SETTINGS_MESSAGE,
    MISSING_KEY_MESSAGE,
    Settings,
    SettingsRefused,
    load_settings,
)
from tests._fakes import FAKE_KEY

MakeSettings = Callable[..., Settings]

# Read at import time, before the autouse fixture redirects it.
CONFIGURED_ENV_FILE = Settings.model_config["env_file"]


def _write_real_env_file(path: Path) -> Path:
    path.write_text(f"AI_MODE=real\nANTHROPIC_API_KEY={FAKE_KEY}\n", encoding="utf-8")
    return path


def test_defaults(make_settings: MakeSettings) -> None:
    settings = make_settings()
    assert settings.ai_mode == "demo"
    assert settings.anthropic_api_key is None
    assert settings.ai_provider == "anthropic"
    assert settings.ai_model == "claude-haiku-5-5"
    assert settings.ai_effort == "low"
    assert settings.ai_max_tokens == 16000
    assert settings.ai_timeout_seconds == 90
    assert settings.ai_call_cap == 20
    assert settings.max_upload_bytes == 10485760
    assert settings.max_pdf_pages == 80
    assert settings.max_text_chars == 200000
    assert settings.max_input_tokens == 60000
    assert settings.allowed_origin == "http://localhost:3000"


def test_env_file_is_resolved_relative_to_backend() -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    assert ENV_FILE == backend_dir / ".env"
    assert CONFIGURED_ENV_FILE == ENV_FILE


def test_demo_with_key_keeps_demo(monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings) -> None:
    monkeypatch.setenv("AI_MODE", "demo")
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)
    settings = make_settings()
    assert settings.ai_mode == "demo"
    assert FAKE_KEY not in repr(settings)


def test_real_with_key(monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)
    assert make_settings().ai_mode == "real"


@pytest.mark.parametrize("key", [None, "", "   ", "\t \n"])
def test_real_without_key_refuses(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, key: str | None
) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    if key is not None:
        monkeypatch.setenv("ANTHROPIC_API_KEY", key)

    with pytest.raises(SettingsRefused) as refusal:
        make_settings()

    assert str(refusal.value) == MISSING_KEY_MESSAGE
    assert refusal.value.__cause__ is None
    assert refusal.value.__context__ is None


@pytest.mark.parametrize("mode", ["reel", "REAL", "Demo", "", " demo"])
def test_invalid_mode_refuses(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, mode: str
) -> None:
    monkeypatch.setenv("AI_MODE", mode)
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)

    with pytest.raises(SettingsRefused) as refusal:
        make_settings()

    message = str(refusal.value)
    assert message == INVALID_MODE_MESSAGE
    assert "«demo»" in message and "«real»" in message
    assert FAKE_KEY not in message


def _assert_invalid_setting(make_settings: MakeSettings, raw_value: str) -> None:
    with pytest.raises(SettingsRefused) as refusal:
        make_settings()
    assert str(refusal.value) == INVALID_SETTINGS_MESSAGE
    if raw_value.strip():
        assert raw_value not in str(refusal.value)


def test_non_numeric_setting_refuses_without_echoing_value(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings
) -> None:
    monkeypatch.setenv("MAX_PDF_PAGES", "not-a-number-xyz")
    _assert_invalid_setting(make_settings, "not-a-number-xyz")


POSITIVE_INT_FIELDS = [
    "MAX_UPLOAD_BYTES",
    "MAX_PDF_PAGES",
    "MAX_TEXT_CHARS",
    "MAX_INPUT_TOKENS",
    "AI_MAX_TOKENS",
    "AI_CALL_CAP",
]


@pytest.mark.parametrize("name", POSITIVE_INT_FIELDS)
@pytest.mark.parametrize("value", ["0", "-1", "-5"])
def test_integer_limits_must_be_positive(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, name: str, value: str
) -> None:
    monkeypatch.setenv(name, value)
    _assert_invalid_setting(make_settings, value)


@pytest.mark.parametrize("value", ["0", "-1", "nan", "inf", "-inf"])
def test_timeout_must_be_positive_and_finite(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, value: str
) -> None:
    monkeypatch.setenv("AI_TIMEOUT_SECONDS", value)
    _assert_invalid_setting(make_settings, value)


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "",
        "http://localhost:3000/",
        "http://localhost:3000/x",
        "http://localhost:3000?q=1",
        "http://localhost:3000#f",
        "http://user@localhost:3000",
        "http://localhost",
        "http://localhost:0",
        "http://:3000",
        "localhost:3000",
        "ftp://localhost:3000",
        "http://localhost:3000,http://evil.test:80",
        " http://localhost:3000",
        "http://localhost:03000",
        "http://localhost:80",
        "https://x.test:443",
        "http://bücher.example:3000",
        "http://local%20host:3000",
        "http://loc\\alhost:3000",
    ],
)
def test_allowed_origin_must_be_one_explicit_origin(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, origin: str
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGIN", origin)
    _assert_invalid_setting(make_settings, origin)


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "https://example.test:8443",
        "http://example.test:5000",
        "https://localhost:3443",
    ],
)
def test_allowed_origin_accepts_explicit_origins(
    monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings, origin: str
) -> None:
    monkeypatch.setenv("ALLOWED_ORIGIN", origin)
    assert make_settings().allowed_origin == origin


def test_non_utf8_env_file_refuses(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_bytes("AI_MODE=demo\nCOURSE=ø\n".encode("cp1252"))

    with pytest.raises(SettingsRefused) as refusal:
        load_settings(_env_file=env_file)

    assert str(refusal.value) == INVALID_SETTINGS_MESSAGE
    assert refusal.value.__cause__ is None
    assert refusal.value.__suppress_context__ is True


def test_refusal_messages_are_norwegian() -> None:
    for message in (MISSING_KEY_MESSAGE, INVALID_MODE_MESSAGE, INVALID_SETTINGS_MESSAGE):
        assert message.startswith("Backend starter ikke:")


def test_key_never_shown_when_printed_or_logged(
    monkeypatch: pytest.MonkeyPatch,
    make_settings: MakeSettings,
    caplog: pytest.LogCaptureFixture,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)
    settings = make_settings()

    print(settings)
    print(repr(settings))
    print(settings.model_dump())
    print(settings.model_dump_json())
    with caplog.at_level(logging.DEBUG):
        logging.getLogger("test").info("settings: %s %r", settings, settings)

    assert FAKE_KEY not in capsys.readouterr().out
    assert FAKE_KEY not in caplog.text


def test_test_runs_ignore_a_real_env_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, make_settings: MakeSettings
) -> None:
    env_file = _write_real_env_file(tmp_path / ".env")
    monkeypatch.setitem(Settings.model_config, "env_file", env_file)

    # The shared fixture passes ``_env_file=None``: the configured file is never read.
    assert make_settings().ai_mode == "demo"
    # Positive control: without the override the configured file is read.
    assert load_settings().ai_mode == "real"


def test_environment_overrides_env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    env_file = _write_real_env_file(tmp_path / ".env")
    monkeypatch.setenv("AI_MODE", "demo")
    assert load_settings(_env_file=env_file).ai_mode == "demo"


def test_autouse_fixture_cleared_settings_variables_in_any_case() -> None:
    leaked = [name for name in os.environ if name.lower() in Settings.model_fields]
    assert leaked == []
