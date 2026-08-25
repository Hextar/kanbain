import { useEffect, useRef, useState, type FormEvent } from "react";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@/uiKit/Button";
import IconButton from "@/uiKit/IconButton";
import type { Task, TaskItem } from "../types/Task";
import TaskCardFrame from "./TaskCardFrame";

type TaskCardProps = {
  task: TaskItem;
  onUpdate: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

const priorityStyles = {
  low: "bg-zinc-800 text-zinc-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-rose-500/15 text-rose-300",
} as const;

export default function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const trimmedTitle = title.trim();

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle || trimmedTitle === task.title) {
      setIsEditing(false);
      setTitle(task.title);
      return;
    }

    onUpdate({ ...task, title: trimmedTitle, updatedAt: new Date() });
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave}>
        <TaskCardFrame className="flex min-h-[88px] flex-col justify-between gap-3 ring-1 ring-purple-500/40">
          <textarea
            autoFocus
            className="min-h-[40px] w-full resize-none bg-transparent text-sm leading-snug font-medium text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none"
            rows={2}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setTitle(task.title);
                setIsEditing(false);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="flex flex-row items-center justify-end gap-2">
            <Button
              kind="outline"
              size="xs"
              type="button"
              variant="secondary"
              onClick={() => {
                setTitle(task.title);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={!trimmedTitle} size="xs" type="submit">
              Save
            </Button>
          </div>
        </TaskCardFrame>
      </form>
    );
  }

  return (
    <article>
      <TaskCardFrame
        className={twMerge(
          "flex min-h-2 flex-col justify-between gap-3 transition-colors hover:border-zinc-500",
          task.isSaving && "opacity-70",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm leading-snug font-medium break-words text-zinc-100">
            {task.title}
          </h3>
          <div className="relative shrink-0" ref={menuRef}>
            <IconButton
              aria-label={`Card actions for ${task.title}`}
              disabled={task.isSaving}
              size="xs"
              type="button"
              variant="secondary"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <EllipsisVertical size={16} />
            </IconButton>
            {isMenuOpen ? (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-[148px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
                <button
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setTitle(task.title);
                    setIsEditing(true);
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm text-rose-400 hover:bg-zinc-800"
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(task.id);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex min-h-2 items-center justify-between gap-2">
          {task.priority ? (
            <span
              className={twMerge(
                "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                priorityStyles[task.priority],
              )}
            >
              {task.priority}
            </span>
          ) : (
            <span />
          )}
          {task.isSaving ? (
            <span className="text-[11px] text-zinc-500">Saving…</span>
          ) : null}
        </div>
      </TaskCardFrame>
    </article>
  );
}
