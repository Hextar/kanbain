import json

from simple_websocket import ConnectionClosed

from app.identity import verify_ws_ticket
from app.models import User
from app.realtime.ws import handle_socket
from conftest import latest_mail_token, mail_outbox, register_verified


def test_health_is_public(anon_client):
    response = anon_client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_api_requires_login(anon_client):
    assert anon_client.get("/api/projects").status_code == 401
    assert anon_client.get("/api/settings").status_code == 401
    assert anon_client.get("/api/auth/me").status_code == 401
    assert anon_client.get("/api/auth/ws-ticket").status_code == 401


def test_register_requires_activation(anon_client, app):
    created = anon_client.post(
        "/api/auth/register",
        json={"email": "Ada@Example.com", "password": "password12", "name": "Ada Lovelace"},
    )
    assert created.status_code == 201
    body = created.get_json()
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    assert body["user"]["emailVerified"] is False
    assert body["organization"]["name"] == "Ada's workspace"
    assert "password" not in body["user"]
    assert "passwordHash" not in body["user"]
    assert anon_client.get("/api/auth/me").status_code == 401

    outbox = mail_outbox(app)
    assert len(outbox) == 1
    assert outbox[0].to == "ada@example.com"
    assert "Activate your KanbAIn account" in outbox[0].subject
    assert "/activate?token=" in outbox[0].text

    activated = anon_client.post(
        "/api/auth/activate", json={"token": latest_mail_token(app)}
    )
    assert activated.status_code == 200
    me = anon_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["email"] == "ada@example.com"
    assert me.get_json()["user"]["emailVerified"] is True

    anon_client.post("/api/auth/logout")
    assert anon_client.get("/api/auth/me").status_code == 401

    logged_in = anon_client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "password12"},
    )
    assert logged_in.status_code == 200
    assert logged_in.get_json()["user"]["email"] == "ada@example.com"


def test_register_rolls_back_when_mail_fails(anon_client, app, monkeypatch):
    def boom(_email):
        raise RuntimeError("smtp down")

    monkeypatch.setattr("app.routes.auth.send_mail", boom)
    response = anon_client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "password12", "name": "Ada"},
    )
    assert response.status_code == 503
    with app.app_context():
        assert db_user("ada@example.com") is None


def test_login_rate_limit():
    from app import create_app
    from app.config import TestConfig
    from app.extensions import db

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
        assert limited.get_json()["message"] == "Too many attempts. Try again shortly."
        db.session.remove()
        db.drop_all()


def test_login_rejects_unverified(anon_client):
    anon_client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "password12", "name": "Ada"},
    )
    response = anon_client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "password12"},
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "unverified"


def test_register_rejects_duplicate_email(anon_client):
    payload = {"email": "ada@example.com", "password": "password12", "name": "Ada"}
    assert anon_client.post("/api/auth/register", json=payload).status_code == 201
    conflict = anon_client.post("/api/auth/register", json=payload)
    assert conflict.status_code == 409


def test_register_rejects_short_password(anon_client):
    response = anon_client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "short", "name": "Ada"},
    )
    assert response.status_code == 400


def test_login_rejects_bad_password(anon_client, app):
    register_verified(
        anon_client, app, email="ada@example.com", password="password12", name="Ada"
    )
    anon_client.post("/api/auth/logout")
    response = anon_client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.get_json()["message"] == "Invalid email or password"


def test_forgot_password_resets_and_logs_in(anon_client, app):
    register_verified(
        anon_client, app, email="ada@example.com", password="password12", name="Ada"
    )
    anon_client.post("/api/auth/logout")
    mail_outbox(app).clear()
    requested = anon_client.post(
        "/api/auth/forgot-password", json={"email": "ada@example.com"}
    )
    assert requested.status_code == 200
    assert "token=" in mail_outbox(app)[-1].text
    token = latest_mail_token(app)
    reset = anon_client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "newpassword1"},
    )
    assert reset.status_code == 200
    assert anon_client.get("/api/auth/me").status_code == 200
    anon_client.post("/api/auth/logout")
    assert (
        anon_client.post(
            "/api/auth/login",
            json={"email": "ada@example.com", "password": "password12"},
        ).status_code
        == 401
    )
    assert (
        anon_client.post(
            "/api/auth/login",
            json={"email": "ada@example.com", "password": "newpassword1"},
        ).status_code
        == 200
    )
    reused = anon_client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "anotherpass1"},
    )
    assert reused.status_code == 400


def test_forgot_password_unknown_email_is_generic(anon_client, app):
    response = anon_client.post(
        "/api/auth/forgot-password", json={"email": "missing@example.com"}
    )
    assert response.status_code == 200
    assert mail_outbox(app) == []


def test_forgot_password_unverified_resends_activation(anon_client, app):
    anon_client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "password12", "name": "Ada"},
    )
    mail_outbox(app).clear()
    response = anon_client.post(
        "/api/auth/forgot-password", json={"email": "ada@example.com"}
    )
    assert response.status_code == 200
    assert "Activate your KanbAIn account" in mail_outbox(app)[-1].subject


def test_google_only_account_cannot_password_login(anon_client, monkeypatch):
    monkeypatch.setattr("app.routes.auth.google_configured", lambda: True)
    monkeypatch.setattr(
        "app.routes.auth.fetch_google_profile",
        lambda: {
            "sub": "g-1",
            "email": "ada@example.com",
            "name": "Ada",
            "email_verified": True,
        },
    )
    assert anon_client.get("/api/auth/google/callback").status_code == 302
    anon_client.post("/api/auth/logout")
    response = anon_client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "password12"},
    )
    assert response.status_code == 401


