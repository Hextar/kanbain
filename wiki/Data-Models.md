# Data Models

All application data lives in **PostgreSQL 15** with the `pgvector` extension. The ORM is SQLAlchemy with typed `Mapped`/`mapped_column` declarations. Migration files are managed by Flask-Migrate (Alembic) in `backend/migrations/versions/`.

---

## Entity Relationship Overview

```
Project
  ├── ProjectMember[]
  ├── Milestone[]
  ├── BoardColumn[]
  │     └── Task[]  (tasks belong to a column)
  └── Task[]        (all tasks for quick project-level queries)
        ├── parent Task?         (self-referential: epic → story → task)
        ├── children Task[]
        ├── Milestone?
        └── TaskDependency[]     (depends_on → Task)

WikiSource
  └── WikiChunk[]
```

---

## Project

The top-level entity. Everything hangs off a project.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | str | Project name |
| `goal` | str | One-sentence goal / elevator pitch |
| `description` | text | Longer project description |
| `prd_url` | str? | Link to PRD / spec document |
| `design_urls` | JSON[]? | Links to design files (Figma, etc.) |
| `repo_url` | str? | Source code repository URL |
| `methodology` | enum | `kanban` \| `scrum` |
| `quality_bar` | enum | `mvp` \| `production_grade` |
| `risk_tolerance` | enum | `low` \| `medium` \| `high` |
| `thought_effort` | enum | `low` \| `medium` \| `high` \| `max` |
| `deadline_kind` | enum? | `fixed` \| `target` \| `none` |
| `deadline_date` | date? | Target completion date |
| `plan_status` | enum | `pending` \| `planning` \| `ready` \| `failed` |
| `plan_phase` | str? | Current LangGraph node label (e.g. `"generating"`) |
| `plan_error` | text? | Error message if planning failed |
| `plan_warning` | text? | Non-fatal warning (e.g. poor RAG coverage) |
| `plan_markdown` | text? | Human-readable plan summary |
| `created_at` | datetime | |
| `updated_at` | datetime | |

---

## ProjectMember

Represents a team member role on the project. Members are used by the planner to assign tasks and calibrate capacity.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | |
| `name` | str | Member name or role label |
| `role` | str | e.g. `"Frontend Developer"`, `"Backend Engineer"` |
| `seniority` | enum | `junior` \| `mid` \| `senior` \| `lead` |
| `capacity` | float | Weekly capacity (0.0 – 1.0, where 1.0 = full time) |

---

## Milestone

A named deadline or release checkpoint. Tasks can be associated with a milestone.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | |
| `title` | str | Milestone name (e.g. `"v1.0 Launch"`) |
| `due_at` | date? | Target date |
| `order` | int | Display order on the board |

---

## BoardColumn

Represents a Kanban column (e.g. `Backlog`, `In Progress`, `Done`).

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | |
| `title` | str | Column title |
| `order` | int | Display order (fractional index) |
| `color` | str? | Hex color for the column header |

---

## Task

The main work item. Tasks form a three-level hierarchy: **Epic → Story → Task**.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | FK → Project | |
| `column_id` | FK → BoardColumn | Current column |
| `parent_id` | FK → Task? | Parent task (null for top-level epics) |
| `milestone_id` | FK → Milestone? | Associated milestone |
| `number` | int | Per-project sequential number (e.g. `#42`) |
| `title` | str | Task title |
| `work_kind` | enum | `epic` \| `story` \| `task` |
| `description` | text? | Detailed description |
| `acceptance_criteria` | JSON[]? | List of acceptance criteria strings |
| `order` | float | Fractional index within the column |
| `priority` | enum? | `low` \| `medium` \| `high` \| `critical` |
| `category` | str? | Free-text category label |
| `tags` | JSON[]? | List of tag strings |
| `due_date` | date? | Task-level deadline |
| `assignee` | str? | Role label (e.g. `"Frontend Developer"`) |
| `estimate_tshirt` | enum? | `XS` \| `S` \| `M` \| `L` \| `XL` |
| `estimate_points` | int? | Story points |
| `estimate_hours` | float? | Hour estimate |
| `attachments` | JSON[]? | File attachment metadata |
| `comments` | JSON[]? | Inline comment thread |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Task Hierarchy

```
Epic (work_kind="epic", parent_id=null)
  └── Story (work_kind="story", parent_id=epic.id)
        └── Task (work_kind="task", parent_id=story.id)
```

The hierarchy is self-referential on the `Task` table via `parent_id`. The `children` relationship is loaded lazily.

---

## TaskDependency

A many-to-many join table representing blocking dependencies between tasks.

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key |
| `task_id` | FK → Task | The task that depends on another |
| `depends_on_id` | FK → Task | The task that must be completed first |

Accessed as `task.depends_on` (list of Task objects this task is blocked by) and `task.dependents` (list of tasks blocked by this one).

---

## WikiSource

A knowledge document ingested into the RAG corpus.

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key |
| `origin` | str | `"corpus"` (bundled) or `"web"` (scraped) |
| `locator` | str | File path or URL |
| `domain_slug` | str | Domain this document belongs to |
| `content_hash` | str | SHA-256 hash for change detection |
| `promoted_at` | datetime? | Last time this source was cited by the planner |
| `created_at` | datetime | |

---

## WikiChunk

A retrievable chunk of knowledge derived from a `WikiSource`.

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key |
| `source_id` | FK → WikiSource | Parent document |
| `heading` | str | Section heading |
| `text` | str | Chunk content |
| `parent_text` | str? | Parent section content (richer context) |
| `token_count` | int | Estimated token count |
| `embedding` | JSON | OpenAI embedding vector (1536-dimensional float array) |
| `tsv` | tsvector | PostgreSQL full-text search vector (auto-updated via trigger) |
| `created_at` | datetime | |

The `embedding` column is a plain JSON array rather than a pgvector `vector` type. Similarity is computed in Python using `cosine()` from `embed.py`. The `tsv` column enables efficient full-text search via PostgreSQL's built-in GIN index.

---

## Migration Notes

Migrations live in `backend/migrations/versions/` and are numbered sequentially:

```
001_initial.py         — core tables (Project, Task, Column, Member, Milestone)
...
010_wiki_rag.py        — WikiSource, WikiChunk, pgvector extension
```

Run all migrations:

```bash
flask db upgrade
```

The pgvector extension is created in migration `010` via:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
