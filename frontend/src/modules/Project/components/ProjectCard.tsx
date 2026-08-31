"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CircleAlert, RotateCw, Sparkles, Trash } from "lucide-react";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import Tooltip from "@uiKit/Tooltip";
import type { Project } from "../types/Project";
import {
  memberAccent,
  projectIdentity,
  projectInitials,
} from "../helpers/projectIdentity";

const DEADLINE_LABELS: Record<Project["deadlineKind"], string> = {
  hard: "Hard deadline",
  nice_to_have: "Nice to have",
  ongoing: "Ongoing",
};

const ICON_SIZE = 16;
const VISIBLE_MEMBERS = 3;

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
  return (
    <Tooltip align="end" className="w-56" content={message}>
      <button
        aria-label="Planning error"
        className="inline-flex size-7 cursor-help items-center justify-center rounded-md text-red-400 hover:bg-red-500/15 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
        type="button"
      >
        <CircleAlert aria-hidden size={ICON_SIZE} />
      </button>
    </Tooltip>
  );
}

function MetaPill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-400 ring-1 ring-white/6">
      {children}
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
  const { accent, Icon } = projectIdentity(project.id);
  const initials = projectInitials(project.name);
  const createdLabel = project.createdAt
    ? format(project.createdAt, "d MMM yyyy")
    : null;
  const methodologyLabel = project.methodology === "scrum" ? "Scrum" : "Kanban";
  const isPlanning = project.planStatus === "planning" || isOpening;
  const isFailed = project.planStatus === "failed";
  const canOpen = project.planStatus === "ready" && !isOpening;
  const summary = (project.goal ?? project.description ?? "").trim();
  const errorMessage = project.planError ?? "Planning failed.";
  const members = project.members ?? [];
  const extraMembers = Math.max(0, members.length - VISIBLE_MEMBERS);
  const actionCount =
    Number(isFailed) +
    Number(isPlanning) +
    Number(Boolean(isFailed && onRetry)) +
    Number(Boolean(onDelete));
  const titlePad =
    actionCount >= 3 ? "pr-28" : actionCount === 2 ? "pr-20" : "pr-12";

  const body = (
    <>
      <div className={twMerge("absolute inset-x-0 top-0 h-0.5", accent.bar)} />
      <div
        aria-hidden
        className={twMerge(
          "pointer-events-none absolute -top-16 -right-6 size-44 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          accent.glow,
        )}
      />
      <div className="flex items-start gap-3">
        <div
          className={twMerge(
            "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
            accent.tile,
          )}
        >
          <Icon
            aria-hidden
            className="absolute size-9 opacity-25"
            strokeWidth={1.5}
          />
          <span className="relative text-sm font-semibold tracking-wide">
            {initials}
          </span>
        </div>
        <div className={twMerge("min-w-0 flex-1", titlePad)}>
          <h2 className="min-w-0 truncate text-lg font-semibold text-white">
            {project.name}
          </h2>
          {isPlanning ? (
            <span className="sr-only">
              {isOpening ? "Opening board" : "Planning board"}
            </span>
          ) : null}
          <p
            className="mt-1 line-clamp-2 min-h-10 min-w-0 text-sm leading-5 break-words text-zinc-400"
            title={summary || undefined}
          >
            {summary || "\u00a0"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5">
        {isPlanning ? (
          <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] text-purple-300">
            Planning
          </span>
        ) : null}
        {isFailed ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300">
            Failed
          </span>
        ) : null}
        <MetaPill>{methodologyLabel}</MetaPill>
        <MetaPill>{DEADLINE_LABELS[project.deadlineKind]}</MetaPill>
        {createdLabel ? <MetaPill>{createdLabel}</MetaPill> : null}
        {members.length > 0 ? (
          <span className="ml-auto inline-flex items-center pl-1">
            {members.slice(0, VISIBLE_MEMBERS).map((member, index) => (
              <Tooltip
                key={member.id}
                content={member.name}
                wrapperClassName={index === 0 ? undefined : "-ml-1.5"}
              >
                <span
                  className={twMerge(
                    "inline-flex size-6 items-center justify-center rounded-full text-[10px] font-medium ring-2 ring-[#181b24]",
                    memberAccent(member.id),
                  )}
                >
                  {projectInitials(member.name)}
                </span>
              </Tooltip>
            ))}
            {extraMembers > 0 ? (
              <span className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-400 ring-2 ring-[#181b24]">
                +{extraMembers}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </>
  );

  const cardClassName = twMerge(
    "relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/6 bg-[#181b24] p-5 pt-4 text-left",
    canOpen &&
      `transition-colors ${accent.hoverBorder} focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none`,
    isPlanning && "plan-shimmer pointer-events-none border-purple-500/40",
    isFailed && "border-red-500/40",
  );

  return (
    <article className="relative h-full min-w-0 hover:z-10">
      {canOpen ? (
        <Link className={cardClassName} href={`/project/${project.id}`}>
          {body}
        </Link>
      ) : (
        <div
          aria-busy={isPlanning || undefined}
          aria-disabled={isPlanning || undefined}
          className={cardClassName}
          role={isPlanning ? "status" : undefined}
        >
          {body}
        </div>
      )}
      <div
        className="absolute top-4 right-4 z-20 flex items-center gap-1"
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
            disabled={isDeleting}
            size="xs"
            type="button"
            kind="ghost"
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
