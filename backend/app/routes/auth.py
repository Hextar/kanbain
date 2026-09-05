from __future__ import annotations

import re

from authlib.integrations.flask_client import OAuth
from flask import Blueprint, current_app, jsonify, redirect, request

from ..extensions import db, limiter
from ..http import error_response
from ..identity import (
    MIN_PASSWORD_LENGTH,
    GoogleLinkError,
    create_user_with_org,
    hash_password,
    issue_activation_token,
    issue_password_reset_token,
    issue_ws_ticket,
    load_identity,
    login_session,
    logout_session,
    primary_organization,
    upsert_google_user,
    verify_activation_token,
    verify_password,
    verify_password_reset_token,
)
from ..mail import (
    activation_email,
    password_reset_email,
    send_mail,
    try_send_mail,
)
from ..models import Organization, User
from ..serialize import utcnow
from ..validation import json_error, parse_optional_text

auth_bp = Blueprint("auth", __name__)
oauth = OAuth()
_google_enabled = False

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
GENERIC_RESET_MESSAGE = (
    "If an account exists for that email, we sent a message with next steps."
)
GENERIC_ACTIVATION_MESSAGE = "Check your email to activate your account."
UNVERIFIED_MESSAGE = "Activate your account from the email we sent."
INVALID_RESET_MESSAGE = "This reset link is invalid or has expired."
INVALID_ACTIVATION_MESSAGE = "This activation link is invalid or has expired."


