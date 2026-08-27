"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import type { Project } from "../types/Project";

const DEADLINE_LABELS: Record<Project["deadlineKind"], string> = {
  hard: "Hard deadline",
  nice_to_have: "Nice to have",
  ongoing: "Ongoing",
};

type ProjectCardProps = {
  project: Project;
  onRetry?: (projectId: string) => void;
  isRetrying?: boolean;
};

export default function ProjectCard({
  project,
  onRetry,
  isRetrying = false,
}: ProjectCardProps) {
  const createdLabel = project.createdAt
    ? format(project.createdAt, "d MMM yyyy")
    : null;
  const methodologyLabel = project.methodology === "scrum" ? "Scrum" : "Kanban";
  const meta = (
    <p className="text-sm text-zinc-400">
      {methodologyLabel}
      {" · "}
      {DEADLINE_LABELS[project.deadlineKind]}
      {createdLabel ? ` · ${createdLabel}` : ""}
    </p>
  );

  if (project.planStatus === "planning") {
    return (
      <div
        aria-busy="true"
        aria-disabled="true"
        className="plan-shimmer pointer-events-none flex flex-col gap-3 rounded-xl border border-purple-500/40 bg-zinc-800 p-5 text-left"
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">{project.name}</h2>
          <Sparkles aria-hidden className="shrink-0 text-purple-300" size={20} />
        </div>
        {project.goal ? (
          <p className="line-clamp-2 text-sm text-zinc-400">{project.goal}</p>
        ) : null}
        {meta}
        <p className="text-sm text-purple-300">Planning board…</p>
      </div>
    );
  }

  if (project.planStatus === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-zinc-800 p-5 text-left">
        <h2 className="text-xl font-semibold text-white">{project.name}</h2>
        {project.goal ? (
          <p className="line-clamp-2 text-sm text-zinc-400">{project.goal}</p>
        ) : null}
        {meta}
        <p className="text-sm text-red-400">
          {project.planError ?? "Planning failed."}
        </p>
        {onRetry ? (
          <Button
            disabled={isRetrying}
            size="sm"
            type="button"
            onClick={() => onRetry(project.id)}
          >
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      className={twMerge(
        "flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-800 p-5 text-left transition-colors hover:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
      )}
      href={`/project/${project.id}`}
    >
      <h2 className="text-xl font-semibold text-white">{project.name}</h2>
      {project.goal ? (
        <p className="line-clamp-2 text-sm text-zinc-400">{project.goal}</p>
      ) : null}
      {meta}
    </Link>
  );
}
