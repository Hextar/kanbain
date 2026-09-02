"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useHtml5Drag } from "@libraries/dnd/useHtml5Drag";
import type { DropPlaceholder } from "@libraries/dnd/html5DnD";
import {
  consumeCelebrate,
  consumeSpawn,
  isSpawnPending,
  releaseCelebrate,
  releaseSpawn,
} from "@libraries/particles";
import { TASK_DRAG_MIME, type TaskDragPayload } from "../constants";
import type { Task, TaskItem } from "../types/Task";
import CollapsibleSlot from "@uiKit/CollapsibleSlot";
import FlipItem from "./FlipItem";
import DropLine from "./DropLine";
import NestedTaskRow from "./NestedTaskRow";
import TaskCardBody from "./TaskCardBody";
import Card from "@uiKit/Card";
import TaskContextMenu from "./TaskContextMenu";

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
  doneColumnId?: string;
  onOpen: (task: Task) => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

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
  doneColumnId,
  onOpen,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const skipClickRef = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  const showNested = nested.length > 0;

  const handleDragStart = useCallback(() => {
    skipClickRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
  }, []);

  useLayoutEffect(() => {
    const node = rootRef.current;
    consumeSpawn(task.id, node);
    consumeCelebrate(task.id, node);
    return () => {
      releaseSpawn(node);
      releaseCelebrate(node);
    };
  }, [task.id]);

  const { isDragging, dragProps } = useHtml5Drag<TaskDragPayload>({
    mimeType: TASK_DRAG_MIME,
    data: { taskId: task.id, sourceColumnId: task.columnId },
    disabled: Boolean(task.isSaving),
    livePreview: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  return (
    <TaskContextMenu
      doneColumnId={doneColumnId}
      projectId={projectId}
      task={task}
      onDelete={onDelete}
      onOpen={onOpen}
      onUpdate={onUpdate}
    >
      <article
        {...dragProps}
        ref={rootRef}
        data-dnd-column-card=""
        data-dnd-item=""
        data-task-id={task.id}
        data-spawning={isSpawnPending(task.id) ? "" : undefined}
        className={twMerge(
          "relative w-full min-w-0",
          isDragging && "opacity-50",
        )}
        onContextMenu={() => {
          skipClickRef.current = true;
          window.setTimeout(() => {
            skipClickRef.current = false;
          }, 0);
        }}
      >
        <Card
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
              data-dnd-ghost-accent=""
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
              <TaskCardBody
                childCount={childCount}
                doneCount={doneCount}
                projectId={projectId}
                task={task}
              />
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
                        cardAccentBar={accentBar}
                        doneColumnId={doneColumnId}
                        projectId={projectId}
                        selected={selectedTaskId === child.id}
                        task={child}
                        onDelete={onDelete}
                        onOpen={onOpen}
                        onUpdate={onUpdate}
                      />
                    </div>
                  </FlipItem>
                ))}
              </div>
            </div>
          </CollapsibleSlot>
        </Card>
      </article>
    </TaskContextMenu>
  );
}
