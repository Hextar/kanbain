import {
  projectFromJson,
  projectToJson,
  type ProjectJson,
} from "@modules/Project/helpers/projectJson";
import {
  columnFromJson,
  columnToJson,
  type ColumnJson,
} from "@modules/Project/helpers/columnJson";
import type { CreateProjectInput, Project } from "@modules/Project/types/Project";
import type { Column, CreateColumnInput } from "@modules/Task/types/Column";
import type { Assignee, Milestone, Tag } from "@modules/Task/types/Catalog";
import type { CreateTaskInput, Task, TaskListFilters } from "@modules/Task/types/Task";
import {
  milestoneFromJson,
  milestoneToJson,
  type MilestoneJson,
} from "@modules/Task/helpers/milestoneJson";
import {
  taskFromJson,
  taskToJson,
  type TaskJson,
} from "@modules/Task/helpers/taskJson";

const projects: Project[] = [];
const columns: Column[] = [];
const tasks: Task[] = [];
const assignees: Assignee[] = [];
const tags: Tag[] = [];
const milestones: Milestone[] = [];

class MockApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}

function resolveProjectId(requested: string | null) {
  if (requested) return requested;
  if (projects.length === 1) return projects[0].id;
  return null;
}

export function listProjects() {
  return projects;
}

export function findProject(id: string) {
  return projects.find((project) => project.id === id) ?? null;
}

export function insertProject(input: CreateProjectInput): Project {
  const name = input.name.trim();
  if (!name) throw new MockApiError("name is required", 400);
  const id = input.id ?? crypto.randomUUID();
  const members = (input.members ?? []).map((member) => ({
    id: crypto.randomUUID(),
    projectId: id,
    name: member.name,
    role: member.role,
    seniority: member.seniority,
    capacity: member.capacity,
  }));
  const project = projectFromJson({
    id,
    name,
    goal: input.goal,
    prdUrl: input.prdUrl,
    designUrls: input.designUrls,
    repoUrl: input.repoUrl,
    deadlineKind: input.deadlineKind ?? "ongoing",
    deadlineAt: input.deadlineAt,
    methodology: input.methodology ?? "kanban",
    qualityBar: input.qualityBar ?? "mvp",
    riskTolerance: input.riskTolerance ?? "medium",
    planStatus: "planning",
    createdAt: new Date().toISOString(),
    members,
  } satisfies ProjectJson);
  projects.push(project);
  for (const title of ["To Do", "In Progress", "Done"] as const) {
    insertColumn({ title, projectId: project.id });
  }
  scheduleMockPlan(project.id);
  return project;
}

export function updateProject(
  id: string,
  payload: Pick<ProjectJson, "name">,
): Project {
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) throw new MockApiError(`Project ${id} not found`, 404);
  const name = payload.name.trim();
  if (!name) throw new MockApiError("name is required", 400);
  const nextProject = {
    ...projects[index],
    name,
    updatedAt: new Date(),
  };
  projects[index] = nextProject;
  return nextProject;
}

export function deleteProject(id: string) {
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) return;
  const columnIds = new Set(
    columns
      .filter((column) => column.projectId === id)
      .map((column) => column.id),
  );
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (columnIds.has(tasks[i].columnId)) tasks.splice(i, 1);
  }
  for (let i = columns.length - 1; i >= 0; i--) {
    if (columns[i].projectId === id) columns.splice(i, 1);
  }
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (milestones[i].projectId === id) milestones.splice(i, 1);
  }
  projects.splice(index, 1);
}

const MOCK_PLAN_DELAY_MS = 1500;

function upsertAssignee(name: string): string {
  const existing = assignees.find((item) => item.name === name);
  if (existing) return existing.id;
  const assignee = { id: crypto.randomUUID(), name };
  assignees.push(assignee);
  return assignee.id;
}

