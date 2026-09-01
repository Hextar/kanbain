"use client";

import {
  Fragment,
  Suspense,
  startTransition,
  useCallback,
  useState,
} from "react";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useHtml5Drop } from "@libraries/dnd/useHtml5Drop";
import { markSpawn } from "@libraries/particles";
import Button from "@uiKit/Button";
import KanbanHeader from "./components/KanbanHeader";
import TaskColumn from "./components/TaskColumn";
import TaskDetailDialog from "./components/TaskDetailDialog";
import FlipItem from "./components/FlipItem";
import FlowView from "./components/FlowView";
import { useColumns } from "./hooks/useColumns";
import { useHorizontalOverflowScroll } from "./hooks/useHorizontalOverflowScroll";
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
  VIEW_PARAM,
  boardHref,
  parseBoardView,
  type BoardView,
} from "./helpers/boardView";
import {
  CLUSTER_PARAM,
  parseFlowCluster,
  type FlowCluster,
} from "./helpers/flowCluster";
import {
  BOARD_COLUMN_SELECTOR,
  COLUMN_DRAG_MIME,
  type ColumnDragPayload,
} from "./constants";
import { defaultColumnColor } from "./helpers/columnAccent";

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
      fallback={
        <BoardCanvas
          {...props}
          filtersParam={null}
          taskQuery={null}
          viewParam={null}
          clusterParam={null}
        />
      }
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
      viewParam={searchParams.get(VIEW_PARAM)}
      clusterParam={searchParams.get(CLUSTER_PARAM)}
    />
  );
}

