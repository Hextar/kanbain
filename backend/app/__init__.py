from flask import Flask
from flask_cors import CORS

from .config import Config, require_secret_key
from .extensions import db, migrate, sock
from .identity import configure_sessions, register_auth_gate
from .logging import configure_logging
from .mail import init_mail


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    require_secret_key(app)
    configure_logging(app)
    configure_sessions(app)
    init_mail(app)

    db.init_app(app)
    migrate.init_app(app, db)
    sock.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from . import models as _models  # noqa: F401
    from .cli import register_cli
    from .realtime.hooks import register_session_hooks
    from .realtime.ws import register_sock
    from .routes.assignees import assignees_bp
    from .routes.auth import auth_bp, init_oauth
    from .routes.columns import columns_bp
    from .routes.health import health_bp
    from .routes.milestones import milestones_bp
    from .routes.projects import projects_bp
    from .routes.settings import settings_bp
    from .routes.tags import tags_bp
    from .routes.tasks import tasks_bp

    init_oauth(app)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(milestones_bp)
    app.register_blueprint(assignees_bp)
    app.register_blueprint(tags_bp)
    app.register_blueprint(columns_bp)
    app.register_blueprint(tasks_bp)
    register_auth_gate(app)
    register_session_hooks()
    register_sock(sock)
    register_cli(app)

    return app
