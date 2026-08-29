import { Fragment, useCallback, useRef, useState } from "react";
import { Plus, Trash } from "lucide-react";
import Button from "@uiKit/Button";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import { useHtml5Drop } from "@libraries/dnd/useHtml5Drop";
import { TASK_DRAG_MIME, type TaskDragPayload } from "../constants";
import { useMoveTask, useTasks } from "../hooks/useTasks";
import type { ColumnItem } from "../types/Column";
import type { Task } from "../types/Task";
import NewTaskCard from "./NewTaskCard";
import TaskCard from "./TaskCard";
import TaskDropShadow, { useDropShadow } from "./TaskDropShadow";

function isTaskDragPayload(value: unknown): value is TaskDragPayload {
  if (typeof value !== "object" || value === null) return false;
  return (
    "taskId" in value &&
    "sourceColumnId" in value &&
    typeof value.taskId === "string" &&
    typeof value.sourceColumnId === "string"
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
  const skipExitAnimationRef = useRef(() => {});

  const onDropTask = useCallback(
    (payload: TaskDragPayload, _event: unknown, insertIndex?: number) => {
      if (!isTaskDragPayload(payload)) return;
      skipExitAnimationRef.current();
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

  const { isOver, placeholder, dropProps } = useHtml5Drop<TaskDragPayload>({
    mimeType: TASK_DRAG_MIME,
    onDrop: onDropTask,
    sortable: true,
  });
  const {
    slot: shadowSlot,
    open: shadowOpen,
    skipExitAnimation,
  } = useDropShadow(placeholder);
  skipExitAnimationRef.current = skipExitAnimation;

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
      {tasks.map((task, index) => (
        <Fragment key={task.id}>
          {shadowSlot?.index === index ? (
            <TaskDropShadow height={shadowSlot.height} open={shadowOpen} />
          ) : null}
          <TaskCard
            projectId={projectId}
            task={task}
            onDelete={deleteTask}
            onUpdate={updateTask}
          />
        </Fragment>
      ))}
      {shadowSlot?.index === tasks.length ? (
        <TaskDropShadow height={shadowSlot.height} open={shadowOpen} />
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
