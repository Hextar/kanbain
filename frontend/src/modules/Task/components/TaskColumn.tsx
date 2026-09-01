import { useCallback, useRef, useState } from "react";
import { GripVertical, Plus, Trash } from "lucide-react";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import { twMerge } from "tailwind-merge";
import IconButton from "@uiKit/IconButton";
import Tooltip from "@uiKit/Tooltip";
import { useHtml5Drag } from "@libraries/dnd/useHtml5Drag";
import { useHtml5Drop } from "@libraries/dnd/useHtml5Drop";
import type { DropPlaceholder } from "@libraries/dnd/html5DnD";
import {
  COLUMN_CARD_SELECTOR,
  COLUMN_DRAG_MIME,
  TASK_DRAG_MIME,
  type ColumnDragPayload,
  type TaskDragPayload,
} from "../constants";
import { useMoveTask, useTasks } from "../hooks/useTasks";
import { nestedInsertIndex } from "../helpers/nesting";
import {
  getDraggingTaskId,
  isSameSlotDrop,
  resolveTaskDropIntent,
} from "../helpers/taskDropIntent";
import {
  insertIndexAmongColumnTasks,
  mergeTaskLists,
  visibleColumnCards,
} from "../helpers/visibleColumnCards";
import { filterColumnCards } from "../helpers/boardFilter";
import { columnAccent } from "../helpers/columnAccent";
import type { Column, ColumnItem } from "../types/Column";
import type { Task, TaskItem } from "../types/Task";
import ColumnColorMenu from "./ColumnColorMenu";
import DropLine from "./DropLine";
import FlipItem from "./FlipItem";
import TaskCard from "./TaskCard";

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
  allTasks: TaskItem[];
  accentIndex?: number;
  isDone?: boolean;
  doneColumnId?: string;
  initialTasks?: Task[];
  matchedTaskIds?: Set<string> | null;
  selectedTaskId?: string;
  onAddCard: () => void;
  onDelete: () => void;
  onOpenTask: (task: Task) => void;
  onUpdate: (column: Column) => void;
};

