"use server";

import { revalidatePath } from "next/cache";
import { createProject } from "@modules/Project/api/projects";
import type { CreateProjectInput, Project } from "@modules/Project/types/Project";

/** Next.js Flight encodes `undefined` action fields as this string. */
const FLIGHT_UNDEFINED = "$undefined";

function dropFlightUndefined<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) =>
      nested === FLIGHT_UNDEFINED ? undefined : nested,
    ),
  ) as T;
}

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<Project> {
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new Error("name is required");
  }
  const project = await createProject(
    dropFlightUndefined({ ...input, name: trimmed }),
  );
  revalidatePath("/");
  return project;
}
