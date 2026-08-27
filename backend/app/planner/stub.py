from __future__ import annotations

from datetime import datetime

from ..models import Project


class StubPlanner:
    def generate(self, project: Project) -> str:
        assignee = project.members[0].name if project.members else "Unassigned"
        extra = project.members[1].name if len(project.members) > 1 else assignee
        goal = project.goal or f"Deliver {project.name}"
        milestone_line = _milestone_line(project.name, project.deadline_at)
        due_line = _due_line(project.deadline_at)
        quality = "production-ready" if project.quality_bar == "production_grade" else "MVP"
        cadence = "sprint-sized" if project.methodology == "scrum" else "continuous-flow"
        return f"""# {project.name}

## Milestones
{milestone_line}

## Tasks

### {project.name}

- Kind: epic
- Priority: high
- Assignee: {assignee}
- Description: {goal}

#### Foundation

- Kind: story
- Estimate: M | 3 | 4h
- Priority: high
- Assignee: {assignee}
- Milestone: Launch
- Description: Stand up the {cadence} {quality} board

##### Capture constraints

- Kind: task
- Estimate: S | 1 | 2h
- Priority: high
- Assignee: {assignee}
{due_line}- Milestone: Launch
- Acceptance:
  - Goal, team, and deadline are reflected on cards

##### Seed the backlog

- Kind: task
- Estimate: S | 2 | 3h
- Priority: medium
- Assignee: {extra}
- Milestone: Launch
- Depends: Capture constraints
- Acceptance:
  - First column holds the planned work

#### Delivery

- Kind: story
- Estimate: L | 5 | 8h
- Priority: medium
- Assignee: {extra}
- Milestone: Launch

##### Break down remaining work

- Kind: task
- Estimate: M | 3 | 4h
- Priority: medium
- Assignee: {assignee}
- Milestone: Launch
- Depends: Seed the backlog

##### Review the plan against the deadline

- Kind: task
- Estimate: S | 1 | 2h
- Priority: high
- Assignee: {extra}
- Milestone: Launch
- Acceptance:
  - Load is checked against the deadline
"""


def _milestone_line(name: str, deadline_at: datetime | None) -> str:
    if deadline_at is None:
        return "- Launch | 2099-01-01"
    return f"- Launch | {deadline_at.date().isoformat()}"


def _due_line(deadline_at: datetime | None) -> str:
    if deadline_at is None:
        return ""
    return f"- Due: {deadline_at.date().isoformat()}\n"
