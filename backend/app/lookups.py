from .extensions import db
from .models import Assignee, BoardColumn, Milestone, Project, ProjectMember, Tag, Task
from .validation import parse_optional_id


class UnknownEntityError(LookupError):
    pass


def get_project(project_id: str) -> Project:
    project = db.session.get(Project, project_id)
    if project is None:
        raise UnknownEntityError("Unknown project")
    return project


def resolve_project_id(explicit: object) -> str:
    project_id = parse_optional_id(explicit, "projectId")
    if project_id:
        get_project(project_id)
        return project_id

    ids = list(db.session.scalars(db.select(Project.id)))
    if len(ids) == 1:
        return ids[0]
    raise ValueError("projectId is required")


def get_column(column_id: str) -> BoardColumn:
    column = db.session.get(BoardColumn, column_id)
    if column is None:
        raise UnknownEntityError("Unknown column")
    return column


def get_member(member_id: str) -> ProjectMember:
    member = db.session.get(ProjectMember, member_id)
    if member is None:
        raise UnknownEntityError("Unknown member")
    return member


def get_assignee(assignee_id: str) -> Assignee:
    assignee = db.session.get(Assignee, assignee_id)
    if assignee is None:
        raise UnknownEntityError("Unknown assignee")
    return assignee


def get_tag(tag_id: str) -> Tag:
    tag = db.session.get(Tag, tag_id)
    if tag is None:
        raise UnknownEntityError("Unknown tag")
    return tag


def get_tags_by_names(names: list[str]) -> list[Tag]:
    if not names:
        return []
    tags = list(db.session.scalars(db.select(Tag).where(Tag.name.in_(names))))
    found = {tag.name for tag in tags}
    missing = [name for name in names if name not in found]
    if missing:
        raise UnknownEntityError(f"Unknown tag(s): {', '.join(missing)}")
    return tags


def get_milestone(milestone_id: str) -> Milestone:
    milestone = db.session.get(Milestone, milestone_id)
    if milestone is None:
        raise UnknownEntityError("Unknown milestone")
    return milestone


def get_task(task_id: str) -> Task:
    task = db.session.get(Task, task_id)
    if task is None:
        raise UnknownEntityError(f"Task {task_id} not found")
    return task
