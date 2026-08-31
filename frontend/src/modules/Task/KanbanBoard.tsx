"use client";

import {
  Fragment,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useHtml5Drop } from "@libraries/dnd/useHtml5Drop";
import KanbanHeader from "./components/KanbanHeader";
import NewColumn from "./components/NewColumn";
import TaskColumn from "./components/TaskColumn";
import TaskDetailDialog from "./components/TaskDetailDialog";
import FlipItem from "./components/FlipItem";
import { useDropShadow } from "./components/TaskDropShadow";
import { useColumns } from "./hooks/useColumns";
import { useTasks } from "./hooks/useTasks";
import type { Project } from "@modules/Project/types/Project";
import type { Column } from "./types/Column";
import type { Task } from "./types/Task";
import { groupTasksByColumn } from "./helpers/groupTasksByColumn";
import { lastColumnId } from "./helpers/visibleColumnCards";
import { findTaskByQuery, taskQueryValue } from "./helpers/taskKey";
import {
  FILTER_PARAM,
  matchingTaskIds,
  parseFilters,
  serializeFilters,
  type FilterClause,
} from "./helpers/boardFilter";
import {
  BOARD_COLUMN_SELECTOR,
  COLUMN_DRAG_MIME,
  type ColumnDragPayload,
} from "./constants";

type KanbanBoardProps = {
  project: Pick<Project, "id" | "name">;
  initialColumns?: Column[];
  initialTasks?: Task[];
};

function isColumnDragPayload(value: unknown): value is ColumnDragPayload {
  if (typeof value !== "object" || value === null) return false;
  return "columnId" in value && typeof value.columnId === "string";
}

const COLUMN_SORTABLE = {
  axis: "x" as const,
  itemSelector: BOARD_COLUMN_SELECTOR,
};

export default function KanbanBoard(props: KanbanBoardProps) {
  return (
    <Suspense
      fallback={<BoardCanvas {...props} filtersParam={null} taskQuery={null} />}
    >
      <KanbanBoardWithQuery {...props} />
    </Suspense>
  );
}

function KanbanBoardWithQuery(props: KanbanBoardProps) {
  const searchParams = useSearchParams();
  return (
    <BoardCanvas
      {...props}
      filtersParam={searchParams.get(FILTER_PARAM)}
      taskQuery={searchParams.get("task")}
    />
  );
}

