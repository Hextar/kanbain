from .extensions import db
from .models import BoardColumn, Project
from .serialize import utcnow


DEFAULT_COLUMNS = ("To Do", "In Progress", "Done")
DEFAULT_PROJECT_NAME = "Untitled project"


def seed_defaults() -> None:
    existing = db.session.scalar(db.select(db.func.count()).select_from(Project))
    if existing:
        return

    project = Project(
        name=DEFAULT_PROJECT_NAME,
        deadline_kind="ongoing",
        methodology="kanban",
        quality_bar="mvp",
        risk_tolerance="medium",
        created_at=utcnow(),
    )
    db.session.add(project)
    db.session.flush()

    for order, title in enumerate(DEFAULT_COLUMNS):
        db.session.add(BoardColumn(project_id=project.id, title=title, order=order))
    db.session.commit()
