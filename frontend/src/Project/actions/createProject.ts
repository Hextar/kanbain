"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProject } from "@/Project/api/projects";

export async function createProjectAction(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("name is required");
  }

  const project = await createProject({ name: trimmed });
  revalidatePath("/");
  redirect(`/project/${project.id}`);
}
