"use server";

import { revalidatePath } from "next/cache";
import { createProject } from "@modules/Project/api/projects";
import type { CreateProjectInput, Project } from "@modules/Project/types/Project";

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<Project> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new Error("name is required");
  }
  const project = await createProject({ ...input, name: trimmed });
  revalidatePath("/");
  return project;
}
