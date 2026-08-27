# KanbAIn

## Milestones

- Beta | 2026-12-01

## Tasks

### Board

- Kind: epic
- Priority: high
- Assignee: Ada
- Description: Deliver a usable Kanban board

#### Persist cards

- Kind: story
- Estimate: M | 3 | 4h
- Assignee: Ada
- Milestone: Beta

##### Write migration

- Kind: task
- Estimate: S | 1 | 2h
- Priority: high
- Assignee: Ada
- Due: 2026-11-01
- Milestone: Beta
- Depends: Persist cards
- Acceptance:
  - Schema includes project_id
  - Alembic revision is reversible

##### Add API tests

- Kind: task
- Estimate: S | 2 | 3h
- Priority: medium
- Assignee: Ada
- Milestone: Beta
