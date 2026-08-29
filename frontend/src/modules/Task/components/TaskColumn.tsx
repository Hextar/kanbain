import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Plus, Trash } from "lucide-react";
import Button from "@uiKit/Button";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import { useHtml5Drop } from "@libraries/dnd/useHtml5Drop";
import { getActiveDragPreviewSize } from "@libraries/dnd/html5DnD";
import { TASK_DRAG_MIME, type TaskDragPayload } from "../constants";
import { useMoveTask, useTasks } from "../hooks/useTasks";
import type { ColumnItem } from "../types/Column";
import type { Task } from "../types/Task";
import NewTaskCard from "./NewTaskCard";
import TaskCard from "./TaskCard";
import TaskCardFrame from "./TaskCardFrame";

function isTaskDragPayload(value: unknown): value is TaskDragPayload {
  if (typeof value !== "object" || value === null) return false;
  return (
    "taskId" in value &&
    "sourceColumnId" in value &&
    typeof value.taskId === "string" &&
    typeof value.sourceColumnId === "string"
  );
}

const SHADOW_MS = 200;
const COLUMN_GAP = "0.75rem";

function useDropShadowSlot(insertIndex: number | null, skipExitRef: {
  current: boolean;
}) {
  const [slot, setSlot] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (insertIndex != null) {
      skipExitRef.current = false;
      setSlot(insertIndex);
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    if (skipExitRef.current) {
      skipExitRef.current = false;
      setOpen(false);
      setSlot(null);
      return;
    }
    setOpen(false);
    const timeout = window.setTimeout(() => setSlot(null), SHADOW_MS);
    return () => window.clearTimeout(timeout);
  }, [insertIndex, skipExitRef]);

  return { slot, open };
}

function TaskDropShadow({
  height,
  open,
}: {
  height: number;
  open: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none overflow-hidden transition-[height,margin-bottom] duration-200 ease-out motion-reduce:transition-none"
      data-dnd-placeholder=""
      style={{
        height: open ? height : 0,
        marginBottom: open ? 0 : `-${COLUMN_GAP}`,
      }}
    >
      <div className="box-border" style={{ height }}>
        <TaskCardFrame className="h-full border-dashed border-zinc-500 bg-zinc-900/50 shadow-none">
          {"\u00a0"}
        </TaskCardFrame>
      </div>
    </div>
  );
}

type TaskColumnProps = {
  className?: string;
  column: ColumnItem;
  projectId: string;
  initialTasks?: Task[];
  onDelete: () => void;
};

export default function TaskColumn({
  className,
  column,
  projectId,
  initialTasks,
  onDelete,
}: TaskColumnProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { tasks, createTask, updateTask, deleteTask } = useTasks(
    {
      columnId: column.id,
      projectId,
    },
    initialTasks,
  );
  const { moveTask } = useMoveTask();
  const skipShadowExitRef = useRef(false);

  const onDropTask = useCallback(
    (payload: TaskDragPayload, _event: unknown, insertIndex?: number) => {
      if (!isTaskDragPayload(payload)) return;
      skipShadowExitRef.current = true;
      moveTask(
        payload.taskId,
        payload.sourceColumnId,
        column.id,
        insertIndex ?? tasks.length,
        projectId,
      );
    },
    [column.id, moveTask, projectId, tasks.length],
  );

  const { isOver, visualInsertIndex, dropProps } = useHtml5Drop<TaskDragPayload>({
      mimeType: TASK_DRAG_MIME,
      onDrop: onDropTask,
      sortable: true,
    });
  const shadowHeight = getActiveDragPreviewSize()?.height ?? 72;
  const { slot: shadowSlot, open: shadowOpen } = useDropShadowSlot(
    visualInsertIndex,
    skipShadowExitRef,
  );

  const taskCount = tasks.length;
  const deleteDescription =
    taskCount > 0
      ? `This will permanently delete this column and its ${taskCount} task${taskCount === 1 ? "" : "s"}. This cannot be undone.`
      : "This will permanently delete this empty column. This cannot be undone.";

  return (
    <div
      {...dropProps}
      className={twMerge(
        "flex min-w-[280px] flex-col gap-3 rounded-lg border-2 border-dashed border-transparent bg-zinc-800 p-4",
        isOver && "border-zinc-400",
        column.isSaving && "opacity-70",
        className,
      )}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <h2 className="text-lg font-bold text-white">{column.title}</h2>
        <IconButton
          aria-label={`Delete ${column.title}`}
          size="xs"
          variant="secondary"
          onClick={() => setIsDeleteConfirmOpen(true)}
        >
          <Trash size={16} />
        </IconButton>
      </div>
      {tasks.flatMap((task, index) => {
        const card = (
          <TaskCard
            key={task.id}
            projectId={projectId}
            task={task}
            onDelete={deleteTask}
            onUpdate={updateTask}
          />
        );
        if (shadowSlot === index) {
          return [
            <TaskDropShadow
              key="drop-shadow"
              height={shadowHeight}
              open={shadowOpen}
            />,
            card,
          ];
        }
        return [card];
      })}
      {shadowSlot === tasks.length ? (
        <TaskDropShadow
          key="drop-shadow"
          height={shadowHeight}
          open={shadowOpen}
        />
      ) : null}
      {isComposing ? (
        <NewTaskCard
          onCancel={() => setIsComposing(false)}
          onSubmit={(title) => createTask({ title })}
        />
      ) : (
        <Button
          size="xs"
          kind="ghost"
          variant="secondary"
          onClick={() => setIsComposing(true)}
        >
          <div className="flex flex-row items-center justify-start gap-2">
            <Plus size={16} />
            Add card
          </div>
        </Button>
      )}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={`Delete “${column.title}”?`}
        description={deleteDescription}
        confirmLabel="Delete column"
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
      />
    </div>
  );
}
