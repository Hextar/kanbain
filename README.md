# KanbAIn

An **AI-first** Kanban dashboard. You describe a project; the AI plans the work.

There is a gap between tools that generate a document from a prompt and tools that keep a board up to date. KanbAIn is meant to close that gap: a project wizard that knows the team and the deadline, then a board that is already populated with real work.

## Product idea

New projects should not start on an empty board. A short wizard collects the constraints that a planner actually needs:

- **Project** — what you are building, the goal, optional PRD / designs / repo
- **Team** — who is on it (roles, seniority, count)
- **Deadline** — hard date, nice-to-have, or ongoing
- **How you work** — Kanban, Scrum, MVP, production-grade, risk tolerance

From that, the AI should produce a plan that is already on the board, not a markdown dump you copy by hand:

1. Break the project into epics, stories, and **granular tasks**
2. Write a description and acceptance criteria for each card
3. Size the work (t-shirt / points / duration) and set priority
4. Infer dependencies, a critical path, and milestones
5. **Assign** work to the people who should own it
6. **Check the plan against the deadline** — if the load is too high, say so and suggest what to cut, slip, or rebalance

The interesting part is not generating the first board. It is treating the AI as a planner: when someone drops, a task blows up, or the deadline moves, re-plan instead of leaving the board stale.

## Current status

The Kanban UI and task/column CRUD live in `frontend/`. The wizard, planner, and estimate feedback are the product direction above — not shipped yet.

Frontend details: [frontend/README.md](frontend/README.md).

## Docker

On macOS, start the Docker client before building.

```bash
# Compose (preferred)
docker compose up --build

# Image
docker build --tag frontend frontend
docker run -d -p 8080:8080 frontend

# Inspect / stop
docker ps
docker images
docker stop frontend
docker stop $(docker ps -a -q)
```
