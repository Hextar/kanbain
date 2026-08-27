"use client";

import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { useAssignees, useMilestones } from "../hooks/useCatalog";
import type { Task, TaskItem } from "../types/Task";
import TaskCardFrame from "./TaskCardFrame";
import TaskDetailDialog from "./TaskDetailDialog";

type TaskCardProps = {
  task: TaskItem;
  projectId: string;
  onUpdate: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

const priorityStyles = {
  low: "bg-zinc-700 text-zinc-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-rose-500/15 text-rose-300",
} as const;

export default function TaskCard({
  task,
  projectId,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: assignees = [] } = useAssignees();
  const { data: milestones = [] } = useMilestones(projectId);

  const assigneeName = assignees.find(
    (assignee) => assignee.id === task.assigneeId,
  )?.name;
  const milestoneTitle = milestones.find(
    (milestone) => milestone.id === task.milestoneId,
  )?.title;

  return (
    <>
      <article>
        <button
          className="w-full cursor-pointer text-left"
          disabled={task.isSaving}
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <TaskCardFrame
            className={twMerge(
              "flex min-h-2 flex-col gap-2 transition-colors hover:border-zinc-500",
              task.isSaving && "opacity-70",
            )}
          >
            <h3 className="text-sm leading-snug font-medium break-words text-zinc-100">
              {task.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {task.priority ? (
                <span
                  className={twMerge(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                    priorityStyles[task.priority],
                  )}
                >
                  {task.priority}
                </span>
              ) : null}
              {task.estimateTshirt ? (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium tracking-wide text-sky-300 uppercase">
                  {task.estimateTshirt}
                </span>
              ) : null}
              {assigneeName ? (
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200">
                  {assigneeName}
                </span>
              ) : null}
              {milestoneTitle ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                  {milestoneTitle}
                </span>
              ) : null}
              {task.isSaving ? (
                <span className="text-[11px] text-zinc-500">Saving…</span>
              ) : null}
            </div>
            {task.tags?.length ? (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] text-purple-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </TaskCardFrame>
        </button>
      </article>
      {isOpen ? (
        <TaskDetailDialog
          open
          projectId={projectId}
          task={task}
          onClose={() => setIsOpen(false)}
          onDelete={onDelete}
          onSave={onUpdate}
        />
      ) : null}
    </>
  );
}