export default function TaskColumn({
  className,
  column,
  projectId,
  allTasks,
  accentIndex = 0,
  isDone = false,
  doneColumnId,
  initialTasks,
  matchedTaskIds = null,
  selectedTaskId,
  onAddCard,
  onDelete,
  onOpenTask,
  onUpdate,
}: TaskColumnProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const skipTitleBlurRef = useRef(false);
  const [nestTargetId, setNestTargetId] = useState<string | null>(null);
  const [nestedOver, setNestedOver] = useState<{
    parentId: string;
    placeholder: DropPlaceholder | null;
  } | null>(null);
  const { tasks } = useTasks(
    {
      columnId: column.id,
      projectId,
    },
    initialTasks,
  );
  const { moveTask } = useMoveTask();
  const { isDragging, dragProps } = useHtml5Drag<ColumnDragPayload>({
    mimeType: COLUMN_DRAG_MIME,
    data: { columnId: column.id },
    disabled: Boolean(column.isSaving) || isEditingTitle,
  });
  const byId = mergeTaskLists(allTasks, tasks);
  const visible = filterColumnCards(
    visibleColumnCards(column.id, tasks, allTasks, doneColumnId),
    matchedTaskIds,
  );
  const clearHover = useCallback(() => {
    setNestTargetId(null);
    setNestedOver(null);
  }, []);

  const onDropTask = useCallback(
    (
      payload: TaskDragPayload,
      event: {
        currentTarget: HTMLElement;
        clientX: number;
        clientY: number;
        target: EventTarget | null;
      },
    ) => {
      if (!isTaskDragPayload(payload)) return;
      const dragged = byId.get(payload.taskId);
      if (!dragged) return;
      const known = [...byId.values()];
      const intent = resolveTaskDropIntent(
        event.currentTarget,
        event.clientX,
        event.clientY,
        event.target,
        dragged,
        known,
      );
      if (isSameSlotDrop(payload.sourceColumnId, column.id, intent)) return;
      const columnTasks = tasks
        .map((task) => byId.get(task.id) ?? task)
        .toSorted(
          (left, right) =>
            left.order - right.order || left.id.localeCompare(right.id),
        );

      if (intent.kind === "nest") {
        moveTask(
          payload.taskId,
          payload.sourceColumnId,
          column.id,
          nestedInsertIndex(
            intent.parentId,
            columnTasks,
            Number.POSITIVE_INFINITY,
            payload.taskId,
          ),
          projectId,
          doneColumnId,
          { parentId: intent.parentId },
        );
        return;
      }

      if (intent.kind === "nested") {
        moveTask(
          payload.taskId,
          payload.sourceColumnId,
          column.id,
          nestedInsertIndex(
            intent.parentId,
            columnTasks,
            intent.destIndex,
            payload.taskId,
          ),
          projectId,
          doneColumnId,
          { parentId: intent.parentId },
        );
        return;
      }

      const cards = visibleColumnCards(
        column.id,
        tasks,
        allTasks,
        doneColumnId,
      );
      const index = insertIndexAmongColumnTasks(
        cards,
        tasks,
        intent.destIndex,
        payload.taskId,
      );
      moveTask(
        payload.taskId,
        payload.sourceColumnId,
        column.id,
        index,
        projectId,
        doneColumnId,
        dragged.parentId && payload.sourceColumnId === column.id
          ? { parentId: null }
          : undefined,
      );
    },
    [allTasks, byId, column.id, doneColumnId, moveTask, projectId, tasks],
  );

  const { isOver, placeholder, dropProps } = useHtml5Drop<TaskDragPayload>({
    mimeType: TASK_DRAG_MIME,
    onDrop: onDropTask,
    onDragOver: (event) => {
      const draggedId = getDraggingTaskId();
      const dragged = draggedId ? byId.get(draggedId) : undefined;
      if (!dragged) {
        clearHover();
        return;
      }
      const intent = resolveTaskDropIntent(
        event.currentTarget,
        event.clientX,
        event.clientY,
        event.target,
        dragged,
        [...byId.values()],
      );
      if (intent.kind === "nest") {
        setNestTargetId(intent.parentId);
        setNestedOver(null);
        return;
      }
      if (intent.kind === "nested") {
        setNestTargetId(null);
        setNestedOver({
          parentId: intent.parentId,
          placeholder: intent.placeholder,
        });
        return;
      }
      clearHover();
    },
    sortable: {
      itemSelector: COLUMN_CARD_SELECTOR,
      resolvePlaceholder: (event, _insert) => {
        const draggedId = getDraggingTaskId();
        const dragged = draggedId ? byId.get(draggedId) : undefined;
        if (!dragged) return null;
        const intent = resolveTaskDropIntent(
          event.currentTarget,
          event.clientX,
          event.clientY,
          event.target,
          dragged,
          [...byId.values()],
        );
        if (intent.kind !== "gap") return null;
        return intent.placeholder;
      },
    },
  });
  const gapPlaceholder =
    isOver && !nestTargetId && !nestedOver ? placeholder : null;
  const lastIndex = visible.length - 1;

  const taskCount = tasks.length;
  const cardCount = visible.length;
  const accent = columnAccent(column.color, accentIndex, isDone);
  const deleteDescription =
    taskCount > 0
      ? `This will permanently delete this column and its ${taskCount} task${taskCount === 1 ? "" : "s"}. This cannot be undone.`
      : "This will permanently delete this empty column. This cannot be undone.";

  function persist(patch: Partial<Column>) {
    onUpdate({
      id: column.id,
      projectId: column.projectId,
      title: column.title,
      order: column.order,
      color: column.color,
      ...patch,
    });
  }

  function startEditTitle() {
    if (column.isSaving) return;
    skipTitleBlurRef.current = false;
    setDraftTitle(column.title);
    setIsEditingTitle(true);
  }

  function commitTitle() {
    if (skipTitleBlurRef.current) {
      skipTitleBlurRef.current = false;
      return;
    }
    const next = draftTitle.trim();
    setIsEditingTitle(false);
    if (!next || next === column.title) {
      setDraftTitle(column.title);
      return;
    }
    persist({ title: next });
  }

  function cancelTitle() {
    skipTitleBlurRef.current = true;
    setDraftTitle(column.title);
    setIsEditingTitle(false);
  }

  return (
    <div
      {...dropProps}
      data-dnd-board-column=""
      data-dnd-item=""
      className={twMerge(
        "group/column relative isolate flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/6 bg-[#181b24]",
        isOver && "border-zinc-400",
        (column.isSaving || isDragging) && "opacity-50",
        className,
      )}
    >
      <div className={twMerge("h-[3px] w-full shrink-0", accent.bar)} />
      <div className="relative z-20 flex h-10 w-full flex-row items-center gap-1 px-2">
        <div
          {...dragProps}
          aria-label={`Reorder ${column.title}`}
          className={twMerge(
            "flex h-7 w-4 shrink-0 items-center justify-center",
            column.isSaving || isEditingTitle
              ? "cursor-default"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab",
          )}
        >
          <GripVertical aria-hidden className="block text-zinc-600" size={14} />
        </div>
        <ColumnColorMenu
          accent={accent}
          columnTitle={column.title}
          disabled={column.isSaving}
          onChange={(color) => persist({ color })}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isEditingTitle ? (
            <input
              aria-label="Column name"
              autoFocus
              className="h-7 min-w-0 flex-1 rounded bg-zinc-900 px-1.5 text-[11px] leading-none font-semibold text-zinc-200 ring-1 ring-white/15 outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              value={draftTitle}
              onBlur={commitTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTitle();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelTitle();
                }
              }}
            />
          ) : (
            <h2 className="min-w-0">
              <button
                className="block h-7 max-w-full cursor-pointer truncate text-left text-[11px] leading-7 font-semibold tracking-[0.14em] text-zinc-300 uppercase hover:text-white focus-visible:rounded focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                disabled={column.isSaving}
                type="button"
                onClick={startEditTitle}
              >
                {column.title}
              </button>
            </h2>
          )}
          <span
            className={twMerge(
              "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium tabular-nums select-none",

              accent.badge,
            )}
          >
            {cardCount}
          </span>
        </div>
        <Tooltip
          align="end"
          content="Delete column"
          wrapperClassName="shrink-0"
        >
          <IconButton
            aria-label={`Delete ${column.title}`}
            className="text-zinc-500 opacity-0 group-focus-within/column:opacity-100 group-hover/column:opacity-100 focus-visible:opacity-100"
            size="xs"
            variant="secondary"
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            <Trash size={14} />
          </IconButton>
        </Tooltip>
        <Tooltip align="end" content="Add card" wrapperClassName="shrink-0">
          <IconButton
            aria-label={`Add card to ${column.title}`}
            className="text-zinc-500 opacity-0 group-focus-within/column:opacity-100 group-hover/column:opacity-100 focus-visible:opacity-100"
            size="xs"
            variant="secondary"
            onClick={onAddCard}
          >
            <Plus size={14} />
          </IconButton>
        </Tooltip>
      </div>
      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
        {visible.length === 0 && gapPlaceholder ? <DropLine atStart /> : null}
        {visible.map((card, liveIndex) => (
          <FlipItem
            key={card.task.id}
            className="relative w-full min-w-0 hover:z-10"
          >
            <div className="relative min-w-0">
              {gapPlaceholder?.index === liveIndex ? (
                <DropLine atStart={liveIndex === 0} />
              ) : null}
              {gapPlaceholder?.index === visible.length &&
              liveIndex === lastIndex ? (
                <DropLine atEnd />
              ) : null}
              <TaskCard
                accentBar={accent.bar}
                childCount={card.childCount}
                doneCount={card.doneCount}
                nestActive={
                  isOver &&
                  (nestTargetId === card.task.id ||
                    nestedOver?.parentId === card.task.id)
                }
                nested={card.nested.map((child) => byId.get(child.id) ?? child)}
                nestedPlaceholder={
                  isOver && nestedOver?.parentId === card.task.id
                    ? nestedOver.placeholder
                    : null
                }
                projectId={projectId}
                selectedTaskId={selectedTaskId}
                task={byId.get(card.task.id) ?? card.task}
                onOpen={onOpenTask}
              />
            </div>
          </FlipItem>
        ))}
      </div>
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
