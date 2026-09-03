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
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
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