function applyMockPlan(projectId: string) {
  const project = findProject(projectId);
  if (!project) return;
  const todo = listColumnsFor(projectId)[0];
  if (!todo) throw new MockApiError("project has no columns", 400);

  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].projectId === projectId) tasks.splice(i, 1);
  }
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (milestones[i].projectId === projectId) milestones.splice(i, 1);
  }

  const names =
    project.members.length > 0
      ? project.members.map((member) => member.name)
      : ["Unassigned"];
  const ownerId = upsertAssignee(names[0]);
  const helperId = upsertAssignee(names[1] ?? names[0]);
  const milestone = milestoneFromJson({
    id: crypto.randomUUID(),
    projectId,
    title: "Launch",
    order: 0,
    dueAt: project.deadlineAt?.toISOString(),
  } satisfies MilestoneJson);
  milestones.push(milestone);

  insertTask({
    title: project.name,
    columnId: todo.id,
    priority: "high",
    assigneeId: ownerId,
    milestoneId: milestone.id,
  });
  insertTask({
    title: "Capture constraints",
    columnId: todo.id,
    priority: "high",
    assigneeId: ownerId,
    milestoneId: milestone.id,
    estimateTshirt: "s",
  });
  insertTask({
    title: "Seed the backlog",
    columnId: todo.id,
    priority: "medium",
    assigneeId: helperId,
    milestoneId: milestone.id,
    estimateTshirt: "s",
  });
  insertTask({
    title: "Review the plan against the deadline",
    columnId: todo.id,
    priority: "high",
    assigneeId: helperId,
    milestoneId: milestone.id,
    estimateTshirt: "s",
  });
  project.planStatus = "ready";
  project.planError = undefined;
}

function scheduleMockPlan(projectId: string) {
  setTimeout(() => {
    try {
      applyMockPlan(projectId);
    } catch {
      const project = findProject(projectId);
      if (!project) return;
      project.planStatus = "failed";
      project.planError = "Could not plan this project.";
    }
  }, MOCK_PLAN_DELAY_MS);
}

export function enqueuePlan(id: string): Project {
  const project = findProject(id);
  if (!project) throw new MockApiError(`Project ${id} not found`, 404);
  if (project.planStatus === "planning") return project;
  project.planStatus = "planning";
  project.planError = undefined;
  scheduleMockPlan(id);
  return project;
}

export function listColumnsFor(projectId: string) {
  return columns
    .filter((column) => column.projectId === projectId)
    .toSorted((left, right) => left.order - right.order);
}

export function insertColumn(input: CreateColumnInput): Column {
  const projectId = resolveProjectId(input.projectId ?? null);
  if (!projectId) throw new MockApiError("projectId is required", 400);
  if (!projects.some((project) => project.id === projectId)) {
    throw new MockApiError("Unknown project", 400);
  }
  const nextOrder =
    columns
      .filter((column) => column.projectId === projectId)
      .reduce((max, column) => Math.max(max, column.order), -1) + 1;
  const column = columnFromJson({
    id: input.id ?? crypto.randomUUID(),
    projectId,
    title: input.title,
    order: nextOrder,
  } satisfies ColumnJson);
  columns.push(column);
  return column;
}

export function updateColumn(
  id: string,
  payload: Pick<ColumnJson, "title">,
): Column {
  const index = columns.findIndex((column) => column.id === id);
  if (index === -1) throw new MockApiError(`Column ${id} not found`, 404);
  const title = payload.title.trim();
  if (!title) throw new MockApiError("title is required", 400);
  const nextColumn = { ...columns[index], title };
  columns[index] = nextColumn;
  return nextColumn;
}

export function deleteColumn(id: string) {
  const index = columns.findIndex((column) => column.id === id);
  if (index === -1) return;
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].columnId === id) tasks.splice(i, 1);
  }
  columns.splice(index, 1);
}

function matchesFilters(task: Task, filters: TaskListFilters) {
  if (filters.columnId !== undefined && task.columnId !== filters.columnId)
    return false;
  if (filters.category !== undefined && task.category !== filters.category)
    return false;
  if (filters.priority !== undefined && task.priority !== filters.priority)
    return false;
  return true;
}

export function listTasks(filters: TaskListFilters) {
  return tasks.filter((task) => matchesFilters(task, filters));
}

export function findTask(id: string) {
  return tasks.find((task) => task.id === id) ?? null;
}

