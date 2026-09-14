"use client";

import { useRef, useState, type ReactElement } from "react";
import { Columns3, Flag, Link2, Maximize2, Trash2, User } from "lucide-react";
import { useT } from "@/i18n";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import ContextMenu, { type ContextMenuEntry } from "@uiKit/ContextMenu";
import { shatterByAttr } from "@libraries/particles";
import { useAssignees } from "../hooks/useCatalog";
import { useColumns } from "../hooks/useColumns";
import { useMoveTask } from "../hooks/useTasks";
import { taskQueryValue } from "../helpers/taskKey";
import type { TaskPriority } from "../types/Catalog";
import type { Task, TaskItem } from "../types/Task";

const PRIORITY_IDS = [
  { id: "high", value: "high" as const },
  { id: "medium", value: "medium" as const },
  { id: "low", value: "low" as const },
  { id: "none", value: undefined },
] as const;

type TaskContextMenuProps = {
  task: TaskItem;
  projectId: string;
  doneColumnId?: string;
  children?: ReactElement;
  anchor?: { x: number; y: number } | null;
  onClose?: () => void;
  onOpen: (task: Task) => void;
  onUpdate: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

function asTask(task: TaskItem): Task {
  const next = { ...task };
  delete next.isSaving;
  return next;
}

function withPriority(
  task: TaskItem,
  priority: TaskPriority | undefined,
): Task {
  const next = asTask(task);
  if (priority) next.priority = priority;
  else delete next.priority;
  return next;
}

function withAssignee(task: TaskItem, assigneeId: string | undefined): Task {
  const next = asTask(task);
  if (assigneeId) next.assigneeId = assigneeId;
  else delete next.assigneeId;
  return next;
}

export default function TaskContextMenu({
  task,
  projectId,
  doneColumnId,
  children,
  anchor = null,
  onClose,
  onOpen,
  onUpdate,
  onDelete,
}: TaskContextMenuProps) {
  const t = useT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const retainRef = useRef(false);
  const { data: assignees = [] } = useAssignees();
  const { columns } = useColumns(projectId);
  const { moveTask } = useMoveTask();
  const saving = Boolean(task.isSaving);
  const destinations = columns.filter((column) => column.id !== task.columnId);

  function handleClose() {
    if (retainRef.current) return;
    onClose?.();
  }

  const items: ContextMenuEntry[] = [
    {
      id: "open",
      label: t("task.open"),
      icon: <Maximize2 aria-hidden className="size-3.5 text-zinc-500" />,
      disabled: saving,
      onSelect: () => onOpen(task),
    },
    {
      id: "priority",
      label: t("task.priority"),
      icon: <Flag aria-hidden className="size-3.5 text-zinc-500" />,
      disabled: saving,
      items: PRIORITY_IDS.map((option) => ({
        id: `priority-${option.id}`,
        label: option.value ? t(`task.${option.value}`) : t("common.none"),
        checked: (task.priority ?? undefined) === option.value,
        onSelect: () => onUpdate(withPriority(task, option.value)),
      })),
    },
    {
      id: "assign",
      label: t("task.assign"),
      icon: <User aria-hidden className="size-3.5 text-zinc-500" />,
      disabled: saving,
      items: [
        {
          id: "assign-none",
          label: t("task.unassigned"),
          checked: !task.assigneeId,
          onSelect: () => onUpdate(withAssignee(task, undefined)),
        },
        ...assignees.map((assignee) => ({
          id: `assign-${assignee.id}`,
          label: assignee.name,
          checked: task.assigneeId === assignee.id,
          onSelect: () => onUpdate(withAssignee(task, assignee.id)),
        })),
      ],
    },
    {
      id: "move",
      label: t("task.moveTo"),
      icon: <Columns3 aria-hidden className="size-3.5 text-zinc-500" />,
      disabled: saving || destinations.length === 0,
      hidden: destinations.length === 0,
      items: destinations.map((column) => ({
        id: `move-${column.id}`,
        label: column.title,
        onSelect: () =>
          moveTask(
            task.id,
            task.columnId,
            column.id,
            Number.POSITIVE_INFINITY,
            projectId,
            doneColumnId,
            { parentId: null },
          ),
      })),
    },
    { type: "separator" },
    {
      id: "copy-link",
      label: t("task.copyLink"),
      icon: <Link2 aria-hidden className="size-3.5 text-zinc-500" />,
      onSelect: () => {
        const url = `${window.location.origin}/project/${projectId}?task=${taskQueryValue(task)}`;
        void navigator.clipboard.writeText(url).catch(() => {});
      },
    },
    {
      id: "delete",
      label: t("common.delete"),
      icon: <Trash2 aria-hidden className="size-3.5" />,
      danger: true,
      disabled: saving,
      onSelect: () => {
        retainRef.current = true;
        setConfirmOpen(true);
      },
    },
  ];

  return (
    <>
      <ContextMenu
        anchor={anchor}
        disabled={saving}
        items={items}
        label={t("task.actionsFor", { title: task.title })}
        onClose={handleClose}
      >
        {children}
      </ContextMenu>
      <ConfirmDialog
        confirmLabel={t("task.deleteCard")}
        description={t("task.deleteCardDescription")}
        open={confirmOpen}
        title={t("task.deleteCardTitle", { title: task.title })}
        variant="danger"
        onCancel={() => {
          retainRef.current = false;
          setConfirmOpen(false);
          onClose?.();
        }}
        onConfirm={() => {
          retainRef.current = false;
          setConfirmOpen(false);
          shatterByAttr("data-task-id", task.id);
          onDelete(task.id);
          onClose?.();
        }}
      />
    </>
  );
}
