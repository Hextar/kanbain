from .extensions import db
from .identity import request_organization_id
from .models import Assignee, BoardColumn, Milestone, Project, ProjectMember, Tag, Task
from .validation import parse_optional_id


class UnknownEntityError(LookupError):
    pass


def _org_scope(organization_id: str | None = None) -> str | None:
    if organization_id is not None:
        return organization_id
    return request_organization_id()


def get_project(project_id: str, *, organization_id: str | None = None) -> Project:
    project = db.session.get(Project, project_id)
    org_id = _org_scope(organization_id)
    if project is None or (org_id is not None and project.organization_id != org_id):
        raise UnknownEntityError("Unknown project")
    return project


def resolve_project_id(explicit: object) -> str:
    project_id = parse_optional_id(explicit, "projectId")
    org_id = _org_scope()
    if project_id:
        get_project(project_id, organization_id=org_id)
        return project_id

    statement = db.select(Project.id)
    if org_id is not None:
        statement = statement.where(Project.organization_id == org_id)
    ids = list(db.session.scalars(statement))
    if len(ids) == 1:
        return ids[0]
    raise ValueError("projectId is required")


def get_column(column_id: str, *, organization_id: str | None = None) -> BoardColumn:
    column = db.session.get(BoardColumn, column_id)
    if column is None:
        raise UnknownEntityError("Unknown column")
    get_project(column.project_id, organization_id=organization_id)
    return column


def get_member(member_id: str, *, organization_id: str | None = None) -> ProjectMember:
    member = db.session.get(ProjectMember, member_id)
    if member is None:
        raise UnknownEntityError("Unknown member")
    get_project(member.project_id, organization_id=organization_id)
    return member


def get_assignee(assignee_id: str, *, organization_id: str | None = None) -> Assignee:
    assignee = db.session.get(Assignee, assignee_id)
    org_id = _org_scope(organization_id)
    if assignee is None or (org_id is not None and assignee.organization_id != org_id):
        raise UnknownEntityError("Unknown assignee")
    return assignee


def get_tag(tag_id: str, *, organization_id: str | None = None) -> Tag:
    tag = db.session.get(Tag, tag_id)
    org_id = _org_scope(organization_id)
    if tag is None or (org_id is not None and tag.organization_id != org_id):
        raise UnknownEntityError("Unknown tag")
    return tag


def get_tags_by_names(names: list[str], *, organization_id: str | None = None) -> list[Tag]:
    if not names:
        return []
    org_id = _org_scope(organization_id)
    statement = db.select(Tag).where(Tag.name.in_(names))
    if org_id is not None:
        statement = statement.where(Tag.organization_id == org_id)
    tags = list(db.session.scalars(statement))
    found = {tag.name for tag in tags}
    missing = [name for name in names if name not in found]
    if missing:
        raise UnknownEntityError(f"Unknown tag(s): {', '.join(missing)}")
    return tags


def get_milestone(milestone_id: str, *, organization_id: str | None = None) -> Milestone:
    milestone = db.session.get(Milestone, milestone_id)
    if milestone is None:
        raise UnknownEntityError("Unknown milestone")
    get_project(milestone.project_id, organization_id=organization_id)
    return milestone


def get_task(task_id: str, *, organization_id: str | None = None) -> Task:
    task = db.session.get(Task, task_id)
    if task is None:
        raise UnknownEntityError(f"Task {task_id} not found")
    get_project(task.project_id, organization_id=organization_id)
    return task
