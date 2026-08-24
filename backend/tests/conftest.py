import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.seed import seed_default_columns


@pytest.fixture
def app():
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        seed_default_columns()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
