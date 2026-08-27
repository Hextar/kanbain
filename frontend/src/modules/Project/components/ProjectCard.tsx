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

const CARD_CLASS =
  "flex h-full min-h-20 max-h-40 min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-zinc-800 p-5 text-left";

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
  const isPlanning = project.planStatus === "planning";
  const isFailed = project.planStatus === "failed";
  const summary = (project.goal ?? project.description ?? "").trim();

  const body = (
    <>
      <div className="flex min-w-0 items-start gap-2">
        <h2 className="min-w-0 flex-1 truncate text-xl font-semibold text-white">
          {project.name}
        </h2>
        {isPlanning ? (
          <Sparkles
            aria-hidden
            className="mt-0.5 shrink-0 text-purple-300"
            size={20}
          />
        ) : null}
      </div>
      {summary ? (
        <p
          className="line-clamp-2 min-w-0 overflow-hidden text-sm break-words text-zinc-400"
          title={summary}
        >
          {summary}
        </p>
      ) : null}
      <div className="mt-auto flex shrink-0 flex-col gap-2">
        <p className="text-sm text-zinc-400">
          {methodologyLabel}
          {" · "}
          {DEADLINE_LABELS[project.deadlineKind]}
          {createdLabel ? ` · ${createdLabel}` : ""}
        </p>
        {isPlanning ? (
          <p className="text-sm text-purple-300">Planning board…</p>
        ) : null}
        {isFailed ? (
          <>
            <p className="line-clamp-2 text-sm text-red-400">
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
          </>
        ) : null}
      </div>
    </>
  );

  return (
    <article className="relative h-full min-w-0">
      {isPlanning || isFailed ? (
        <div
          aria-busy={isPlanning || undefined}
          aria-disabled={isPlanning || undefined}
          className={twMerge(
            CARD_CLASS,
            isPlanning &&
              "plan-shimmer pointer-events-none border-purple-500/40",
            isFailed && "border-red-500/40",
          )}
          role={isPlanning ? "status" : undefined}
        >
          {body}
        </div>
      ) : (
        <Link
          className={twMerge(
            CARD_CLASS,
            "border-zinc-700 transition-colors hover:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
          )}
          href={`/project/${project.id}`}
        >
          {body}
        </Link>
      )}
    </article>
  );
}
