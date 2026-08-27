import { projectFromJson, type ProjectJson } from "../helpers/projectJson";
import type { Project } from "../types/Project";

async function readProject(response: Response, errorMessage: string): Promise<Project> {
  if (!response.ok) throw new Error(errorMessage);
  return projectFromJson((await response.json()) as ProjectJson);
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load projects");
  const payload = (await response.json()) as ProjectJson[];
  return payload.map(projectFromJson);
}

export async function fetchProject(id: string): Promise<Project> {
  return readProject(
    await fetch(`/api/projects/${id}`, { cache: "no-store" }),
    `Project ${id} not found`,
  );
}
