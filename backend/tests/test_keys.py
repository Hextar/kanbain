import pytest

from app import create_app
from app.config import Config, INSECURE_SECRET_KEY
from app.planner.keys import (
    REDIS_KEY,
    _decode,
    _memory,
    get_openai_api_key,
    invalidate_stored_openai_api_keys,
    reencrypt_stored_openai_api_key,
    set_openai_api_key,
)


def test_api_key_is_encrypted_at_rest(app):
    plaintext = "sk-abcdefghijklmnopqrstuvwxyz"
    with app.app_context():
        set_openai_api_key(plaintext)
        stored = _memory[REDIS_KEY]
        assert stored.startswith("enc:v1:")
        assert plaintext not in stored
        assert get_openai_api_key() == plaintext


def test_legacy_plaintext_key_is_migrated(app):
    plaintext = "sk-legacy-plaintext-key"
    with app.app_context():
        _memory[REDIS_KEY] = plaintext
        assert get_openai_api_key() == plaintext
        stored = _decode(_memory[REDIS_KEY])
        assert stored is not None
        assert stored.startswith("enc:v1:")
        assert plaintext not in stored
        assert get_openai_api_key() == plaintext


def test_rotated_secret_cannot_decrypt_stored_key(app):
    with app.app_context():
        set_openai_api_key("sk-secret-value")
        app.config["SECRET_KEY"] = "rotated-secret-key"
        app.config["OPENAI_API_KEY"] = ""
        assert get_openai_api_key() is None


def test_reencrypt_stored_key_with_new_secret(app):
    plaintext = "sk-keep-after-rotate"
    with app.app_context():
        set_openai_api_key(plaintext)
        old_secret = app.config["SECRET_KEY"]
        app.config["SECRET_KEY"] = "new-passphrase"
        hint = reencrypt_stored_openai_api_key(old_secret)
        assert hint == "tate"
        stored = _memory[REDIS_KEY]
        assert stored.startswith("enc:v1:")
        assert plaintext not in stored
        assert get_openai_api_key() == plaintext


def test_reencrypt_rejects_wrong_old_secret(app):
    with app.app_context():
        set_openai_api_key("sk-secret-value")
        app.config["SECRET_KEY"] = "new-passphrase"
        with pytest.raises(ValueError, match="Could not decrypt"):
            reencrypt_stored_openai_api_key("not-the-old-secret")


def test_invalidate_stored_openai_keys(app, client):
    with app.app_context():
        set_openai_api_key("sk-secret-value")
        assert invalidate_stored_openai_api_keys() == 1
        assert REDIS_KEY not in _memory
        assert get_openai_api_key() is None
    assert client.get("/api/settings").get_json() == {
        "openaiApiKeyConfigured": False,
        "openaiApiKeyRevoked": True,
    }

    saved = client.put("/api/settings", json={"openaiApiKey": "sk-new-key-after-revoke"})
    assert saved.get_json()["openaiApiKeyConfigured"] is True
    assert saved.get_json()["openaiApiKeyRevoked"] is False


class _MissingSecret(Config):
    TESTING = False
    SECRET_KEY = ""
    SQLALCHEMY_DATABASE_URI = "sqlite://"


class _ExampleSecret(Config):
    TESTING = False
    SECRET_KEY = INSECURE_SECRET_KEY
    SQLALCHEMY_DATABASE_URI = "sqlite://"


def test_create_app_requires_secret_key():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(_MissingSecret)


def test_create_app_rejects_example_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app(_ExampleSecret)
