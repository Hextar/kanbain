from flask import current_app
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sock import Sock
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
migrate = Migrate()
sock = Sock()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[lambda: current_app.config["RATELIMIT_DEFAULT"]],
)
