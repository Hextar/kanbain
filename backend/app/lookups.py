from .extensions import db
from .models import BoardColumn, Milestone, Project, ProjectMember, Task
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
