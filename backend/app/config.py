import os

from dotenv import load_dotenv
from sqlalchemy.pool import StaticPool

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
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


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }
    PLANNER = "stub"
    PLANNER_DELAY_SECONDS = 0
    OPENAI_API_KEY = ""
