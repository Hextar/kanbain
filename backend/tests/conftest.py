import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.planner.keys import reset_key_store
from app.seed import seed_defaults


@pytest.fixture
def app():
    reset_key_store()
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        seed_defaults()
        yield application
        db.session.remove()
        db.drop_all()
        reset_key_store()


@pytest.fixture
def client(app):
    return app.test_client()
