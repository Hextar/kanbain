from __future__ import annotations

import base64

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from flask import current_app

PREFIX = "enc:v1:"
_HKDF_SALT = b"kanbain.openai-api-key.v1"
_HKDF_INFO = b"kanbain-openai-api-key"


def encrypt_secret(plaintext: str, secret: str | bytes | None = None) -> str:
    return PREFIX + _fernet(secret).encrypt(plaintext.encode()).decode()


def decrypt_secret(stored: str, secret: str | bytes | None = None) -> str | None:
    if not stored.startswith(PREFIX):
        return stored
    try:
        return _fernet(secret).decrypt(stored[len(PREFIX) :].encode()).decode()
    except InvalidToken:
        return None


def is_encrypted(stored: str) -> bool:
    return stored.startswith(PREFIX)


def _fernet(secret: str | bytes | None = None) -> Fernet:
    if secret is None:
        secret = current_app.config["SECRET_KEY"]
    secret_bytes = secret.encode() if isinstance(secret, str) else secret
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_HKDF_SALT,
        info=_HKDF_INFO,
    ).derive(secret_bytes)
    return Fernet(base64.urlsafe_b64encode(derived))
