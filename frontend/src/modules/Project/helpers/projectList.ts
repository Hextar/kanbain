import type { Project } from "../types/Project";

export function keepProjectListOrder(
  current: Project[] | undefined,
  incoming: Project[],
): Project[] {
  if (!current?.length) return incoming;

  const incomingById = new Map(incoming.map((project) => [project.id, project]));
  const kept: Project[] = [];
  for (const project of current) {
    const next = incomingById.get(project.id);
    if (!next) continue;
    kept.push(next);
    incomingById.delete(project.id);
  }
  return [...incomingById.values(), ...kept];
}
