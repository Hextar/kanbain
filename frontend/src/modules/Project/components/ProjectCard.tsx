"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Sparkles, Trash } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import IconButton from "@uiKit/IconButton";
import type { Project } from "../types/Project";

const DEADLINE_LABELS: Record<Project["deadlineKind"], string> = {
  hard: "Hard deadline",
  nice_to_have: "Nice to have",
  ongoing: "Ongoing",
};

const CARD_CLASS =
  "flex h-full min-h-20 max-h-40 min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-zinc-800 p-5 pr-12 text-left";

type ProjectCardProps = {
  project: Project;
  onRetry?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  isRetrying?: boolean;
  isDeleting?: boolean;
};

function stopCardNavigation(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export default function ProjectCard({
  project,
  onRetry,
  onDelete,
  isRetrying = false,
  isDeleting = false,
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
      {onDelete ? (
        <div
          className="absolute top-3 right-3 z-20"
          onClick={stopCardNavigation}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <IconButton
            aria-label={`Delete ${project.name}`}
            className="bg-zinc-800"
            disabled={isDeleting}
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => onDelete(project.id)}
          >
            <Trash size={16} />
          </IconButton>
        </div>
      ) : null}
    </article>
  );
}
