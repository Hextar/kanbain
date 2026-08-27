from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from . import models as _models  # noqa: F401
    from .cli import register_cli
    from .routes.assignees import assignees_bp
    from .routes.columns import columns_bp
    from .routes.health import health_bp
    from .routes.milestones import milestones_bp
    from .routes.projects import projects_bp
    from .routes.tags import tags_bp
    from .routes.tasks import tasks_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(milestones_bp)
    app.register_blueprint(assignees_bp)
    app.register_blueprint(tags_bp)
    app.register_blueprint(columns_bp)
    app.register_blueprint(tasks_bp)
    register_cli(app)

    return app
