"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ChevronRight, MessageSquare, Paperclip } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useHtml5Drag } from "@libraries/dnd/useHtml5Drag";
import Tooltip from "@uiKit/Tooltip";
import type { DropPlaceholder } from "@libraries/dnd/html5DnD";
import { TASK_DRAG_MIME, type TaskDragPayload } from "../constants";
import { useAssignees, useMilestones } from "../hooks/useCatalog";
import { compactTaskKey } from "../helpers/taskKey";
import { milestoneLabel } from "../helpers/milestoneLabel";
import {
  ESTIMATE_STYLE,
  labeledPriority,
  PILL_CLASS_NAME,
  PRIORITY_STYLES,
  WORK_KIND_STYLES,
} from "../helpers/taskBadges";
import type { Task, TaskItem } from "../types/Task";
import CollapsibleSlot from "./CollapsibleSlot";
import FlipItem from "./FlipItem";
import DropLine from "./DropLine";
import NestedTaskRow from "./NestedTaskRow";
import TaskCardFrame from "./TaskCardFrame";

type TaskCardProps = {
  task: TaskItem;
  nested: TaskItem[];
  projectId: string;
  accentBar?: string;
  doneCount?: number;
  childCount?: number;
  nestActive?: boolean;
  nestedPlaceholder?: DropPlaceholder | null;
  selectedTaskId?: string;
  onOpen: (task: Task) => void;
};

function compactAgo(date: Date): string {
  const delta = Date.now() - date.getTime();
  if (!Number.isFinite(delta) || delta < 45_000) return "just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  return format(date, "yyyy-MM-dd");
}

function Badge({
  tooltip,
  className,
  children,
}: {
  tooltip: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip content={tooltip}>
      <span className={twMerge(PILL_CLASS_NAME, className)}>{children}</span>
    </Tooltip>
  );
}

