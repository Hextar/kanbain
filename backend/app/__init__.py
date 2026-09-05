from flask import Flask, redirect, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config, require_secret_key
from .extensions import db, limiter, migrate, sock
from .http import error_response
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
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    db.init_app(app)
    migrate.init_app(app, db)
    sock.init_app(app)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    @app.before_request
    def _redirect_https():
        public = (app.config.get("PUBLIC_APP_URL") or "").strip()
        if not public.startswith("https://"):
            return None
        if request.path == "/api/health" or request.is_secure:
            return None
        url = request.url.replace("http://", "https://", 1)
        return redirect(url, 301)

    @app.after_request
    def _security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        if request.is_secure:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response

    @app.errorhandler(429)
    def _rate_limited(_error):
        return error_response("Too many attempts. Try again shortly.", 429)

    @app.errorhandler(RequestEntityTooLarge)
    def _too_large(_error):
        return error_response("Request too large", 413)

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
