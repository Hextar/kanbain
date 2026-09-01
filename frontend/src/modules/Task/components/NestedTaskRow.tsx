"use client";

import { useCallback, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useHtml5Drag } from "@libraries/dnd/useHtml5Drag";
import { TASK_DRAG_MIME, type TaskDragPayload } from "../constants";
import { useAssignees } from "../hooks/useCatalog";
import { compactTaskKey } from "../helpers/taskKey";
import { labeledPriority, PRIORITY_ACCENT } from "../helpers/taskBadges";
import TaskHeading from "./TaskHeading";
import type { Task, TaskItem } from "../types/Task";

type NestedTaskRowProps = {
  task: TaskItem;
  selected?: boolean;
  onOpen: (task: Task) => void;
};

export default function NestedTaskRow({
  task,
  selected = false,
  onOpen,
}: NestedTaskRowProps) {
  const skipClickRef = useRef(false);
  const { data: assignees = [] } = useAssignees();

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
  const keyLabel = compactTaskKey(task);
  const accentBar = task.priority
    ? PRIORITY_ACCENT[task.priority].bar
    : undefined;

  return (
    <article
      {...dragProps}
      data-dnd-item=""
      data-dnd-nested-row=""
      data-task-id={task.id}
      className={twMerge(isDragging && "opacity-50")}
    >
      <button
        className={twMerge(
          "relative w-full min-w-0 overflow-hidden rounded-md border border-white/6 bg-[#12141c]/80 px-2 py-1.5 text-left select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          task.isSaving && "opacity-70",
          selected && "border-purple-500",
        )}
        disabled={task.isSaving}
        draggable={dragProps.draggable}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (skipClickRef.current) return;
          onOpen(task);
        }}
        onDragStart={(event) => {
          event.stopPropagation();
          dragProps.onDragStart(event);
        }}
        onDragEnd={dragProps.onDragEnd}
      >
        {accentBar ? (
          <div
            aria-hidden
            className={twMerge(
              "absolute top-0 bottom-0 left-0 w-[2px] rounded-l-md",
              accentBar,
            )}
          />
        ) : null}
        {task.priority ? (
          <span className="sr-only">{labeledPriority(task.priority)}</span>
        ) : null}
        <TaskHeading
          className="text-xs"
          taskKey={keyLabel}
          title={task.title}
        />
        {assigneeName ? (
          <p className="mt-1 text-[11px] text-zinc-500">{assigneeName}</p>
        ) : null}
      </button>
    </article>
  );
}