def init_oauth(app) -> None:
    global _google_enabled
    oauth.init_app(app)
    client_id = app.config.get("GOOGLE_CLIENT_ID") or ""
    client_secret = app.config.get("GOOGLE_CLIENT_SECRET") or ""
    if not client_id or not client_secret:
        _google_enabled = False
        return
    oauth.register(
        name="google",
        client_id=client_id,
        client_secret=client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    _google_enabled = True


def google_configured() -> bool:
    return _google_enabled


def _session_payload(user: User, organization: Organization) -> dict:
    return {"user": user.to_dict(), "organization": organization.to_dict()}


def _normalize_email(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("email is required")
    email = value.strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 255:
        raise ValueError("email must be a valid email address")
    return email


def _parse_password(value: object) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError("password is required")
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(value) > 256:
        raise ValueError("password is too long")
    return value


def _display_name(payload: dict, email: str) -> str:
    name = parse_optional_text(payload.get("name"), "name")
    if name:
        return name
    local = email.split("@", 1)[0].replace(".", " ").replace("_", " ").strip()
    return local or "User"


@auth_bp.post("/api/auth/register")
@limiter.limit(lambda: current_app.config["AUTH_REGISTER_LIMIT"])
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    try:
        email = _normalize_email(payload.get("email"))
        password = _parse_password(payload.get("password"))
        name = _display_name(payload, email)
    except ValueError as exc:
        return json_error(exc)

    existing = db.session.scalar(db.select(User.id).where(User.email == email))
    if existing is not None:
        return error_response("An account with that email already exists", 409)

    user, organization = create_user_with_org(
        email=email,
        name=name,
        password_hash=hash_password(password),
    )
    try:
        _send_activation(user)
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Register: activation mail failed")
        return error_response("Couldn't send the activation email. Try again.", 503)
    db.session.commit()
    current_app.logger.info("Register: sent activation mail")
    return jsonify(
        {
            **_session_payload(user, organization),
            "message": GENERIC_ACTIVATION_MESSAGE,
        }
    ), 201


@auth_bp.post("/api/auth/login")
@limiter.limit(lambda: current_app.config["AUTH_LOGIN_LIMIT"])
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    try:
        email = _normalize_email(payload.get("email"))
        password = payload.get("password")
        if not isinstance(password, str) or not password:
            raise ValueError("password is required")
    except ValueError as exc:
        return json_error(exc)

    user = db.session.scalar(db.select(User).where(User.email == email))
    if (
        user is None
        or user.password_hash is None
        or not verify_password(user.password_hash, password)
    ):
        return error_response("Invalid email or password", 401)

    if user.email_verified_at is None:
        return jsonify({"message": UNVERIFIED_MESSAGE, "code": "unverified"}), 403

    organization = primary_organization(user)
    if organization is None:
        return error_response("Invalid email or password", 401)

    login_session(user, organization.id)
    return jsonify(_session_payload(user, organization))


@auth_bp.post("/api/auth/activate")
@limiter.limit(lambda: current_app.config["AUTH_MAIL_LIMIT"])
def activate():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    token = payload.get("token")
    if not isinstance(token, str) or not token.strip():
        return error_response(INVALID_ACTIVATION_MESSAGE, 400)
    user = verify_activation_token(token.strip())
    if user is None:
        return error_response(INVALID_ACTIVATION_MESSAGE, 400)
    if user.email_verified_at is None:
        user.email_verified_at = utcnow()
        user.updated_at = utcnow()
        db.session.commit()
    organization = primary_organization(user)
    if organization is None:
        return error_response(INVALID_ACTIVATION_MESSAGE, 400)
    login_session(user, organization.id)
    return jsonify(_session_payload(user, organization))


@auth_bp.post("/api/auth/resend-activation")
@limiter.limit(lambda: current_app.config["AUTH_MAIL_LIMIT"])
def resend_activation():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    try:
        email = _normalize_email(payload.get("email"))
    except ValueError as exc:
        return json_error(exc)
    user = db.session.scalar(db.select(User).where(User.email == email))
    if user is not None and user.email_verified_at is None:
        try:
            _send_activation(user)
        except Exception:
            current_app.logger.exception("Resend-activation: mail failed")
            return error_response("Couldn't send the activation email. Try again.", 503)
    return jsonify({"message": GENERIC_ACTIVATION_MESSAGE})


@auth_bp.post("/api/auth/forgot-password")
@limiter.limit(lambda: current_app.config["AUTH_MAIL_LIMIT"])
def forgot_password():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    try:
        email = _normalize_email(payload.get("email"))
    except ValueError as exc:
        return json_error(exc)
    user = db.session.scalar(db.select(User).where(User.email == email))
    if user is None:
        current_app.logger.info("Forgot-password: no account for that address")
    elif user.email_verified_at is None:
        current_app.logger.info("Forgot-password: sending activation mail")
        _send_activation(user)
    else:
        current_app.logger.info("Forgot-password: sending reset mail")
        _send_password_reset(user)
    return jsonify({"message": GENERIC_RESET_MESSAGE})


@auth_bp.post("/api/auth/reset-password")
@limiter.limit(lambda: current_app.config["AUTH_MAIL_LIMIT"])
def reset_password():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)
    token = payload.get("token")
    if not isinstance(token, str) or not token.strip():
        return error_response(INVALID_RESET_MESSAGE, 400)
    try:
        password = _parse_password(payload.get("password"))
    except ValueError as exc:
        return json_error(exc)
    user = verify_password_reset_token(token.strip())
    if user is None:
        return error_response(INVALID_RESET_MESSAGE, 400)
    now = utcnow()
    user.password_hash = hash_password(password)
    user.email_verified_at = user.email_verified_at or now
    user.updated_at = now
    db.session.commit()
    organization = primary_organization(user)
    if organization is None:
        return error_response(INVALID_RESET_MESSAGE, 400)
    login_session(user, organization.id)
    return jsonify(_session_payload(user, organization))


@auth_bp.post("/api/auth/logout")
def logout():
    logout_session()
    return ("", 204)


@auth_bp.get("/api/auth/me")
def me():
    identity = load_identity()
    if identity is None:
        return error_response("Unauthorized", 401)
    user = db.session.get(User, identity.user_id)
    organization = db.session.get(Organization, identity.organization_id)
    if user is None or organization is None:
        logout_session()
        return error_response("Unauthorized", 401)
    return jsonify(_session_payload(user, organization))


@auth_bp.get("/api/auth/ws-ticket")
def ws_ticket():
    identity = load_identity()
    if identity is None:
        return error_response("Unauthorized", 401)
    return jsonify({"ticket": issue_ws_ticket(identity)})


@auth_bp.get("/api/auth/google")
@limiter.limit(lambda: current_app.config["AUTH_OAUTH_LIMIT"])
def google_start():
    if not google_configured():
        return error_response("Google sign-in is not configured", 503)
    redirect_uri = f"{_public_app_url()}/api/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.get("/api/auth/google/callback")
@limiter.limit(lambda: current_app.config["AUTH_OAUTH_LIMIT"])
def google_callback():
    if not google_configured():
        return error_response("Google sign-in is not configured", 503)
    try:
        profile = fetch_google_profile()
        user, organization = upsert_google_user(
            sub=profile["sub"],
            email=profile["email"],
            name=profile["name"],
            email_verified=profile["email_verified"],
        )
    except GoogleAuthError as exc:
        return error_response(str(exc), 401)
    except GoogleLinkError as exc:
        return error_response(str(exc), 401)
    db.session.commit()
    login_session(user, organization.id)
    return redirect(f"{_public_app_url()}/")


class GoogleAuthError(Exception):
    pass


def fetch_google_profile() -> dict:
    token = oauth.google.authorize_access_token()
    info = token.get("userinfo") if isinstance(token, dict) else None
    if not isinstance(info, dict):
        raise GoogleAuthError("Google did not return a user profile")
    sub = info.get("sub")
    email = info.get("email")
    if not isinstance(sub, str) or not sub:
        raise GoogleAuthError("Google did not return a user id")
    if not isinstance(email, str) or not email.strip():
        raise GoogleAuthError("Google did not return an email address")
    name = info.get("name")
    verified = info.get("email_verified")
    return {
        "sub": sub,
        "email": email.strip().lower(),
        "name": name.strip() if isinstance(name, str) and name.strip() else None,
        "email_verified": verified is True or verified == "true",
    }


def _public_app_url() -> str:
    return (current_app.config.get("PUBLIC_APP_URL") or "http://localhost:5173").rstrip(
        "/"
    )


def _send_activation(user: User) -> None:
    url = f"{_public_app_url()}/activate?token={issue_activation_token(user)}"
    send_mail(activation_email(to=user.email, name=user.name, url=url))


def _send_password_reset(user: User) -> None:
    url = f"{_public_app_url()}/reset-password?token={issue_password_reset_token(user)}"
    try_send_mail(password_reset_email(to=user.email, name=user.name, url=url))
