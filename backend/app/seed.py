from .extensions import db
from .models import BoardColumn, Project
from .serialize import utcnow


DEFAULT_COLUMNS = (("To Do", "sky"), ("In Progress", "amber"), ("Done", "emerald"))
DEFAULT_PROJECT_NAME = "Untitled project"


def add_default_columns(project_id: str) -> None:
    for order, (title, color) in enumerate(DEFAULT_COLUMNS):
        db.session.add(
            BoardColumn(project_id=project_id, title=title, order=order, color=color)
        )


def seed_defaults(organization_id: str | None = None) -> None:
    if not organization_id:
        return

    existing = db.session.scalar(
        db.select(db.func.count())
        .select_from(Project)
        .where(Project.organization_id == organization_id)
    )
    if existing:
        return

    project = Project(
        name=DEFAULT_PROJECT_NAME,
        organization_id=organization_id,
        deadline_kind="ongoing",
        methodology="kanban",
        quality_bar="mvp",
        risk_tolerance="medium",
        plan_status="ready",
        created_at=utcnow(),
    )
    db.session.add(project)
    db.session.flush()
    add_default_columns(project.id)
    db.session.commit()
