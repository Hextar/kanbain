from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .extensions import db
from .serialize import dump_datetime


def new_id() -> str:
    return str(uuid4())


class BoardColumn(db.Model):
    __tablename__ = "columns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tasks: Mapped[list["Task"]] = relationship(back_populates="column")

    def to_dict(self) -> dict:
        return {"id": self.id, "title": self.title, "order": self.order}


class Task(db.Model):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    column_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("columns.id"), nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(String(4000))
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    priority: Mapped[str | None] = mapped_column(String(16))
    category: Mapped[str | None] = mapped_column(String(255))
    tags: Mapped[list | None] = mapped_column(JSON)
    attachments: Mapped[list | None] = mapped_column(JSON)
    comments: Mapped[list | None] = mapped_column(JSON)

    column: Mapped[BoardColumn] = relationship(back_populates="tasks")

    def to_dict(self) -> dict:
        payload = {
            "id": self.id,
            "title": self.title,
            "columnId": self.column_id,
        }
        optional = {
            "description": self.description,
            "createdAt": dump_datetime(self.created_at),
            "updatedAt": dump_datetime(self.updated_at),
            "dueDate": dump_datetime(self.due_date),
            "priority": self.priority,
            "category": self.category,
            "tags": self.tags,
            "attachments": self.attachments,
            "comments": self.comments,
        }
        for key, value in optional.items():
            if value is not None:
                payload[key] = value
        return payload
