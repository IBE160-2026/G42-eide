from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.application import create_app
from app.config import Settings
from tests._fakes import FAKE_KEY

ALLOWED = "http://localhost:3000"

EXPECTED_DEMO_BODY = {
    "mode": "demo",
    "limits": {"max_upload_bytes": 10485760, "max_pdf_pages": 80, "max_text_chars": 200000},
    "options": {
        "detail_level": {"values": ["brief", "standard", "detailed"], "default": "standard"},
        "output_language": {"values": ["nb", "en"], "default": "nb"},
    },
    "accepted_types": ["application/pdf", "text/plain"],
}


def _split_header(value: str) -> set[str]:
    return {part.strip().lower() for part in value.split(",")}


def test_status_returns_exact_demo_body(client: TestClient) -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    assert response.json() == EXPECTED_DEMO_BODY


def test_status_returns_exact_real_body(
    monkeypatch: pytest.MonkeyPatch, make_settings: Callable[..., Settings]
) -> None:
    monkeypatch.setenv("AI_MODE", "real")
    monkeypatch.setenv("ANTHROPIC_API_KEY", FAKE_KEY)
    with TestClient(create_app(make_settings())) as client:
        response = client.get("/api/status")
    assert response.status_code == 200
    assert response.json() == {**EXPECTED_DEMO_BODY, "mode": "real"}
    assert FAKE_KEY not in response.text


def test_status_limits_come_from_settings(make_settings: Callable[..., Settings]) -> None:
    settings = make_settings(max_upload_bytes=111, max_pdf_pages=2, max_text_chars=333)
    with TestClient(create_app(settings)) as client:
        limits = client.get("/api/status").json()["limits"]
    assert limits == {"max_upload_bytes": 111, "max_pdf_pages": 2, "max_text_chars": 333}


def test_status_limit_from_environment(
    monkeypatch: pytest.MonkeyPatch, make_settings: Callable[..., Settings]
) -> None:
    monkeypatch.setenv("MAX_PDF_PAGES", "5")
    with TestClient(create_app(make_settings())) as client:
        limits = client.get("/api/status").json()["limits"]
    assert limits["max_pdf_pages"] == 5


def test_cors_allows_the_frontend_origin_on_get(client: TestClient) -> None:
    response = client.get("/api/status", headers={"Origin": ALLOWED})
    assert response.headers["access-control-allow-origin"] == ALLOWED
    assert "access-control-allow-credentials" not in response.headers


def test_cors_preflight_post_from_the_frontend_origin(client: TestClient) -> None:
    response = client.options(
        "/api/status",
        headers={
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED
    assert "access-control-allow-credentials" not in response.headers
    assert _split_header(response.headers["access-control-allow-methods"]) == {"get", "post"}
    # Starlette always adds the CORS-safelisted headers to the one we allow.
    assert _split_header(response.headers["access-control-allow-headers"]) == {
        "accept",
        "accept-language",
        "content-language",
        "content-type",
    }


@pytest.mark.parametrize("header", ["Authorization", "X-Foo"])
def test_cors_preflight_rejects_other_headers(client: TestClient, header: str) -> None:
    response = client.options(
        "/api/status",
        headers={
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": header,
        },
    )
    assert response.status_code == 400


def test_cors_preflight_rejects_other_methods(client: TestClient) -> None:
    response = client.options(
        "/api/status",
        headers={"Origin": ALLOWED, "Access-Control-Request-Method": "PUT"},
    )
    assert response.status_code == 400


@pytest.mark.parametrize("origin", ["http://127.0.0.1:3000", "http://evil.test"])
def test_cors_rejects_other_origins(client: TestClient, origin: str) -> None:
    response = client.get("/api/status", headers={"Origin": origin})
    assert "access-control-allow-origin" not in response.headers

    preflight = client.options(
        "/api/status",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    # Starlette's default rejection reply; the common error format is Story 1.3.
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers


def test_cors_uses_the_configured_origin(make_settings: Callable[..., Settings]) -> None:
    other = "http://example.test:5000"
    with TestClient(create_app(make_settings(allowed_origin=other))) as client:
        allowed = client.get("/api/status", headers={"Origin": other})
        rejected = client.get("/api/status", headers={"Origin": ALLOWED})
    assert allowed.headers["access-control-allow-origin"] == other
    assert "access-control-allow-origin" not in rejected.headers