export function insertTask(input: CreateTaskInput): Task {
  const column = columns.find((item) => item.id === input.columnId);
  if (!column) throw new MockApiError("Unknown column", 400);
  if (input.assigneeId && !assignees.some((item) => item.id === input.assigneeId)) {
    throw new MockApiError("Unknown assignee", 400);
  }
  if (
    input.milestoneId &&
    !milestones.some(
      (item) =>
        item.id === input.milestoneId && item.projectId === column.projectId,
    )
  ) {
    throw new MockApiError("Unknown milestone", 400);
  }
  if (input.tags?.length) {
    const known = new Set(tags.map((tag) => tag.name));
    const missing = input.tags.filter((tag) => !known.has(tag));
    if (missing.length) {
      throw new MockApiError(`Unknown tag(s): ${missing.join(", ")}`, 400);
    }
  }
  const task: Task = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    projectId: column.projectId,
    createdAt: new Date(),
  };
  tasks.push(task);
  return task;
}

export function replaceTask(id: string, payload: TaskJson): Task {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) throw new MockApiError(`Task ${id} not found`, 404);
  const column = columns.find((item) => item.id === payload.columnId);
  if (!column) throw new MockApiError("Unknown column", 400);
  if (
    payload.assigneeId &&
    !assignees.some((item) => item.id === payload.assigneeId)
  ) {
    throw new MockApiError("Unknown assignee", 400);
  }
  if (
    payload.milestoneId &&
    !milestones.some(
      (item) =>
        item.id === payload.milestoneId && item.projectId === column.projectId,
    )
  ) {
    throw new MockApiError("Unknown milestone", 400);
  }
  if (payload.tags?.length) {
    const known = new Set(tags.map((tag) => tag.name));
    const missing = payload.tags.filter((tag) => !known.has(tag));
    if (missing.length) {
      throw new MockApiError(`Unknown tag(s): ${missing.join(", ")}`, 400);
    }
  }
  const nextTask = taskFromJson({ ...payload, id, projectId: column.projectId });
  tasks[index] = nextTask;
  return nextTask;
}

export function deleteTask(id: string) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index !== -1) tasks.splice(index, 1);
}

function respond<T>(run: () => T, status = 200) {
  try {
    const value = run();
    if (value === undefined) return new Response(null, { status: 204 });
    return Response.json(value, { status });
  } catch (error) {
    if (error instanceof MockApiError)
      return jsonError(error.message, error.status);
    throw error;
  }
}

