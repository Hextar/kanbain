import re

import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.planner.keys import reset_key_store
from app.seed import seed_defaults


TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password12"
TEST_NAME = "Test User"
_TOKEN_RE = re.compile(r"token=([A-Za-z0-9_\-\.]+)")


def mail_outbox(app):
    return app.extensions["mail"].outbox


def latest_mail_token(app) -> str:
    outbox = mail_outbox(app)
    assert outbox, "expected an outbound email"
    match = _TOKEN_RE.search(outbox[-1].text)
    assert match, outbox[-1].text
    return match.group(1)


def register_verified(
    client,
    app,
    *,
    email=TEST_EMAIL,
    password=TEST_PASSWORD,
    name=TEST_NAME,
):
    created = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert created.status_code == 201
    activated = client.post(
        "/api/auth/activate", json={"token": latest_mail_token(app)}
    )
    assert activated.status_code == 200
    return activated


@pytest.fixture
def app():
    reset_key_store()
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()
        reset_key_store()


@pytest.fixture
def anon_client(app):
    return app.test_client()


@pytest.fixture
def client(app, anon_client):
    activated = register_verified(anon_client, app)
    org_id = activated.get_json()["organization"]["id"]
    with app.app_context():
        seed_defaults(org_id)
    return anon_client

