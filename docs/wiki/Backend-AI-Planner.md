# AI Planner

The AI planner is the core differentiator of KanbAIn. It takes a project brief and produces a fully structured Kanban board — with epics, stories, tasks, acceptance criteria, estimates, assignees, milestones, and dependencies. It uses **LangGraph** to orchestrate a multi-step LLM pipeline.

Source: `backend/app/planner/`

---

## High-Level Flow

```
POST /api/projects  (or POST /api/projects/:id/plan)
         │
         ▼
  Project.plan_status = "planning"
         │
         ▼
  enqueue_plan(project_id)  →  Redis "kanbain" queue
         │
         ▼
  RQ Worker: plan_project(project_id)
         │
         ▼
  LangGraph pipeline (graph.py)
         │
         ├── ground      (classify + retrieve + ingest + scrape)
         ├── decompose   (outline milestones/epics — medium/high/max effort only)
         ├── generate    (produce full board JSON)
         ├── critique    (tech-lead review — medium/high/max effort only)
         └── revise      (fix issues, loop back) ──┐
              └─────────────────────────────────────┘
         │
         ▼
  apply_plan(project_id, plan_json)
         │
         ▼
  Tasks / columns written to Postgres
         │
         ▼
  publish_project_event("plan.updated", { planStatus: "ready" })
```

---

## Graph State (`graph.py`)

LangGraph executes a stateful graph. The state object passed between nodes is:

```python
class PlanState(TypedDict):
    project_id: str
    effort: str                  # "low" | "medium" | "high" | "max"
    research: str                # RAG retrieval output (formatted citations)
    outline: dict                # decompose() output
    draft: dict                  # generate() output (raw LLM JSON)
    critique: dict               # critique() output
    iteration: int               # how many revise loops have run
    prompt_log: list[dict]       # full prompt/response log for debugging

    # RAG-specific fields
    domain_slug: str
    queries: list[str]
    extra_queries: list[str]
    chunk_ids: list[int]         # IDs of retrieved WikiChunks
    pending_urls: list[str]      # URLs flagged for scraping
    coverage_ok: bool            # whether RAG coverage was sufficient
```

---

## Nodes (`nodes.py`)

### `ground` — Research Phase

**Phase tags emitted**: `classifying` → `retrieving` → `ingesting` → `exploring`

1. **Classify**: calls `classify_brief(project_brief)` to determine the domain slug (e.g. `software-product`) and generate 3–5 targeted search queries.
2. **Retrieve**: calls `retrieve(domain_slug, queries)` — hybrid vector + full-text search against the wiki corpus with RRF + MMR reranking.
3. **Ingest**: if the project has `prd_url`, `design_urls`, or `repo_url`, fetches and chunks those documents as supplemental context.
4. **Scrape** (effort ≥ medium, if `coverage_ok` is false): asks the LLM to propose web URLs to scrape, fetches them within a time budget, and re-retrieves.

Publishes `plan.updated` with the current phase at each step so the frontend can show progress.

### `decompose` — Outline Phase

**Phase tag**: `decomposing`

An LLM call that takes the project brief + research and produces a **structured outline**:

```json
{
  "milestones": [...],
  "epics": [
    {
      "title": "...",
      "stories": ["...", "..."]
    }
  ]
}
```

This outline is passed to `generate` as scaffolding. Skipped for `low` effort.

### `generate` — Generation Phase

**Phase tag**: `generating`

The main LLM call. Uses `OpenAIPlanner` (`openai_planner.py`) to produce the full board JSON matching the schema in `llm_schema.py`. The prompt includes:

- Project brief (goal, team, deadline, methodology, quality bar, risk tolerance)
- Research (RAG citations)
- Outline (from `decompose`, if run)

Output is a JSON object with columns, tasks (including work kind, estimates, assignee, acceptance criteria, tags, milestone, dependencies).

### `critique` — Review Phase

**Phase tag**: `reviewing`

A second LLM call acting as a **tech lead reviewer**. It evaluates the generated plan against the brief and research, then returns:

```json
{
  "complete": true | false,
  "issues": ["issue 1", "issue 2"],
  "needs_more_research": false
}
```

