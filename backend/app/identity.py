from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from flask import Flask, g, has_app_context, session
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .extensions import db
from .http import error_response
from .models import Membership, Organization, User, new_id
from .serialize import utcnow

SESSION_USER_KEY = "user_id"
SESSION_ORG_KEY = "organization_id"
SESSION_COOKIE_NAME = "kanbain_session"
WS_TICKET_SALT = "kanbain-ws-ticket"
WS_TICKET_MAX_AGE = 60
ACTIVATION_SALT = "kanbain-email-activate"
ACTIVATION_MAX_AGE = 60 * 60 * 24
PASSWORD_RESET_SALT = "kanbain-password-reset"
PASSWORD_RESET_MAX_AGE = 3600
MIN_PASSWORD_LENGTH = 8
_PASSWORD_HASHER = PasswordHasher()


@dataclass(frozen=True)
class Identity:
    user_id: str
    organization_id: str


def configure_sessions(app: Flask) -> None:
    public_url = (app.config.get("PUBLIC_APP_URL") or "").strip()
    app.config["SESSION_COOKIE_NAME"] = SESSION_COOKIE_NAME
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = public_url.startswith("https://")
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)


def register_auth_gate(app: Flask) -> None:
    @app.before_request
    def require_login():
        from flask import request

        path = request.path
        if path == "/api/health" or path.startswith("/api/auth/"):
            return None
        if not path.startswith("/api/"):
            return None
        identity = load_identity()
        if identity is None:
            return error_response("Unauthorized", 401)
        bind_identity(identity)
        return None


def bind_identity(identity: Identity) -> None:
    g.user_id = identity.user_id
    g.organization_id = identity.organization_id


def request_organization_id() -> str | None:
    if has_app_context():
        return getattr(g, "organization_id", None)
    return None


def load_identity() -> Identity | None:
    user_id = session.get(SESSION_USER_KEY)
    organization_id = session.get(SESSION_ORG_KEY)
    if not isinstance(user_id, str) or not isinstance(organization_id, str):
        return None
    membership = db.session.scalar(
        db.select(Membership.id).where(
            Membership.user_id == user_id,
            Membership.organization_id == organization_id,
        )
    )
    if membership is None:
        session.clear()
        return None
    return Identity(user_id=user_id, organization_id=organization_id)


def login_session(user: User, organization_id: str) -> None:
    session.clear()
    session.permanent = True
    session[SESSION_USER_KEY] = user.id
    session[SESSION_ORG_KEY] = organization_id


def logout_session() -> None:
    session.clear()


def hash_password(password: str) -> str:
    return _PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _PASSWORD_HASHER.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def personal_workspace_name(display_name: str) -> str:
    first = display_name.strip().split()[0] if display_name.strip() else "My"
    return f"{first}'s workspace"


def create_user_with_org(
    *,
    email: str,
    name: str,
    password_hash: str | None = None,
    google_sub: str | None = None,
    email_verified_at: datetime | None = None,
) -> tuple[User, Organization]:
    now = utcnow()
    user = User(
        id=new_id(),
        email=email,
        name=name,
        password_hash=password_hash,
        google_sub=google_sub,
        email_verified_at=email_verified_at,
        created_at=now,
    )
    organization = Organization(
        id=new_id(),
        name=personal_workspace_name(name),
        created_at=now,
    )
    membership = Membership(
        id=new_id(),
        user_id=user.id,
        organization_id=organization.id,
        role="owner",
    )
    db.session.add(user)
    db.session.add(organization)
    db.session.add(membership)
    db.session.flush()
    return user, organization


def _timed_serializer(salt: str) -> URLSafeTimedSerializer:
    from flask import current_app

    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=salt)


def _ws_serializer() -> URLSafeTimedSerializer:
    return _timed_serializer(WS_TICKET_SALT)


def issue_ws_ticket(identity: Identity) -> str:
    return _ws_serializer().dumps(
        {"user_id": identity.user_id, "organization_id": identity.organization_id}
    )


def verify_ws_ticket(token: str | None) -> Identity | None:
    if not token:
        return None
    try:
        payload = _ws_serializer().loads(token, max_age=WS_TICKET_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict):
        return None
    user_id = payload.get("user_id")
    organization_id = payload.get("organization_id")
    if not isinstance(user_id, str) or not isinstance(organization_id, str):
        return None
    return Identity(user_id=user_id, organization_id=organization_id)


def _password_fingerprint(password_hash: str | None) -> str:
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


def issue_activation_token(user: User) -> str:
    return _timed_serializer(ACTIVATION_SALT).dumps(
        {"user_id": user.id, "email": user.email}
    )


def verify_activation_token(token: str | None) -> User | None:
    return _load_user_token(
        token,
        salt=ACTIVATION_SALT,
        max_age=ACTIVATION_MAX_AGE,
        check=lambda user, payload: payload.get("email") == user.email,
    )


def issue_password_reset_token(user: User) -> str:
    return _timed_serializer(PASSWORD_RESET_SALT).dumps(
        {"user_id": user.id, "pwd": _password_fingerprint(user.password_hash)}
    )


def verify_password_reset_token(token: str | None) -> User | None:
    return _load_user_token(
        token,
        salt=PASSWORD_RESET_SALT,
        max_age=PASSWORD_RESET_MAX_AGE,
        check=lambda user, payload: payload.get("pwd")
        == _password_fingerprint(user.password_hash),
    )


def _load_user_token(
    token: str | None,
    *,
    salt: str,
    max_age: int,
    check: Callable[[User, dict], bool],
) -> User | None:
    if not token:
        return None
    try:
        payload = _timed_serializer(salt).loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict):
        return None
    user_id = payload.get("user_id")
    if not isinstance(user_id, str):
        return None
    user = db.session.get(User, user_id)
    if user is None or not check(user, payload):
        return None
    return user
