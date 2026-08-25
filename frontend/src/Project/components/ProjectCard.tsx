import Link from "next/link";
import { format } from "date-fns";
import type { Project } from "../types/Project";

const DEADLINE_LABELS: Record<Project["deadlineKind"], string> = {
  hard: "Hard deadline",
  nice_to_have: "Nice to have",
  ongoing: "Ongoing",
};

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const createdLabel = project.createdAt
    ? format(project.createdAt, "d MMM yyyy")
    : null;
  const methodologyLabel = project.methodology === "scrum" ? "Scrum" : "Kanban";

  return (
    <Link
      className="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-left transition-colors hover:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
      href={`/project/${project.id}`}
    >
      <h2 className="text-xl font-semibold text-white">{project.name}</h2>
      {project.goal ? (
        <p className="line-clamp-2 text-sm text-zinc-400">{project.goal}</p>
      ) : null}
      <p className="text-sm text-zinc-400">
        {methodologyLabel}
        {" · "}
        {DEADLINE_LABELS[project.deadlineKind]}
        {createdLabel ? ` · ${createdLabel}` : ""}
      </p>
    </Link>
  );
}