function BoardCanvas({
  project,
  initialColumns,
  initialTasks,
  taskQuery,
  filtersParam,
}: KanbanBoardProps & {
  taskQuery: string | null;
  filtersParam: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const clauses = parseFilters(filtersParam);
  const { columns, createColumn, deleteColumn, moveColumn, updateColumn } =
    useColumns(project.id, initialColumns);
  const {
    tasks: queriedTasks,
    updateTask,
    deleteTask,
  } = useTasks({ projectId: project.id }, initialTasks);
  const allTasks =
    queriedTasks.length > 0 ? queriedTasks : (initialTasks ?? []);
  const groupedTasks =
    initialTasks === undefined
      ? undefined
      : groupTasksByColumn(initialColumns ?? columns, initialTasks);
  const doneColumnId = lastColumnId(columns);
  const selected = findTaskByQuery(allTasks, taskQuery);
  const matchedTaskIds = matchingTaskIds(allTasks, clauses);
  const completedCount = doneColumnId
    ? allTasks.filter((task) => task.columnId === doneColumnId).length
    : 0;
  const skipExitAnimationRef = useRef(() => {});

  const replaceBoardQuery = useCallback(
    (patch: { task?: string | null; filters?: string | null }) => {
      const params = new URLSearchParams();
      const nextTask = patch.task !== undefined ? patch.task : taskQuery;
      const nextFilters =
        patch.filters !== undefined ? patch.filters : filtersParam;
      if (nextTask) params.set("task", nextTask);
      if (nextFilters) params.set(FILTER_PARAM, nextFilters);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [filtersParam, pathname, router, taskQuery],
  );

  const setTaskQuery = useCallback(
    (task: Task | null) => {
      replaceBoardQuery({
        task: task ? taskQueryValue(task) : null,
      });
    },
    [replaceBoardQuery],
  );

  const setClauses = useCallback(
    (next: FilterClause[]) => {
      startTransition(() => {
        replaceBoardQuery({
          filters: serializeFilters(next) || null,
        });
      });
    },
    [replaceBoardQuery],
  );

  const onDropColumn = useCallback(
    (payload: ColumnDragPayload, _event: unknown, insertIndex?: number) => {
      if (!isColumnDragPayload(payload) || insertIndex == null) return;
      skipExitAnimationRef.current();
      moveColumn(payload.columnId, insertIndex);
    },
    [moveColumn],
  );

  const { placeholder, dropProps } = useHtml5Drop<ColumnDragPayload>({
    mimeType: COLUMN_DRAG_MIME,
    onDrop: onDropColumn,
    sortable: COLUMN_SORTABLE,
  });
  const {
    slot: shadowSlot,
    open: shadowOpen,
    skipExitAnimation,
  } = useDropShadow(placeholder);

  useEffect(() => {
    skipExitAnimationRef.current = skipExitAnimation;
  });

  return (
    <div className="flex h-dvh w-full max-w-full flex-col">
      <KanbanHeader
        className="w-full"
        clauses={clauses}
        columns={columns}
        completedCount={completedCount}
        projectId={project.id}
        projectName={project.name}
        totalCount={allTasks.length}
        onClausesChange={setClauses}
      />
      <div
        {...dropProps}
        className="flex min-h-0 w-full flex-1 flex-row items-stretch justify-start gap-3 overflow-x-auto overflow-y-hidden px-4 py-3"
      >
        {columns.map((column, index) => (
          <Fragment key={column.id}>
            {shadowSlot?.index === index ? (
              <ColumnDropShadow
                height={shadowSlot.height}
                open={shadowOpen}
                width={shadowSlot.width ?? shadowSlot.height}
              />
            ) : null}
            <FlipItem
              className="h-full min-h-0 w-[280px] shrink-0"
              index={column.order}
            >
              <TaskColumn
                accentIndex={index}
                allTasks={allTasks}
                column={column}
                doneColumnId={doneColumnId}
                initialTasks={
                  groupedTasks ? (groupedTasks.get(column.id) ?? []) : undefined
                }
                isDone={column.id === doneColumnId}
                matchedTaskIds={matchedTaskIds}
                projectId={project.id}
                selectedTaskId={selected?.id}
                onDelete={() => deleteColumn(column.id)}
                onOpenTask={(task) => setTaskQuery(task)}
                onUpdate={updateColumn}
              />
            </FlipItem>
          </Fragment>
        ))}
        {shadowSlot?.index === columns.length ? (
          <ColumnDropShadow
            height={shadowSlot.height}
            open={shadowOpen}
            width={shadowSlot.width ?? shadowSlot.height}
          />
        ) : null}
        <NewColumn
          className="self-start"
          onSubmit={(title) => createColumn({ title })}
        />
      </div>
      {selected ? (
        <TaskDetailDialog
          key={selected.id}
          allTasks={allTasks}
          open
          projectId={project.id}
          task={selected}
          onClose={() => setTaskQuery(null)}
          onDelete={(id) => {
            deleteTask(id);
            setTaskQuery(null);
          }}
          onSave={(task) => updateTask(task)}
        />
      ) : null}
    </div>
  );
}

function ColumnDropShadow({
  height,
  open,
  width,
}: {
  height: number;
  open: boolean;
  width: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none shrink-0 overflow-hidden transition-[width,margin-right] duration-200 ease-out motion-reduce:transition-none"
      data-dnd-placeholder=""
      style={{
        width: open ? width : 0,
        height,
        marginRight: open ? 0 : "-1rem",
      }}
    >
      <div
        className="box-border h-full rounded-xl border border-dashed border-zinc-500 bg-[#181b24]/50"
        style={{ width }}
      />
    </div>
  );
}
