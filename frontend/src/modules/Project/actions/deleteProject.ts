"use server";

import { revalidatePath } from "next/cache";
import { deleteProject } from "@modules/Project/api/projects";

export async function deleteProjectAction(projectId: string): Promise<void> {
  await deleteProject(projectId);
  revalidatePath("/");
  revalidatePath(`/project/${projectId}`);
}
