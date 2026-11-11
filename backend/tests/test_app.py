import sys
from collections.abc import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.application import build_app, create_app, load_settings_or_exit
from app.config import MISSING_KEY_MESSAGE, Settings
from tests._fakes import FAKE_KEY


def test_create_app_returns_a_fastapi_instance(demo_app: FastAPI) -> None:
    assert isinstance(demo_app, FastAPI)


def test_create_app_keeps_the_given_settings(make_settings: Callable[..., Settings]) -> None:
    settings = make_settings()
    assert create_app(settings).state.settings is settings


def test_test_helpers_do_not_import_main() -> None:
    assert "app.main" not in sys.modules


def test_build_app_in_demo_serves_status() -> None:
    application = build_app()
    assert isinstance(application, FastAPI)
    with TestClient(application) as client:
        response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"


def test_build_app_refuses_real_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")

    with pytest.raises(SystemExit) as exit_info:
        build_app()

    assert exit_info.value.code == MISSING_KEY_MESSAGE
    assert exit_info.value.__cause__ is None
    assert exit_info.value.__suppress_context__ is True


def test_load_settings_or_exit_refuses_whitespace_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "   ")

    with pytest.raises(SystemExit) as exit_info:
        load_settings_or_exit()

    assert exit_info.value.code == MISSING_KEY_MESSAGE
    assert exit_info.value.__cause__ is None


def test_load_settings_or_exit_accepts_real_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)

    assert load_settings_or_exit().ai_mode == "real"