function BoardCanvas({
  project,
  initialColumns,
  initialTasks,
  taskQuery,
  filtersParam,
  viewParam,
  clusterParam,
}: KanbanBoardProps & {
  taskQuery: string | null;
  filtersParam: string | null;
  viewParam: string | null;
  clusterParam: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const view = parseBoardView(viewParam);
  const cluster = parseFlowCluster(clusterParam);
  const clauses = parseFilters(filtersParam);
  const { columns, createColumn, deleteColumn, moveColumn, updateColumn } =
    useColumns(project.id, initialColumns);
  const {
    tasks: queriedTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks({ projectId: project.id }, initialTasks);
  const [draft, setDraft] = useState<{ columnId: string; id: string } | null>(
    null,
  );
  const [composingColumn, setComposingColumn] = useState<Column | null>(null);
  const allTasks =
    queriedTasks.length > 0 ? queriedTasks : (initialTasks ?? []);
  const groupedTasks =
    initialTasks === undefined
      ? undefined
      : groupTasksByColumn(initialColumns ?? columns, initialTasks);
  const doneColumnId = lastColumnId(columns);
  const boardColumns =
    composingColumn &&
    columns.every((column) => column.id !== composingColumn.id)
      ? [...columns, composingColumn]
      : columns;
  const selected = findTaskByQuery(allTasks, taskQuery);
  const composing = draft
    ? {
        id: draft.id,
        title: "",
        columnId: draft.columnId,
        order: 0,
        projectId: project.id,
        workKind: "task" as const,
      }
    : null;
  const matchedTaskIds = matchingTaskIds(allTasks, clauses);
  const completedCount = doneColumnId
    ? allTasks.filter((task) => task.columnId === doneColumnId).length
    : 0;

  const replaceBoardQuery = useCallback(
    (patch: {
      task?: string | null;
      filters?: string | null;
      view?: BoardView | null;
      cluster?: FlowCluster | null;
    }) => {
      const nextTask = patch.task !== undefined ? patch.task : taskQuery;
      const nextFilters =
        patch.filters !== undefined ? patch.filters : filtersParam;
      const nextView = parseBoardView(
        patch.view !== undefined ? patch.view : viewParam,
      );
      const nextCluster = parseFlowCluster(
        patch.cluster !== undefined ? patch.cluster : clusterParam,
      );
      const href = boardHref(pathname, {
        view: nextView,
        task: nextTask,
        filters: nextFilters,
        cluster: nextCluster,
      });
      router.replace(href, { scroll: false });
    },
    [clusterParam, filtersParam, pathname, router, taskQuery, viewParam],
  );

  const hrefForView = useCallback(
    (nextView: BoardView) =>
      boardHref(pathname, {
        view: nextView,
        task: taskQuery,
        filters: filtersParam,
        cluster,
      }),
    [cluster, filtersParam, pathname, taskQuery],
  );

  const hrefForCluster = useCallback(
    (nextCluster: FlowCluster) =>
      boardHref(pathname, {
        view: "flow",
        task: taskQuery,
        filters: filtersParam,
        cluster: nextCluster,
      }),
    [filtersParam, pathname, taskQuery],
  );

  const setTaskQuery = useCallback(
    (task: Task | null) => {
      replaceBoardQuery({
        task: task ? taskQueryValue(task) : null,
      });
    },
    [replaceBoardQuery],
  );

  const startNewCard = useCallback(
    (columnId: string) => {
      setDraft({ columnId, id: crypto.randomUUID() });
      if (taskQuery) replaceBoardQuery({ task: null });
    },
    [replaceBoardQuery, setDraft, taskQuery],
  );

  const startNewColumn = useCallback(() => {
    const order = columns.length;
    const id = crypto.randomUUID();
    markSpawn(id);
    setComposingColumn({
      id,
      projectId: project.id,
      title: "",
      order,
      color: defaultColumnColor(order),
    });
  }, [columns.length, project.id]);

  const saveColumn = useCallback(
    (column: Column) => {
      if (composingColumn?.id !== column.id) {
        updateColumn(column);
        return;
      }
      const title = column.title.trim();
      if (!title) {
        setComposingColumn(column);
        return;
      }
      createColumn({ id: column.id, title, color: column.color });
      setComposingColumn(null);
    },
    [composingColumn, createColumn, updateColumn],
  );

  const removeColumn = useCallback(
    (id: Column["id"]) => {
      if (composingColumn?.id === id) {
        setComposingColumn(null);
        return;
      }
      deleteColumn(id);
    },
    [composingColumn, deleteColumn],
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
      moveColumn(payload.columnId, insertIndex);
    },
    [moveColumn],
  );

  const { placeholder, dropProps } = useHtml5Drop<ColumnDragPayload>({
    mimeType: COLUMN_DRAG_MIME,
    onDrop: onDropColumn,
    sortable: COLUMN_SORTABLE,
  });
  const boardScrollRef = useHorizontalOverflowScroll<HTMLDivElement>();

  return (
    <div className="canvas-dots flex h-dvh w-full max-w-full min-w-0 flex-col overflow-x-clip">
      <KanbanHeader
        className="w-full"
        clauses={clauses}
        columns={columns}
        completedCount={completedCount}
        hrefForView={hrefForView}
        projectId={project.id}
        projectName={project.name}
        totalCount={allTasks.length}
        view={view}
        onClausesChange={setClauses}
      />
      {view === "flow" ? (
        <FlowView
          cluster={cluster}
          columns={columns}
          doneColumnId={doneColumnId}
          hrefForCluster={hrefForCluster}
          matchedTaskIds={matchedTaskIds}
          projectId={project.id}
          selectedTaskId={selected?.id}
          tasks={allTasks}
          onDeleteTask={(id) => {
            if (selected?.id === id) setTaskQuery(null);
            deleteTask(id);
          }}
          onOpenTask={setTaskQuery}
          onUpdateTask={updateTask}
        />
      ) : (
        <div
          {...dropProps}
          ref={boardScrollRef}
          aria-labelledby="view-tab-board"
          className="board-x-scroll relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-row items-stretch justify-start gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 py-3"
          id="view-panel-board"
          role="tabpanel"
        >
          {boardColumns.map((column, index) => (
            <Fragment key={column.id}>
              {placeholder?.index === index ? (
                <ColumnDropShadow
                  height={placeholder.height}
                  width={placeholder.width ?? placeholder.height}
                />
              ) : null}
              <FlipItem className="h-full min-h-0 w-[280px] shrink-0">
                <TaskColumn
                  accentIndex={index}
                  allTasks={allTasks}
                  column={column}
                  doneColumnId={doneColumnId}
                  initialTasks={
                    composingColumn?.id === column.id
                      ? []
                      : groupedTasks
                        ? (groupedTasks.get(column.id) ?? [])
                        : undefined
                  }
                  isDone={column.id === doneColumnId}
                  isNew={composingColumn?.id === column.id}
                  matchedTaskIds={matchedTaskIds}
                  projectId={project.id}
                  selectedTaskId={selected?.id}
                  onAddCard={() => startNewCard(column.id)}
                  onDelete={() => removeColumn(column.id)}
                  onDeleteTask={(id) => {
                    if (selected?.id === id) setTaskQuery(null);
                    deleteTask(id);
                  }}
                  onOpenTask={(task) => setTaskQuery(task)}
                  onUpdate={saveColumn}
                  onUpdateTask={updateTask}
                />
              </FlipItem>
            </Fragment>
          ))}
          {placeholder?.index === boardColumns.length ? (
            <ColumnDropShadow
              height={placeholder.height}
              width={placeholder.width ?? placeholder.height}
            />
          ) : null}
          {composingColumn ? null : (
            <AddColumnButton onClick={startNewColumn} />
          )}
        </div>
      )}
      {composing ? (
        <TaskDetailDialog
          key={composing.id}
          allTasks={allTasks}
          isNew
          open
          projectId={project.id}
          task={composing}
          {...columnDialogProps(columns, composing.columnId, doneColumnId)}
          onClose={() => setDraft(null)}
          onDelete={() => setDraft(null)}
          onSave={(task) => {
            if (task.id === composing.id) {
              if (view === "board") markSpawn(task.id);
              createTask({
                id: task.id,
                title: task.title,
                columnId: task.columnId,
                projectId: task.projectId,
                parentId: task.parentId,
                workKind: task.workKind,
                description: task.description,
                priority: task.priority,
                estimateTshirt: task.estimateTshirt,
                assigneeId: task.assigneeId,
                milestoneId: task.milestoneId,
                tags: task.tags,
              });
              setDraft(null);
              return;
            }
            updateTask(task);
          }}
        />
      ) : selected ? (
        <TaskDetailDialog
          key={selected.id}
          allTasks={allTasks}
          open
          projectId={project.id}
          task={selected}
          {...columnDialogProps(columns, selected.columnId, doneColumnId)}
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

function columnDialogProps(
  columns: Column[],
  columnId: string,
  doneColumnId: string | undefined,
) {
  const column = columns.find((item) => item.id === columnId);
  return {
    columnColor: column?.color,
    columnOrder: column?.order ?? 0,
    isDoneColumn: columnId === doneColumnId,
  };
}

function AddColumnButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex h-[52px] w-[280px] shrink-0 flex-col self-start overflow-hidden rounded-xl border border-dashed border-white/12">
      <Button
        className="flex h-full items-center justify-center gap-2 text-sm"
        kind="ghost"
        size="sm"
        variant="secondary"
        onClick={onClick}
      >
        <Plus size={16} />
        Add column
      </Button>
    </div>
  );
}

function ColumnDropShadow({
  height,
  width,
}: {
  height: number;
  width: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none shrink-0"
      data-dnd-placeholder=""
      style={{ width, height }}
    >
      <div
        className="box-border h-full rounded-xl border border-dashed border-zinc-500 bg-[#181b24]/50"
        style={{ width }}
      />
    </div>
  );
}
