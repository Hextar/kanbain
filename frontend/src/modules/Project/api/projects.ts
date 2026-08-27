import { cache } from "react";
import { apiFetch, isMockApi, readJson } from "@api/env";
import * as mockDb from "@api/mockDb";
import { projectFromJson, type ProjectJson } from "../helpers/projectJson";
import type { CreateProjectInput, Project } from "../types/Project";

const PROJECTS_URL = "/api/projects";

/** Next.js Flight encodes `undefined` action fields as this string. */
const FLIGHT_UNDEFINED = "$undefined";

function dropFlightUndefined<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) =>
      nested === FLIGHT_UNDEFINED ? undefined : nested,
    ),
  ) as T;
}

export async function getProjects(): Promise<Project[]> {
  if (typeof window === "undefined" && isMockApi()) return mockDb.listProjects();
  const response = await apiFetch(PROJECTS_URL);
  const payload = await readJson<ProjectJson[]>(
    response,
    "Failed to load projects",
  );
  return payload.map(projectFromJson);
}

export const getProject = cache(async (id: Project["id"]): Promise<Project> => {
  if (typeof window === "undefined" && isMockApi()) {
    const project = mockDb.findProject(id);
    if (!project) throw new Error(`Project ${id} not found`);
    return project;
  }
  const response = await apiFetch(`${PROJECTS_URL}/${id}`);
  const payload = await readJson<ProjectJson>(
    response,
    `Project ${id} not found`,
  );
  return projectFromJson(payload);
});

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const payload = dropFlightUndefined(input);
  if (isMockApi()) {
    return mockDb.insertProject(payload);
  }
  return projectFromJson(
    await readJson<ProjectJson>(
      await apiFetch(PROJECTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      "Failed to create project",
    ),
  );
}

export async function retryProjectPlan(id: Project["id"]): Promise<Project> {
  if (typeof window === "undefined" && isMockApi()) {
    return mockDb.enqueuePlan(id);
  }
  const response = await apiFetch(`${PROJECTS_URL}/${id}/plan`, {
    method: "POST",
  });
  return projectFromJson(
    await readJson<ProjectJson>(response, "Failed to retry planning"),
  );
}

export async function updateProject(project: Project): Promise<Project> {
  if (isMockApi()) {
    return mockDb.updateProject(project.id, { name: project.name });
  }
  const response = await apiFetch(`${PROJECTS_URL}/${project.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: project.name }),
  });
  const payload = await readJson<ProjectJson>(
    response,
    "Failed to update project",
  );
  return projectFromJson(payload);
}

export async function deleteProject(id: Project["id"]): Promise<void> {
  if (isMockApi()) {
    mockDb.deleteProject(id);
    return;
  }
  const response = await apiFetch(`${PROJECTS_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete project ${id}`);
  }
}