def test_google_creates_user(anon_client, app, monkeypatch):
    monkeypatch.setattr("app.routes.auth.google_configured", lambda: True)
    monkeypatch.setattr(
        "app.routes.auth.fetch_google_profile",
        lambda: {
            "sub": "g-1",
            "email": "ada@example.com",
            "name": "Ada",
            "email_verified": True,
        },
    )
    response = anon_client.get("/api/auth/google/callback")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/")
    me = anon_client.get("/api/auth/me").get_json()
    assert me["user"]["email"] == "ada@example.com"
    assert me["user"]["emailVerified"] is True
    assert me["organization"]["name"] == "Ada's workspace"
    with app.app_context():
        user = db_user("ada@example.com")
        assert user.google_sub == "g-1"
        assert user.password_hash is None
        assert user.email_verified_at is not None


def test_google_links_existing_email(anon_client, app, monkeypatch):
    anon_client.post(
        "/api/auth/register",
        json={"email": "ada@example.com", "password": "password12", "name": "Ada"},
    )
    monkeypatch.setattr("app.routes.auth.google_configured", lambda: True)
    monkeypatch.setattr(
        "app.routes.auth.fetch_google_profile",
        lambda: {
            "sub": "g-1",
            "email": "ada@example.com",
            "name": "Ada Lovelace",
            "email_verified": True,
        },
    )
    assert anon_client.get("/api/auth/google/callback").status_code == 302
    me = anon_client.get("/api/auth/me").get_json()
    assert me["user"]["email"] == "ada@example.com"
    assert me["user"]["emailVerified"] is True
    with app.app_context():
        from app.extensions import db

        count = db.session.scalar(db.select(db.func.count()).select_from(User))
        assert count == 1
        assert db_user("ada@example.com").google_sub == "g-1"
        assert db_user("ada@example.com").password_hash is not None


def test_google_merges_verified_password_account(anon_client, app, monkeypatch):
    register_verified(
        anon_client, app, email="ada@example.com", password="password12", name="Ada"
    )
    org_id = anon_client.get("/api/auth/me").get_json()["organization"]["id"]
    anon_client.post("/api/auth/logout")
    monkeypatch.setattr("app.routes.auth.google_configured", lambda: True)
    monkeypatch.setattr(
        "app.routes.auth.fetch_google_profile",
        lambda: {
            "sub": "g-1",
            "email": "ada@example.com",
            "name": "Ada Lovelace",
            "email_verified": True,
        },
    )
    assert anon_client.get("/api/auth/google/callback").status_code == 302
    me = anon_client.get("/api/auth/me").get_json()
    assert me["organization"]["id"] == org_id
    anon_client.post("/api/auth/logout")
    logged_in = anon_client.post(
        "/api/auth/login",
        json={"email": "ada@example.com", "password": "password12"},
    )
    assert logged_in.status_code == 200
    with app.app_context():
        from app.extensions import db

        count = db.session.scalar(db.select(db.func.count()).select_from(User))
        assert count == 1
        user = db_user("ada@example.com")
        assert user.google_sub == "g-1"
        assert user.password_hash is not None


def test_google_rejects_unverified_email(anon_client, monkeypatch):
    monkeypatch.setattr("app.routes.auth.google_configured", lambda: True)
    monkeypatch.setattr(
        "app.routes.auth.fetch_google_profile",
        lambda: {
            "sub": "g-1",
            "email": "ada@example.com",
            "name": "Ada",
            "email_verified": False,
        },
    )
    response = anon_client.get("/api/auth/google/callback")
    assert response.status_code == 401
    assert anon_client.get("/api/auth/me").status_code == 401


def test_google_unconfigured(anon_client):
    response = anon_client.get("/api/auth/google")
    assert response.status_code == 503


def test_cannot_read_other_org_project(app):
    ada = app.test_client()
    bob = app.test_client()
    register_verified(ada, app, email="ada@example.com", password="password12", name="Ada")
    register_verified(bob, app, email="bob@example.com", password="password12", name="Bob")
    created = ada.post("/api/projects", json={"name": "Secret", "skipPlan": True})
    assert created.status_code == 201
    project_id = created.get_json()["id"]
    assert bob.get(f"/api/projects/{project_id}").status_code == 404
    assert bob.get("/api/projects").get_json() == []


def test_ws_rejects_other_org_project(app):
    ada = app.test_client()
    bob = app.test_client()
    register_verified(ada, app, email="ada@example.com", password="password12", name="Ada")
    register_verified(bob, app, email="bob@example.com", password="password12", name="Bob")
    project_id = ada.post(
        "/api/projects", json={"name": "Secret", "skipPlan": True}
    ).get_json()["id"]
    bob_org = bob.get("/api/auth/me").get_json()["organization"]["id"]

    class FakeSocket:
        def __init__(self):
            self.sent: list[str] = []
            self._frames = [json.dumps({"type": "subscribe", "projectId": project_id})]

        def receive(self, timeout=None):
            if not self._frames:
                raise ConnectionClosed()
            return self._frames.pop(0)

        def send(self, data):
            self.sent.append(data)

    fake = FakeSocket()
    with app.app_context():
        handle_socket(fake, organization_id=bob_org)
    payload = json.loads(fake.sent[0])
    assert payload["event"] == "error"
    assert payload["payload"]["message"] == "unknown project"


def test_ws_ticket(client, app):
    response = client.get("/api/auth/ws-ticket")
    assert response.status_code == 200
    ticket = response.get_json()["ticket"]
    with app.app_context():
        identity = verify_ws_ticket(ticket)
        assert identity is not None
        me = client.get("/api/auth/me").get_json()
        assert identity.organization_id == me["organization"]["id"]
        assert identity.user_id == me["user"]["id"]


def db_user(email: str) -> User:
    from app.extensions import db

    return db.session.scalar(db.select(User).where(User.email == email))
