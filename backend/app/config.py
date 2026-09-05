import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from sqlalchemy.pool import StaticPool

INSECURE_SECRET_KEY = "dev-secret-change-me"

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_ROOT.parent

load_dotenv(_BACKEND_ROOT / ".env")
if (_REPO_ROOT / "compose.yaml").is_file():
    load_dotenv(_REPO_ROOT / ".env", override=True)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/kanban_dashboard",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = [
        origin.strip().rstrip("/")
        for origin in (
            os.environ.get("CORS_ORIGINS")
            or os.environ.get("PUBLIC_APP_URL", "http://localhost:5173")
        ).split(",")
        if origin.strip()
    ]
    PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "http://localhost:5173")
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", str(256 * 1024)))
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    MAIL_PROVIDER = os.environ.get("MAIL_PROVIDER", "console")
    MAIL_FROM = os.environ.get("MAIL_FROM", "")
    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT") or "587")
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI") or os.environ.get(
        "REDIS_URL", "memory://"
    )
    RATELIMIT_DEFAULT = os.environ.get("RATELIMIT_DEFAULT", "120 per minute")
    AUTH_LOGIN_LIMIT = os.environ.get("AUTH_LOGIN_LIMIT", "10 per minute")
    AUTH_REGISTER_LIMIT = os.environ.get("AUTH_REGISTER_LIMIT", "5 per minute")
    AUTH_MAIL_LIMIT = os.environ.get("AUTH_MAIL_LIMIT", "5 per minute")
    AUTH_OAUTH_LIMIT = os.environ.get("AUTH_OAUTH_LIMIT", "10 per minute")
    PLANNER_LIMIT = os.environ.get("PLANNER_LIMIT", "5 per hour")
    PLANNER = os.environ.get("PLANNER", "openai")
    PLANNER_DELAY_SECONDS = float(os.environ.get("PLANNER_DELAY_SECONDS", "2"))
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
    OPENAI_ROUTING_MODEL = os.environ.get("OPENAI_ROUTING_MODEL", "gpt-4o-mini")
    OPENAI_EMBEDDING_MODEL = os.environ.get(
        "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
    )
    OPENAI_SEED = int(os.environ.get("OPENAI_SEED", "7"))
    OPENAI_MAX_COMPLETION_TOKENS = int(
        os.environ.get("OPENAI_MAX_COMPLETION_TOKENS", "16384")
    )
    RAG_RESEARCH_TOKEN_BUDGET = int(os.environ.get("RAG_RESEARCH_TOKEN_BUDGET", "2500"))
    RAG_SCRAPE_SECONDS = float(os.environ.get("RAG_SCRAPE_SECONDS", "10"))


class TestConfig(Config):
    TESTING = True
    SECRET_KEY = "test-secret-not-for-production"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }
    PLANNER = "stub"
    PLANNER_DELAY_SECONDS = 0
    OPENAI_API_KEY = ""
    MAIL_PROVIDER = "console"
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URI = "memory://"
    CORS_ORIGINS = ["http://localhost:5173"]


def require_secret_key(app: Flask) -> None:
    if app.config.get("TESTING"):
        return
    secret = app.config.get("SECRET_KEY") or ""
    if isinstance(secret, bytes):
        secret = secret.decode()
    stripped = secret.strip()
    if not stripped or stripped == INSECURE_SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY is required. Set a unique passphrase in the project "
            "root .env (see .env.example). Do not use the example default."
        )