export default function TaskCard({
  task,
  nested,
  projectId,
  accentBar,
  doneCount = 0,
  childCount = 0,
  nestActive = false,
  nestedPlaceholder = null,
  selectedTaskId,
  onOpen,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const skipClickRef = useRef(false);
  const { data: assignees = [] } = useAssignees();
  const { data: milestones = [] } = useMilestones(projectId);
  const showNested = nested.length > 0;
  const keyLabel = compactTaskKey(task);
  const summary = task.description?.trim();
  const stamp = task.updatedAt ?? task.createdAt;
  const commentCount = task.comments?.length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  const handleDragStart = useCallback(() => {
    skipClickRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
  }, []);

  const { isDragging, dragProps } = useHtml5Drag<TaskDragPayload>({
    mimeType: TASK_DRAG_MIME,
    data: { taskId: task.id, sourceColumnId: task.columnId },
    disabled: Boolean(task.isSaving),
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  const assigneeName = assignees.find(
    (assignee) => assignee.id === task.assigneeId,
  )?.name;
  const milestone = milestones.find((item) => item.id === task.milestoneId);
  const milestoneName = milestone
    ? milestoneLabel(milestone, milestones)
    : null;

  return (
    <article
      {...dragProps}
      data-dnd-column-card=""
      data-dnd-item=""
      data-task-id={task.id}
      className={twMerge("relative w-full min-w-0", isDragging && "opacity-50")}
    >
      <TaskCardFrame
        className={twMerge(
          "relative flex min-h-2 flex-col transition-colors hover:border-zinc-500/70",
          task.isSaving && "opacity-70",
          nestActive && "border-purple-400",
          selectedTaskId === task.id && "border-purple-500",
        )}
      >
        {accentBar ? (
          <div
            aria-hidden
            className={twMerge(
              "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-lg",
              accentBar,
            )}
          />
        ) : null}
        <div
          className="flex flex-col gap-1.5"
          data-dnd-nest-zone=""
          data-task-id={task.id}
        >
          <button
            className={twMerge(
              "w-full min-w-0 text-left select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            disabled={task.isSaving}
            draggable={dragProps.draggable}
            type="button"
            onClick={() => {
              if (skipClickRef.current) return;
              onOpen(task);
            }}
            onDragStart={dragProps.onDragStart}
            onDragEnd={dragProps.onDragEnd}
          >
            <div className="flex flex-wrap items-center gap-1">
              {keyLabel ? (
                <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-500">
                  {keyLabel}
                </span>
              ) : null}
              {task.priority ? (
                <Badge
                  className={twMerge(
                    "uppercase",
                    PRIORITY_STYLES[task.priority],
                  )}
                  tooltip={labeledPriority(task.priority)}
                >
                  {task.priority}
                </Badge>
              ) : null}
              {task.estimateTshirt ? (
                <Badge
                  className={ESTIMATE_STYLE}
                  tooltip={`Complexity: ${task.estimateTshirt.toUpperCase()}`}
                >
                  {task.estimateTshirt}
                </Badge>
              ) : null}
              {task.workKind && task.workKind !== "task" ? (
                <Badge
                  className={twMerge(
                    "capitalize",
                    WORK_KIND_STYLES[task.workKind],
                  )}
                  tooltip={`Type: ${task.workKind}`}
                >
                  {task.workKind}
                </Badge>
              ) : null}
              {task.isSaving ? (
                <span className="text-[11px] text-zinc-500">Saving…</span>
              ) : null}
            </div>
            <h3 className="mt-1.5">
              <Tooltip
                align="start"
                className="max-w-xs"
                content={task.title}
                wrapperClassName="min-w-0 w-full"
              >
                <span className="line-clamp-2 text-sm leading-snug font-semibold text-zinc-50">
                  {task.title}
                </span>
              </Tooltip>
            </h3>
            {summary ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-zinc-500">
                {summary}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {assigneeName ? (
                <Badge
                  className="bg-zinc-800 text-zinc-200"
                  tooltip={`Assignee: ${assigneeName}`}
                >
                  {assigneeName}
                </Badge>
              ) : null}
              {milestoneName ? (
                <Badge
                  className="bg-zinc-800 text-zinc-400"
                  tooltip={`Milestone: ${milestoneName}`}
                >
                  {milestoneName}
                </Badge>
              ) : null}
              {task.dueDate ? (
                <Badge
                  className="bg-amber-500/10 text-amber-200"
                  tooltip={`Due ${format(task.dueDate, "d MMM yyyy")}`}
                >
                  {format(task.dueDate, "MMM d")}
                </Badge>
              ) : null}
              {stamp ? (
                <Tooltip
                  content={`Last updated ${format(stamp, "d MMM yyyy 'at' HH:mm")}`}
                >
                  <span
                    className="text-[11px] text-zinc-500"
                    suppressHydrationWarning
                  >
                    {compactAgo(stamp)}
                  </span>
                </Tooltip>
              ) : null}
              {childCount > 0 ? (
                <Badge
                  className="bg-zinc-800 text-zinc-400"
                  tooltip={`Progress: ${doneCount}/${childCount} done`}
                >
                  {doneCount}/{childCount}
                </Badge>
              ) : null}
              {commentCount > 0 ? (
                <Badge
                  className="inline-flex items-center gap-0.5 text-zinc-400"
                  tooltip={
                    commentCount === 1
                      ? "1 comment"
                      : `${commentCount} comments`
                  }
                >
                  <MessageSquare aria-hidden size={10} />
                  {commentCount}
                </Badge>
              ) : null}
              {attachmentCount > 0 ? (
                <Badge
                  className="inline-flex items-center gap-0.5 text-zinc-400"
                  tooltip={
                    attachmentCount === 1
                      ? "1 attachment"
                      : `${attachmentCount} attachments`
                  }
                >
                  <Paperclip aria-hidden size={10} />
                  {attachmentCount}
                </Badge>
              ) : null}
            </div>
            {task.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="rounded px-1.5 text-zinc-400 ring-1 ring-zinc-600/80"
                    tooltip={`Tag: ${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </button>
          {showNested ? (
            <button
              className="inline-flex cursor-pointer items-center gap-1 self-start text-[11px] text-zinc-500 hover:text-zinc-200"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((current) => !current);
              }}
            >
              <ChevronRight
                size={12}
                className={twMerge(
                  "size-3 shrink-0 transition-transform",
                  expanded && "rotate-90",
                )}
              />
              {childCount} {childCount === 1 ? "subtask" : "subtasks"}
            </button>
          ) : null}
        </div>
        <CollapsibleSlot present={showNested && expanded}>
          <div className="flex pt-2">
            <div className="flex w-3 shrink-0 justify-center">
              <div className="w-px self-stretch bg-zinc-700" />
            </div>
            <div
              className="relative flex min-w-0 flex-1 flex-col gap-2 pl-2"
              data-dnd-nested-list={showNested && expanded ? "" : undefined}
              data-parent-id={showNested && expanded ? task.id : undefined}
            >
              {nestedPlaceholder?.index === nested.length ? (
                <DropLine atEnd />
              ) : null}
              {nested.map((child, liveIndex) => (
                <FlipItem key={child.id}>
                  <div className="relative">
                    {nestedPlaceholder?.index === liveIndex ? (
                      <DropLine atStart={liveIndex === 0} />
                    ) : null}
                    <NestedTaskRow
                      selected={selectedTaskId === child.id}
                      task={child}
                      onOpen={onOpen}
                    />
                  </div>
                </FlipItem>
              ))}
            </div>
          </div>
        </CollapsibleSlot>
      </TaskCardFrame>
    </article>
  );
}
