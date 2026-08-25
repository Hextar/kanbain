import { cache } from "react";
import { apiFetch, isMockApi, readJson } from "@/api/env";
import * as mockDb from "@/api/mockDb";
import { createColumn } from "@/Task/api/columns";
import { projectFromJson, type ProjectJson } from "../helpers/projectJson";
import type { CreateProjectInput, Project } from "../types/Project";

const PROJECTS_URL = "/api/projects";
const DEFAULT_BOARD_COLUMNS = ["To Do", "In Progress", "Done"] as const;

export async function getProjects(): Promise<Project[]> {
  if (isMockApi()) return mockDb.listProjects();
  const response = await apiFetch(PROJECTS_URL);
  const payload = await readJson<ProjectJson[]>(
    response,
    "Failed to load projects",
  );
  return payload.map(projectFromJson);
}

export const getProject = cache(async (id: Project["id"]): Promise<Project> => {
  if (isMockApi()) {
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
  const project = isMockApi()
    ? mockDb.insertProject(input)
    : projectFromJson(
        await readJson<ProjectJson>(
          await apiFetch(PROJECTS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }),
          "Failed to create project",
        ),
      );

  for (const title of DEFAULT_BOARD_COLUMNS) {
    if (isMockApi()) {
      mockDb.insertColumn({ title, projectId: project.id });
    } else {
      await createColumn({ title, projectId: project.id });
    }
  }

  return project;
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
