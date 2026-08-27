"use server";

import { revalidatePath } from "next/cache";
import { retryProjectPlan } from "@modules/Project/api/projects";
import type { Project } from "@modules/Project/types/Project";

export async function retryProjectPlanAction(
  projectId: string,
): Promise<Project> {
  const project = await retryProjectPlan(projectId);
  revalidatePath("/");
  revalidatePath(`/project/${projectId}`);
  return project;
}