export async function handleMock(request: Request, apiPath: string) {
  const url = new URL(request.url);
  const segments = apiPath.split("/").filter(Boolean);

  if (request.method === "GET" && apiPath === "/api/projects") {
    return respond(() => projects.map(projectToJson));
  }
  if (request.method === "POST" && apiPath === "/api/projects") {
    const input = (await request.json()) as CreateProjectInput;
    return respond(() => projectToJson(insertProject(input)), 201);
  }
  if (
    segments[0] === "api" &&
    segments[1] === "projects" &&
    segments.length === 3
  ) {
    const id = segments[2];
    if (request.method === "GET") {
      return respond(() => {
        const project = findProject(id);
        if (!project) throw new MockApiError(`Project ${id} not found`, 404);
        return projectToJson(project);
      });
    }
    if (request.method === "PUT") {
      const payload = (await request.json()) as Pick<ProjectJson, "name">;
      return respond(() => projectToJson(updateProject(id, payload)));
    }
    if (request.method === "DELETE") {
      deleteProject(id);
      return new Response(null, { status: 204 });
    }
  }

  if (
    segments[0] === "api" &&
    segments[1] === "projects" &&
    segments[3] === "plan" &&
    segments.length === 4 &&
    request.method === "POST"
  ) {
    return respond(() => projectToJson(enqueuePlan(segments[2])), 202);
  }

  if (request.method === "GET" && apiPath === "/api/columns") {
    return respond(() => {
      const projectId = resolveProjectId(url.searchParams.get("projectId"));
      if (!projectId) throw new MockApiError("projectId is required", 400);
      return listColumnsFor(projectId).map(columnToJson);
    });
  }
  if (request.method === "POST" && apiPath === "/api/columns") {
    const input = (await request.json()) as CreateColumnInput;
    return respond(() => columnToJson(insertColumn(input)), 201);
  }
  if (
    segments[0] === "api" &&
    segments[1] === "columns" &&
    segments.length === 3
  ) {
    const id = segments[2];
    if (request.method === "PUT") {
      const payload = (await request.json()) as Pick<ColumnJson, "title">;
      return respond(() => columnToJson(updateColumn(id, payload)));
    }
    if (request.method === "DELETE") {
      deleteColumn(id);
      return new Response(null, { status: 204 });
    }
  }

  if (request.method === "GET" && apiPath === "/api/tasks") {
    const priority = url.searchParams.get("priority");
    return respond(() =>
      listTasks({
        columnId: url.searchParams.get("columnId") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        priority:
          priority === "low" || priority === "medium" || priority === "high"
            ? priority
            : undefined,
      }).map(taskToJson),
    );
  }
  if (request.method === "POST" && apiPath === "/api/tasks") {
    const input = (await request.json()) as CreateTaskInput;
    return respond(() => taskToJson(insertTask(input)), 201);
  }
  if (
    segments[0] === "api" &&
    segments[1] === "tasks" &&
    segments.length === 3
  ) {
    const id = segments[2];
    if (request.method === "GET") {
      return respond(() => {
        const task = findTask(id);
        if (!task) throw new MockApiError(`Task ${id} not found`, 404);
        return taskToJson(task);
      });
    }
    if (request.method === "PUT") {
      const payload = (await request.json()) as TaskJson;
      return respond(() => taskToJson(replaceTask(id, payload)));
    }
    if (request.method === "DELETE") {
      deleteTask(id);
      return new Response(null, { status: 204 });
    }
  }

  if (request.method === "GET" && apiPath === "/api/assignees") {
    return respond(() =>
      assignees.toSorted((left, right) => left.name.localeCompare(right.name)),
    );
  }
  if (request.method === "POST" && apiPath === "/api/assignees") {
    const payload = (await request.json()) as { name?: string };
    return respond(() => {
      const name = payload.name?.trim();
      if (!name) throw new MockApiError("name is required", 400);
      if (assignees.some((item) => item.name === name)) {
        throw new MockApiError(`Assignee '${name}' already exists`, 409);
      }
      const assignee = { id: crypto.randomUUID(), name };
      assignees.push(assignee);
      return assignee;
    }, 201);
  }

  if (request.method === "GET" && apiPath === "/api/tags") {
    return respond(() =>
      tags.toSorted((left, right) => left.name.localeCompare(right.name)),
    );
  }
  if (request.method === "POST" && apiPath === "/api/tags") {
    const payload = (await request.json()) as { name?: string };
    return respond(() => {
      const name = payload.name?.trim();
      if (!name) throw new MockApiError("name is required", 400);
      if (tags.some((item) => item.name === name)) {
        throw new MockApiError(`Tag '${name}' already exists`, 409);
      }
      const tag = { id: crypto.randomUUID(), name };
      tags.push(tag);
      return tag;
    }, 201);
  }

  if (
    segments[0] === "api" &&
    segments[1] === "projects" &&
    segments[3] === "milestones" &&
    segments.length === 4
  ) {
    const projectId = segments[2];
    if (request.method === "GET") {
      return respond(() => {
        if (!findProject(projectId)) {
          throw new MockApiError("Unknown project", 404);
        }
        return milestones
          .filter((milestone) => milestone.projectId === projectId)
          .toSorted((left, right) => left.order - right.order)
          .map(milestoneToJson);
      });
    }
    if (request.method === "POST") {
      const payload = (await request.json()) as { title?: string };
      return respond(() => {
        if (!findProject(projectId)) {
          throw new MockApiError("Unknown project", 404);
        }
        const title = payload.title?.trim();
        if (!title) throw new MockApiError("title is required", 400);
        const order =
          milestones
            .filter((milestone) => milestone.projectId === projectId)
            .reduce((max, milestone) => Math.max(max, milestone.order), -1) + 1;
        const milestone = milestoneFromJson({
          id: crypto.randomUUID(),
          projectId,
          title,
          order,
        } satisfies MilestoneJson);
        milestones.push(milestone);
        return milestoneToJson(milestone);
      }, 201);
    }
  }

  return jsonError("Not found", 404);
}
