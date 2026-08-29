from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .extensions import db
from .serialize import dump_datetime, dump_number


def new_id() -> str:
    return str(uuid4())


class Project(db.Model):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "deadline_kind IN ('hard', 'nice_to_have', 'ongoing')",
            name="ck_projects_deadline_kind",
        ),
        CheckConstraint(
            "methodology IN ('kanban', 'scrum')",
            name="ck_projects_methodology",
        ),
        CheckConstraint(
            "quality_bar IN ('mvp', 'production_grade')",
            name="ck_projects_quality_bar",
        ),
        CheckConstraint(
            "risk_tolerance IN ('low', 'medium', 'high')",
            name="ck_projects_risk_tolerance",
        ),
        CheckConstraint(
            "plan_status IN ('planning', 'ready', 'failed')",
            name="ck_projects_plan_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    goal: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    prd_url: Mapped[str | None] = mapped_column(String(2048))
    design_urls: Mapped[list | None] = mapped_column(JSON)
    repo_url: Mapped[str | None] = mapped_column(String(2048))
    deadline_kind: Mapped[str] = mapped_column(String(32), nullable=False, default="ongoing")
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    methodology: Mapped[str] = mapped_column(String(32), nullable=False, default="kanban")
    quality_bar: Mapped[str] = mapped_column(String(32), nullable=False, default="mvp")
    risk_tolerance: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    plan_status: Mapped[str] = mapped_column(String(16), nullable=False, default="ready")
    plan_error: Mapped[str | None] = mapped_column(Text)
    plan_markdown: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    members: Mapped[list["ProjectMember"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    columns: Mapped[list["BoardColumn"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )

    def to_dict(self, *, include_members: bool = True) -> dict:
        payload = {
            "id": self.id,
            "name": self.name,
            "deadlineKind": self.deadline_kind,
            "methodology": self.methodology,
            "qualityBar": self.quality_bar,
            "riskTolerance": self.risk_tolerance,
            "planStatus": self.plan_status,
        }
        optional = {
            "goal": self.goal,
            "description": self.description,
            "prdUrl": self.prd_url,
            "designUrls": self.design_urls,
            "repoUrl": self.repo_url,
            "deadlineAt": dump_datetime(self.deadline_at),
            "planError": self.plan_error,
            "createdAt": dump_datetime(self.created_at),
            "updatedAt": dump_datetime(self.updated_at),
        }
        for key, value in optional.items():
            if value is not None:
                payload[key] = value
        if include_members:
            payload["members"] = [member.to_dict() for member in self.members]
        return payload


class ProjectMember(db.Model):
    __tablename__ = "project_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(255))
    seniority: Mapped[str | None] = mapped_column(String(32))
    capacity: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))

    project: Mapped[Project] = relationship(back_populates="members")

    def to_dict(self) -> dict:
        payload = {"id": self.id, "projectId": self.project_id, "name": self.name}
        if self.role is not None:
            payload["role"] = self.role
        if self.seniority is not None:
            payload["seniority"] = self.seniority
        if self.capacity is not None:
            payload["capacity"] = dump_number(self.capacity)
        return payload


class Assignee(db.Model):
    """Global role-style assignee shared across projects (e.g. Frontend Developer)."""

    __tablename__ = "assignees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    tasks: Mapped[list["Task"]] = relationship(back_populates="assignee")

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}


class Tag(db.Model):
    """Global tag catalog shared across projects."""

    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}


class Milestone(db.Model):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    project: Mapped[Project] = relationship(back_populates="milestones")
    tasks: Mapped[list["Task"]] = relationship(back_populates="milestone")

    def to_dict(self) -> dict:
        payload = {
            "id": self.id,
            "projectId": self.project_id,
            "title": self.title,
            "order": self.order,
        }
        if self.due_at is not None:
            payload["dueAt"] = dump_datetime(self.due_at)
        return payload


class BoardColumn(db.Model):
    __tablename__ = "columns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tasks: Mapped[list["Task"]] = relationship(back_populates="column", cascade="all, delete-orphan")
    project: Mapped[Project] = relationship(back_populates="columns")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "projectId": self.project_id,
            "title": self.title,
            "order": self.order,
        }


class Task(db.Model):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint(
            "work_kind IN ('epic', 'story', 'task')",
            name="ck_tasks_work_kind",
        ),
        CheckConstraint(
            "estimate_tshirt IS NULL OR estimate_tshirt IN ('xs', 's', 'm', 'l', 'xl')",
            name="ck_tasks_estimate_tshirt",
        ),
        Index("ix_tasks_column_id_order", "column_id", "order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    column_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("columns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="SET NULL"), index=True
    )
    work_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="task")
    description: Mapped[str | None] = mapped_column(Text)
    acceptance_criteria: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    priority: Mapped[str | None] = mapped_column(String(16))
    category: Mapped[str | None] = mapped_column(String(255))
    estimate_tshirt: Mapped[str | None] = mapped_column(String(8))
    estimate_points: Mapped[int | None] = mapped_column(Integer)
    estimate_hours: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    assignee_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("assignees.id", ondelete="SET NULL"), index=True
    )
    milestone_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("milestones.id", ondelete="SET NULL"), index=True
    )
    tags: Mapped[list | None] = mapped_column(JSON)
    attachments: Mapped[list | None] = mapped_column(JSON)
    comments: Mapped[list | None] = mapped_column(JSON)

    project: Mapped[Project] = relationship(back_populates="tasks")
    column: Mapped[BoardColumn] = relationship(back_populates="tasks")
    parent: Mapped["Task | None"] = relationship(
        remote_side="Task.id",
        foreign_keys=[parent_id],
        back_populates="children",
    )
    children: Mapped[list["Task"]] = relationship(
        foreign_keys=[parent_id],
        back_populates="parent",
    )
    assignee: Mapped[Assignee | None] = relationship(back_populates="tasks")
    milestone: Mapped[Milestone | None] = relationship(back_populates="tasks")
    dependencies: Mapped[list["TaskDependency"]] = relationship(
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def to_dict(self) -> dict:
        payload = {
            "id": self.id,
            "projectId": self.project_id,
            "title": self.title,
            "columnId": self.column_id,
            "order": self.order,
            "workKind": self.work_kind,
        }
        optional = {
            "parentId": self.parent_id,
            "description": self.description,
            "acceptanceCriteria": self.acceptance_criteria,
            "createdAt": dump_datetime(self.created_at),
            "updatedAt": dump_datetime(self.updated_at),
            "dueDate": dump_datetime(self.due_date),
            "priority": self.priority,
            "category": self.category,
            "estimateTshirt": self.estimate_tshirt,
            "estimatePoints": self.estimate_points,
            "estimateHours": dump_number(self.estimate_hours),
            "assigneeId": self.assignee_id,
            "milestoneId": self.milestone_id,
            "tags": self.tags,
            "attachments": self.attachments,
            "comments": self.comments,
        }
        for key, value in optional.items():
            if value is not None:
                payload[key] = value
        depends_on = [dependency.depends_on_id for dependency in self.dependencies]
        if depends_on:
            payload["dependsOn"] = depends_on
        return payload


class TaskDependency(db.Model):
    __tablename__ = "task_dependencies"

    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    depends_on_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )

    task: Mapped[Task] = relationship(foreign_keys=[task_id], back_populates="dependencies")
    depends_on: Mapped[Task] = relationship(foreign_keys=[depends_on_id])
