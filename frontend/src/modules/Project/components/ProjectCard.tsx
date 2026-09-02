"use client";

import type { MouseEvent } from "react";
import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CircleAlert, RotateCw, Sparkles, Trash } from "lucide-react";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import Tooltip from "@uiKit/Tooltip";
import Avatar, { AvatarStack } from "@uiKit/Avatar";
import Badge from "@uiKit/Badge";
import Card, { cardClassName } from "@uiKit/Card";
import ProgressBar from "@uiKit/ProgressBar";
import {
  consumeSpawn,
  isSpawnPending,
  releaseSpawn,
} from "@libraries/particles";
import type { Project } from "../types/Project";
import { usePlanLive } from "../hooks/usePlanLive";
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

export default function ProjectCard({
  project,
  onRetry,
  onDelete,
  isRetrying = false,
  isDeleting = false,
  isOpening = false,
}: ProjectCardProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { accent, Icon } = projectIdentity(project.id);
  const initials = projectInitials(project.name);
  const createdLabel = project.createdAt
    ? format(project.createdAt, "d MMM yyyy")
    : null;
  const methodologyLabel = project.methodology === "scrum" ? "Scrum" : "Kanban";
  const isPlanning = project.planStatus === "planning" || isOpening;
  const isFailed = project.planStatus === "failed";
  const canOpen = project.planStatus === "ready" && !isOpening;
  const live = usePlanLive(project, project.planStatus === "planning");
  const progressPercent = Math.round(
    Math.min(1, Math.max(0, live.progress)) * 100,
  );
  const taskCount = Math.max(0, project.taskCount);
  const completedCount = Math.min(
    taskCount,
    Math.max(0, project.completedCount),
  );
  const completionPercent =
    taskCount === 0 ? 0 : Math.round((completedCount / taskCount) * 100);
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

  useLayoutEffect(() => {
    const node = rootRef.current;
    consumeSpawn(project.id, node);
    return () => releaseSpawn(node);
  }, [project.id]);

  const body = (
    <>
      {isPlanning && !isOpening ? (
        <ProgressBar
          barClassName="bg-gradient-to-r from-violet-400 to-purple-600"
          label="Planning progress"
          percent={progressPercent}
          trackClassName="bg-purple-950"
          variant="flush"
        />
      ) : (
        <ProgressBar
          barClassName={accent.bar}
          label={
            taskCount === 0
              ? "No tasks yet"
              : `${completedCount} of ${taskCount} tasks completed`
          }
          percent={completionPercent}
          trackClassName={twMerge(accent.bar, "opacity-20")}
          variant="flush"
        />
      )}
      <div
        aria-hidden
        className={twMerge(
          "light-orb pointer-events-none absolute -top-16 -right-6 size-44 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          accent.glow,
        )}
      />
      <div className="flex items-start gap-3">
        <Avatar className={accent.tile} initials={initials} size="md">
          <Icon
            aria-hidden
            className="absolute size-9 opacity-25"
            strokeWidth={1.5}
          />
        </Avatar>
        <div className={twMerge("min-w-0 flex-1", titlePad)}>
          <h2 className="min-w-0 truncate text-lg font-semibold text-white">
            {project.name}
          </h2>
          <p
            aria-live={isPlanning && !isOpening ? "polite" : undefined}
            className={twMerge(
              "mt-1 line-clamp-2 min-h-10 min-w-0 text-sm leading-5 break-words",
              isPlanning && !isOpening ? "text-purple-200/90" : "text-zinc-400",
            )}
            title={isPlanning && !isOpening ? undefined : summary || undefined}
          >
            {isPlanning && !isOpening ? live.message : summary || "\u00a0"}
          </p>
        </div>
      </div>
      <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5 pt-4">
        {isFailed ? <Badge tone="danger">Failed</Badge> : null}
        <Badge tone="muted">{methodologyLabel}</Badge>
        <Badge tone="muted">{DEADLINE_LABELS[project.deadlineKind]}</Badge>
        {createdLabel ? <Badge tone="muted">{createdLabel}</Badge> : null}
        {members.length > 0 ? (
          <AvatarStack className="ml-auto" extra={extraMembers}>
            {members.slice(0, VISIBLE_MEMBERS).map((member, index) => (
              <Tooltip
                key={member.id}
                content={member.name}
                wrapperClassName={index === 0 ? undefined : "-ml-1.5"}
              >
                <Avatar
                  className={twMerge(
                    "ring-2 ring-[#181b24]",
                    memberAccent(member.id),
                  )}
                  initials={projectInitials(member.name)}
                />
              </Tooltip>
            ))}
          </AvatarStack>
        ) : null}
      </div>
    </>
  );

  const surfaceClassName = twMerge(
    cardClassName("md"),
    "relative flex h-full min-w-0 flex-col overflow-hidden pt-4 text-left",
    canOpen &&
      `transition-colors ${accent.hoverBorder} focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none`,
    isPlanning && "plan-shimmer pointer-events-none border-purple-500/40",
    isFailed && "border-red-500/40",
  );

  return (
    <article
      ref={rootRef}
      className="relative flex h-full min-w-0 flex-col hover:z-10"
      data-project-id={project.id}
      data-spawning={isSpawnPending(project.id) ? "" : undefined}
    >
      {canOpen ? (
        <Link
          className={surfaceClassName}
          data-light-edge=""
          href={`/project/${project.id}`}
        >
          {body}
        </Link>
      ) : (
        <Card
          aria-busy={isPlanning || undefined}
          aria-disabled={isPlanning || undefined}
          className={surfaceClassName}
          role={isPlanning ? "status" : undefined}
          size="md"
        >
          {body}
        </Card>
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
