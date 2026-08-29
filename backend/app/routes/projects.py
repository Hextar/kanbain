from flask import Blueprint, jsonify, request
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..http import error_response
from ..lookups import UnknownEntityError, get_member, get_project
from ..models import Project, ProjectMember, new_id
from ..queue import enqueue_plan
from ..seed import add_default_columns
from ..serialize import parse_datetime, utcnow
from ..validation import (
    DEADLINE_KINDS,
    METHODOLOGIES,
    QUALITY_BARS,
    RISK_LEVELS,
    SENIORITIES,
    json_error,
    parse_enum,
    parse_number,
    parse_optional_id,
    parse_optional_text,
    parse_string_list,
    require_text,
)

projects_bp = Blueprint("projects", __name__)


def _apply_project_fields(project: Project, payload: dict, *, creating: bool) -> None:
    if creating or "name" in payload:
        project.name = require_text(payload, "name")
    if "goal" in payload:
        project.goal = parse_optional_text(payload.get("goal"), "goal")
    if "description" in payload:
        project.description = parse_optional_text(payload.get("description"), "description")
    if "prdUrl" in payload:
        project.prd_url = parse_optional_text(payload.get("prdUrl"), "prdUrl")
    if "designUrls" in payload:
        project.design_urls = parse_string_list(payload.get("designUrls"), "designUrls")
    if "repoUrl" in payload:
        project.repo_url = parse_optional_text(payload.get("repoUrl"), "repoUrl")
    if "deadlineKind" in payload:
        kind = parse_enum(payload.get("deadlineKind"), DEADLINE_KINDS, "deadlineKind")
        if kind:
            project.deadline_kind = kind
    if "deadlineAt" in payload:
        project.deadline_at = parse_datetime(payload.get("deadlineAt"))
    if "methodology" in payload:
        methodology = parse_enum(payload.get("methodology"), METHODOLOGIES, "methodology")
        if methodology:
            project.methodology = methodology
    if "qualityBar" in payload:
        quality_bar = parse_enum(payload.get("qualityBar"), QUALITY_BARS, "qualityBar")
        if quality_bar:
            project.quality_bar = quality_bar
    if "riskTolerance" in payload:
        risk = parse_enum(payload.get("riskTolerance"), RISK_LEVELS, "riskTolerance")
        if risk:
            project.risk_tolerance = risk


def _apply_member_fields(member: ProjectMember, payload: dict, *, creating: bool) -> None:
    if creating or "name" in payload:
        member.name = require_text(payload, "name")
    if "role" in payload:
        member.role = parse_optional_text(payload.get("role"), "role")
    if "seniority" in payload:
        member.seniority = parse_enum(payload.get("seniority"), SENIORITIES, "seniority")
    if "capacity" in payload:
        member.capacity = parse_number(payload.get("capacity"), "capacity")


def _member_from_payload(project_id: str, payload: dict) -> ProjectMember:
    member = ProjectMember(project_id=project_id)
    member_id = parse_optional_id(payload.get("id"))
    if member_id:
        member.id = member_id
    _apply_member_fields(member, payload, creating=True)
    return member


@projects_bp.get("/api/projects")
def list_projects():
    projects = db.session.execute(
        db.select(Project)
        .options(selectinload(Project.members))
        .order_by(Project.created_at.desc())
    ).scalars()
    return jsonify([project.to_dict() for project in projects])


@projects_bp.post("/api/projects")
def create_project():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        project_id = parse_optional_id(payload.get("id"))
    except ValueError as exc:
        return json_error(exc)

    if project_id and db.session.get(Project, project_id):
        return error_response(f"Project {project_id} already exists", 409)

    project = Project(
        created_at=utcnow(),
        deadline_kind="ongoing",
        methodology="kanban",
        quality_bar="mvp",
        risk_tolerance="medium",
    )
    project.id = project_id or new_id()

    try:
        _apply_project_fields(project, payload, creating=True)
        members = payload.get("members")
        if members is not None:
            if not isinstance(members, list):
                raise ValueError("members must be an array")
            for member_payload in members:
                if not isinstance(member_payload, dict):
                    raise ValueError("members must be an array of objects")
                project.members.append(_member_from_payload(project.id, member_payload))
    except ValueError as exc:
        return json_error(exc)

    db.session.add(project)
    db.session.flush()
    add_default_columns(project.id)
    project.plan_status = "planning"
    project.plan_error = None
    db.session.commit()
    enqueue_plan(project.id)
    db.session.refresh(project)
    return jsonify(project.to_dict()), 201


@projects_bp.get("/api/projects/<project_id>")
def get_project_route(project_id: str):
    try:
        project = get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    return jsonify(project.to_dict())


@projects_bp.put("/api/projects/<project_id>")
def update_project(project_id: str):
    try:
        project = get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        _apply_project_fields(project, payload, creating=False)
    except ValueError as exc:
        return json_error(exc)

    project.updated_at = utcnow()
    db.session.commit()
    return jsonify(project.to_dict())


@projects_bp.delete("/api/projects/<project_id>")
def delete_project(project_id: str):
    try:
        project = get_project(project_id)
    except UnknownEntityError:
        return ("", 204)
    db.session.delete(project)
    db.session.commit()
    return ("", 204)


@projects_bp.get("/api/projects/<project_id>/members")
def list_members(project_id: str):
    try:
        get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    members = db.session.execute(
        db.select(ProjectMember).where(ProjectMember.project_id == project_id)
    ).scalars()
    return jsonify([member.to_dict() for member in members])


@projects_bp.post("/api/projects/<project_id>/members")
def create_member(project_id: str):
    try:
        get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        member = _member_from_payload(project_id, payload)
    except ValueError as exc:
        return json_error(exc)

    if member.id and db.session.get(ProjectMember, member.id):
        return error_response(f"Member {member.id} already exists", 409)

    db.session.add(member)
    db.session.commit()
    return jsonify(member.to_dict()), 201


@projects_bp.put("/api/projects/<project_id>/members/<member_id>")
def update_member(project_id: str, member_id: str):
    try:
        get_project(project_id)
        member = get_member(member_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)
    if member.project_id != project_id:
        return error_response("Unknown member", 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response("JSON body required", 400)

    try:
        _apply_member_fields(member, payload, creating=False)
    except ValueError as exc:
        return json_error(exc)

    db.session.commit()
    return jsonify(member.to_dict())


@projects_bp.delete("/api/projects/<project_id>/members/<member_id>")
def delete_member(project_id: str, member_id: str):
    try:
        member = get_member(member_id)
    except UnknownEntityError:
        return ("", 204)
    if member.project_id != project_id:
        return ("", 204)
    db.session.delete(member)
    db.session.commit()
    return ("", 204)


@projects_bp.post("/api/projects/<project_id>/plan")
def enqueue_project_plan(project_id: str):
    try:
        project = get_project(project_id)
    except UnknownEntityError as exc:
        return error_response(str(exc), 404)

    if project.plan_status == "planning":
        return jsonify(project.to_dict())

    project.plan_status = "planning"
    project.plan_error = None
    project.updated_at = utcnow()
    db.session.commit()
    enqueue_plan(project.id)
    db.session.refresh(project)
    return jsonify(project.to_dict()), 202
