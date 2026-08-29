"use client";

import { useId, type MouseEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CircleAlert, RotateCw, Sparkles, Trash } from "lucide-react";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import type { Project } from "../types/Project";

const DEADLINE_LABELS: Record<Project["deadlineKind"], string> = {
  hard: "Hard deadline",
  nice_to_have: "Nice to have",
  ongoing: "Ongoing",
};

const ICON_SIZE = 16;

const CARD_CLASS =
  "flex h-full min-h-20 max-h-40 min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-zinc-800 p-5 text-left";

type ProjectCardProps = {
  project: Project;
  onRetry?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  isRetrying?: boolean;
  isDeleting?: boolean;
  isOpening?: boolean;
};

function stopCardNavigation(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function PlanErrorIcon({ message }: { message: string }) {
  const tooltipId = useId();

  return (
    <span className="group/error relative inline-flex">
      <button
        aria-describedby={tooltipId}
        aria-label="Planning error"
        className="inline-flex size-7 cursor-help items-center justify-center rounded-md text-red-400 hover:bg-red-500/15 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
        type="button"
      >
        <CircleAlert aria-hidden size={ICON_SIZE} />
      </button>
      <span
        className="pointer-events-none absolute top-full right-0 z-30 mt-1.5 w-56 rounded-md bg-zinc-950 px-2.5 py-1.5 text-left text-xs leading-5 break-words text-zinc-100 opacity-0 shadow-lg ring-1 ring-zinc-700 transition-opacity group-hover/error:opacity-100 group-focus-within/error:opacity-100"
        id={tooltipId}
        role="tooltip"
      >
        {message}
      </span>
    </span>
  );
}

export default function ProjectCard({
  project,
  onRetry,
  onDelete,
  isRetrying = false,
  isDeleting = false,
  isOpening = false,
}: ProjectCardProps) {
  const createdLabel = project.createdAt
    ? format(project.createdAt, "d MMM yyyy")
    : null;
  const methodologyLabel = project.methodology === "scrum" ? "Scrum" : "Kanban";
  const isPlanning = project.planStatus === "planning" || isOpening;
  const isFailed = project.planStatus === "failed";
  const canOpen = project.planStatus === "ready" && !isOpening;
  const summary = (project.goal ?? project.description ?? "").trim();
  const errorMessage = project.planError ?? "Planning failed.";
  const actionCount =
    Number(isFailed) +
    Number(isPlanning) +
    Number(Boolean(isFailed && onRetry)) +
    Number(Boolean(onDelete));
  const cardPad =
    actionCount >= 3 ? "pr-30" : actionCount === 2 ? "pr-22" : "pr-14";

  const body = (
    <>
      <h2 className="min-w-0 truncate text-xl leading-7 font-semibold text-white">
        {project.name}
      </h2>
      {isPlanning ? (
        <span className="sr-only">
          {isOpening ? "Opening board" : "Planning board"}
        </span>
      ) : null}
      <p
        className="line-clamp-2 min-h-10 min-w-0 overflow-hidden text-sm break-words text-zinc-400"
        title={summary || undefined}
      >
        {summary || "\u00a0"}
      </p>
      <p className="mt-auto text-sm text-zinc-400">
        {methodologyLabel}
        {" · "}
        {DEADLINE_LABELS[project.deadlineKind]}
        {createdLabel ? ` · ${createdLabel}` : ""}
      </p>
    </>
  );

  return (
    <article className="relative h-full min-w-0 hover:z-10">
      {canOpen ? (
        <Link
          className={twMerge(
            CARD_CLASS,
            cardPad,
            "border-zinc-700 transition-colors hover:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
          )}
          href={`/project/${project.id}`}
        >
          {body}
        </Link>
      ) : (
        <div
          aria-busy={isPlanning || undefined}
          aria-disabled={isPlanning || undefined}
          className={twMerge(
            CARD_CLASS,
            cardPad,
            isPlanning &&
              "plan-shimmer pointer-events-none border-purple-500/40",
            isFailed && "border-red-500/40",
          )}
          role={isPlanning ? "status" : undefined}
        >
          {body}
        </div>
      )}
      <div
        className="absolute top-5 right-5 z-20 flex items-center gap-1"
        onClick={stopCardNavigation}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isFailed ? <PlanErrorIcon message={errorMessage} /> : null}
        {isPlanning ? (
          <span className="inline-flex size-7 items-center justify-center text-purple-300">
            <Sparkles aria-hidden size={ICON_SIZE} />
          </span>
        ) : null}
        {isFailed && onRetry ? (
          <IconButton
            aria-label={isRetrying ? "Retrying planning" : "Retry planning"}
            className="bg-zinc-800"
            disabled={isRetrying}
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => onRetry(project.id)}
          >
            <RotateCw
              className={isRetrying ? "animate-spin" : undefined}
              size={ICON_SIZE}
            />
          </IconButton>
        ) : null}
        {onDelete ? (
          <IconButton
            aria-label={`Delete ${project.name}`}
            className="bg-zinc-800"
            disabled={isDeleting}
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => onDelete(project.id)}
          >
            <Trash size={ICON_SIZE} />
          </IconButton>
        ) : null}
      </div>
    </article>
  );
}
