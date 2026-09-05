from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Project


def test_login_still_rate_limits_when_defaults_are_on():
    class TightLimits(TestConfig):
        RATELIMIT_ENABLED = True
        AUTH_LOGIN_LIMIT = "2 per minute"

    application = create_app(TightLimits)
    with application.app_context():
        db.create_all()
        client = application.test_client()
        payload = {"email": "ada@example.com", "password": "password12"}
        assert client.post("/api/auth/login", json=payload).status_code == 401
        assert client.post("/api/auth/login", json=payload).status_code == 401
        limited = client.post("/api/auth/login", json=payload)
        assert limited.status_code == 429
        db.session.remove()
        db.drop_all()


def test_default_api_rate_limit_exempts_health():
    class TightApi(TestConfig):
        RATELIMIT_ENABLED = True
        RATELIMIT_DEFAULT = "2 per minute"

    application = create_app(TightApi)
    with application.app_context():
        db.create_all()
        client = application.test_client()
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/projects").status_code == 401
        assert client.get("/api/projects").status_code == 401
        limited = client.get("/api/projects")
        assert limited.status_code == 429
        db.session.remove()
        db.drop_all()


def test_activate_is_rate_limited():
    class TightMail(TestConfig):
        RATELIMIT_ENABLED = True
        AUTH_MAIL_LIMIT = "2 per minute"

    application = create_app(TightMail)
    with application.app_context():
        db.create_all()
        client = application.test_client()
        payload = {"token": "not-a-token"}
        assert client.post("/api/auth/activate", json=payload).status_code == 400
        assert client.post("/api/auth/activate", json=payload).status_code == 400
        limited = client.post("/api/auth/activate", json=payload)
        assert limited.status_code == 429
        db.session.remove()
        db.drop_all()


def test_one_active_plan_per_org(client, app):
    first = client.post("/api/projects", json={"name": "First plan"})
    assert first.status_code == 201
    assert first.get_json()["planStatus"] == "planning"
    busy = client.post("/api/projects", json={"name": "Second plan"})
    assert busy.status_code == 409
    assert busy.get_json()["message"] == "A plan is already running for this workspace."
    skipped = client.post(
        "/api/projects", json={"name": "Board only", "skipPlan": True}
    )
    assert skipped.status_code == 201

    first_id = first.get_json()["id"]
    with app.app_context():
        project = db.session.get(Project, first_id)
        project.plan_status = "ready"
        db.session.commit()

    retry = client.post(f"/api/projects/{first_id}/plan")
    assert retry.status_code == 202


def test_name_is_length_limited(client):
    response = client.post(
        "/api/projects", json={"name": "x" * 256, "skipPlan": True}
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "name is too long"


def test_security_headers_on_json_responses(anon_client):
    response = anon_client.get("/api/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Strict-Transport-Security" not in response.headers


def test_cors_does_not_wildcard_foreign_origins(anon_client):
    rejected = anon_client.get(
        "/api/health", headers={"Origin": "https://evil.example"}
    )
    assert rejected.headers.get("Access-Control-Allow-Origin") != "*"
    allowed = anon_client.get(
        "/api/health", headers={"Origin": "http://localhost:5173"}
    )
    assert allowed.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"


def test_https_redirect_skips_health():
    class HttpsConfig(TestConfig):
        PUBLIC_APP_URL = "https://app.example"

    application = create_app(HttpsConfig)
    with application.app_context():
        db.create_all()
        client = application.test_client()
        health = client.get("/api/health", headers={"X-Forwarded-Proto": "http"})
        assert health.status_code == 200
        bounced = client.get("/api/projects", headers={"X-Forwarded-Proto": "http"})
        assert bounced.status_code == 301
        assert bounced.headers["Location"].startswith("https://")
        db.session.remove()
        db.drop_all()
