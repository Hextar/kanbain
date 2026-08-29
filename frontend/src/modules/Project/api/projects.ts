import { cache } from "react";
import { apiFetch, expectOk, readJson } from "@api/env";
import { projectFromJson, type ProjectJson } from "../helpers/projectJson";
import type { CreateProjectInput, Project } from "../types/Project";

const PROJECTS_URL = "/api/projects";

export async function getProjects(): Promise<Project[]> {
  const payload = await readJson<ProjectJson[]>(
    await apiFetch(PROJECTS_URL),
    "Failed to load projects",
  );
  return payload.map(projectFromJson);
}

export const getProject = cache(async (id: Project["id"]): Promise<Project> => {
  const payload = await readJson<ProjectJson>(
    await apiFetch(`${PROJECTS_URL}/${id}`),
    `Project ${id} not found`,
  );
  return projectFromJson(payload);
});

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const payload = await readJson<ProjectJson>(
    await apiFetch(PROJECTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    "Failed to create project",
  );
  return projectFromJson(payload);
}

export async function retryProjectPlan(id: Project["id"]): Promise<Project> {
  const payload = await readJson<ProjectJson>(
    await apiFetch(`${PROJECTS_URL}/${id}/plan`, { method: "POST" }),
    "Failed to retry planning",
  );
  return projectFromJson(payload);
}

export async function updateProject(project: Project): Promise<Project> {
  const payload = await readJson<ProjectJson>(
    await apiFetch(`${PROJECTS_URL}/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: project.name }),
    }),
    "Failed to update project",
  );
  return projectFromJson(payload);
}

export async function deleteProject(id: Project["id"]): Promise<void> {
  await expectOk(
    await apiFetch(`${PROJECTS_URL}/${id}`, { method: "DELETE" }),
    `Failed to delete project ${id}`,
  );
}