If `complete` is true, the pipeline ends. If there are issues, it routes to `revise`. If `needs_more_research` is true, it routes back to `ground` with additional queries. Skipped for `low` effort.

### `revise` — Revision Phase

**Phase tag**: `revising`

Calls `generate` again with the issues list appended to the prompt. Increments `iteration`. After revision, routes back to `critique`. The maximum number of critique/revise loops is controlled by effort level.

---

## Routing Logic

```
START → ground
ground → decompose  (if effort in ["medium", "high", "max"])
ground → generate   (if effort == "low")

decompose → generate

generate → critique  (if effort in ["medium", "high", "max"])
generate → END       (if effort == "low")

critique → END       (if complete == True or iteration >= max_iterations)
critique → revise    (if issues and not needs_more_research)
critique → ground    (if needs_more_research)

revise → critique
```

---

## Effort Levels (`effort.py`)

The `thought_effort` field on the project controls how thorough the planning is:

| Effort | Decompose? | Critique/Revise? | Web Scraping? | Max Iterations | Job Timeout |
|---|---|---|---|---|---|
| `low` | ❌ | ❌ | ❌ | 0 | ~60s |
| `medium` | ✅ | ✅ (1 loop) | ✅ | 1 | ~120s |
| `high` | ✅ | ✅ (2 loops) | ✅ | 2 | ~240s |
| `max` | ✅ | ✅ (3 loops) | ✅ | 3 | ~480s |

---

## LLM Calls (`llm.py`)

All LLM calls use **structured output** (JSON schema–enforced):

```python
response = client.responses.parse(
    model=OPENAI_MODEL,
    instructions=system_prompt,
    input=user_prompt,
    text_format=json_schema,
    temperature=0,
    seed=42,  # reproducible outputs
)
```

- `temperature=0` + `seed=42` for deterministic, reproducible outputs.
- `OPENAI_MODEL` (default `gpt-4o`) for `generate` and `decompose`.
- `OPENAI_ROUTING_MODEL` (default `gpt-4o-mini`) for `classify` and `critique` (cheaper, faster).

---

## JSON Schema (`llm_schema.py`)

The generation schema enforces the full board structure. Key fields for each task:

```json
{
  "title": "string",
  "workKind": "epic | story | task",
  "column": "string (matches a column title)",
  "description": "string",
  "acceptanceCriteria": ["string"],
  "estimate": {
    "tshirt": "XS | S | M | L | XL",
    "points": 1,
    "hours": 4
  },
  "priority": "low | medium | high | critical",
  "assignee": "string (role, e.g. 'Frontend Developer')",
  "milestone": "string (milestone title)",
  "dependsOn": ["task title"],
  "tags": ["string"],
  "category": "string"
}
```

---

## Plan Application (`apply.py`)

After the LangGraph pipeline completes, `apply_plan(project_id, plan_json)` writes the result to Postgres:

1. **Diff**: compares the LLM output against the existing board state.
2. **Columns**: creates any columns in the plan that don't exist; updates titles/colors for existing ones.
3. **Milestones**: upserts milestones by title.
4. **Tasks**: creates new tasks, updates changed tasks, deletes tasks that were removed from the plan.
5. **Dependencies**: resolves `dependsOn` task titles to actual task IDs and writes `TaskDependency` rows.
6. **Status update**: sets `Project.plan_status = "ready"` and `Project.plan_markdown` (human-readable summary).
7. **Events**: publishes `board.updated` then `plan.updated` (with `planStatus: "ready"`) to Redis.

If any step fails, `plan_status` is set to `"failed"` and `plan_error` is populated with the exception message.

---

## Stub Mode

Set `PLANNER=stub` to run without calling OpenAI. The stub planner (`stub.py`) returns a hardcoded plan after `PLANNER_DELAY_SECONDS`. Useful for:

- Frontend development without an OpenAI key
- Unit testing plan application logic
- CI environments

---

## Prompt Logging

Every LLM call appends a `{ role, content, model, ts }` entry to `state["prompt_log"]`. After the pipeline finishes, the full log is available for debugging (logged to the worker's stdout). This makes it easy to inspect exactly what was sent to the model at each stage.
