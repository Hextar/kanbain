"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link2, Plus } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import ConfirmDialog from "@uiKit/ConfirmDialog";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import Input from "@uiKit/Input";
import Select from "@uiKit/Select";
import {
  useAssignees,
  useCreateAssignee,
  useCreateTag,
  useMilestones,
  useTags,
} from "../hooks/useCatalog";
import {
  eligibleParents,
  nestWorkKind,
  unnestWorkKind,
} from "../helpers/nesting";
import { milestoneLabel } from "../helpers/milestoneLabel";
import {
  columnDialogAccent,
  type ColumnColorId,
} from "../helpers/columnAccent";
import {
  ESTIMATE_STYLE,
  PILL_CLASS_NAME,
  PRIORITY_ACCENT,
  PRIORITY_STYLES,
  WORK_KIND_STYLES,
} from "../helpers/taskBadges";
import { snapByTaskId } from "../helpers/boardParticles";
import { taskKey, taskQueryValue } from "../helpers/taskKey";
import type { TaskPriority, TshirtSize } from "../types/Catalog";
import type { Task, TaskItem } from "../types/Task";

type TaskDetailDialogProps = {
  open: boolean;
  task: TaskItem;
  projectId: string;
  allTasks: Task[];
  isNew?: boolean;
  columnColor?: ColumnColorId;
  columnOrder?: number;
  isDoneColumn?: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

const TSHIRTS: TshirtSize[] = ["xs", "s", "m", "l", "xl"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

const CONTROL =
  "box-border h-8 min-h-8 max-h-8 min-w-0 flex-1 rounded-md border border-white/8 bg-[#12141c] px-2.5 py-0 text-sm text-zinc-100";

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  className: string;
};

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
      <span className="text-[11px] font-medium tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "";
  options: ChoiceOption<T>[];
  onChange: (value: T | "") => void;
}) {
  return (
    <div className="flex h-8 min-w-0 rounded-md bg-[#12141c] p-0.5 ring-1 ring-white/8">
      <button
        aria-pressed={value === ""}
        className={twMerge(
          "h-full shrink-0 cursor-pointer rounded px-2 text-[10px] font-medium tracking-wide text-zinc-500 uppercase focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
          value === "" ? "bg-zinc-700/90 text-zinc-100" : "hover:text-zinc-300",
        )}
        type="button"
        onClick={() => onChange("")}
      >
        None
      </button>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            aria-pressed={selected}
            className={twMerge(
              "h-full min-w-0 flex-1 cursor-pointer rounded px-1 text-[10px] font-medium tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
              selected ? option.className : "text-zinc-500 hover:text-zinc-300",
            )}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<ComponentProps<"textarea">, "value" | "onChange" | "children">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      className={className}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function InlineAdd({
  placeholder,
  value,
  disabled,
  onChange,
  onAdd,
}: {
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Input
        className={CONTROL}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdd();
          }
        }}
      />
      <Button
        aria-label="Add"
        className="h-8 shrink-0 px-2.5"
        disabled={disabled}
        kind="outline"
        size="xs"
        type="button"
        variant="secondary"
        onClick={onAdd}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

function parentOptionLabel(task: Task) {
  const key = taskKey(task);
  return key ? `${key} ${task.title}` : task.title;
}

export default function TaskDetailDialog({
  open,
  task,
  projectId,
  allTasks,
  isNew = false,
  columnColor,
  columnOrder = 0,
  isDoneColumn = false,
  onClose,
  onSave,
  onDelete,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority | "">(
    task.priority ?? "",
  );
  const [estimateTshirt, setEstimateTshirt] = useState<TshirtSize | "">(
    task.estimateTshirt ?? "",
  );
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [milestoneId, setMilestoneId] = useState(task.milestoneId ?? "");
  const [parentId, setParentId] = useState(task.parentId ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags ?? []);
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { data: assignees = [] } = useAssignees();
  const { data: tags = [] } = useTags();
  const { data: milestones = [] } = useMilestones(projectId);
  const createAssignee = useCreateAssignee();
  const createTag = useCreateTag();

  const trimmedTitle = title.trim();
  const keyLabel = taskKey(task);
  const parents = eligibleParents(task, allTasks);
  const currentParent = task.parentId
    ? allTasks.find((item) => item.id === task.parentId)
    : undefined;
  const parentChoices = currentParent
    ? [currentParent, ...parents.filter((item) => item.id !== currentParent.id)]
    : parents;
  const shareUrl =
    isNew || typeof window === "undefined"
      ? ""
      : `${window.location.origin}/project/${projectId}?task=${taskQueryValue(task)}`;
  const accent = priority
    ? PRIORITY_ACCENT[priority]
    : columnDialogAccent(columnColor, columnOrder, isDoneColumn);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) return;

    const nextParent = parentId
      ? allTasks.find((item) => item.id === parentId)
      : undefined;
    let nextParentId: string | undefined;
    let nextWorkKind = unnestWorkKind(task, allTasks);
    if (nextParent) {
      const kinds = nestWorkKind(task, nextParent, allTasks);
      nextParentId = nextParent.id;
      nextWorkKind = kinds.movedWorkKind;
      if (
        kinds.parentWorkKind &&
        kinds.parentWorkKind !== nextParent.workKind
      ) {
        onSave({ ...nextParent, workKind: kinds.parentWorkKind });
      }
    }

    onSave({
      id: task.id,
      title: trimmedTitle,
      columnId: task.columnId,
      order: task.order,
      taskNumber: task.taskNumber,
      projectId: task.projectId,
      description: description.trim() || undefined,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      category: task.category,
      attachments: task.attachments,
      comments: task.comments,
      priority: priority || undefined,
      estimateTshirt: estimateTshirt || undefined,
      assigneeId: assigneeId || undefined,
      milestoneId: milestoneId || undefined,
      parentId: nextParentId,
      workKind: nextWorkKind,
      tags: selectedTags.length ? selectedTags : undefined,
      updatedAt: new Date(),
    });
    onClose();
  }

  async function handleCreateAssignee() {
    const name = newAssigneeName.trim();
    if (!name) return;
    const created = await createAssignee.mutateAsync(name);
    setAssigneeId(created.id);
    setNewAssigneeName("");
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    const created = await createTag.mutateAsync(name);
    setSelectedTags((current) =>
      current.includes(created.name) ? current : [...current, created.name],
    );
    setNewTagName("");
  }

  function toggleTag(name: string) {
    setSelectedTags((current) =>
      current.includes(name)
        ? current.filter((tag) => tag !== name)
        : [...current, name],
    );
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Dialog
        accent={accent}
        eyebrow="Card details"
        open={open}
        subtitle={
          <>
            {task.workKind ? (
              <span
                className={twMerge(
                  PILL_CLASS_NAME,
                  "px-2 py-0.5 capitalize ring-1 ring-white/6",
                  WORK_KIND_STYLES[task.workKind],
                )}
              >
                {task.workKind}
              </span>
            ) : null}
            {currentParent ? (
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-400 ring-1 ring-white/6">
                Child of {parentOptionLabel(currentParent)}
              </span>
            ) : null}
          </>
        }
        title={isNew ? "New card" : (keyLabel ?? "Untitled")}
        onClose={onClose}
        footer={
          <div
            className={twMerge(
              "flex flex-row items-center gap-2",
              isNew ? "justify-end" : "justify-between",
            )}
          >
            {isNew ? null : (
              <Button
                kind="ghost"
                size="sm"
                type="button"
                variant="danger"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Delete card
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                kind="outline"
                size="sm"
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                disabled={!trimmedTitle}
                form="task-detail-form"
                size="sm"
                type="submit"
              >
                {isNew ? "Add card" : "Save"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="task-detail-form"
          className="flex min-w-0 flex-col gap-3"
          onSubmit={handleSave}
        >
          <div className="flex flex-col gap-1.5">
            <Input
              aria-label="Title"
              autoFocus
              className="h-auto min-h-0 w-full flex-none rounded-none border-0 bg-transparent px-0 py-0 text-lg leading-snug font-semibold text-white placeholder:text-zinc-600 focus-visible:ring-0"
              placeholder="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <AutoGrowTextarea
              aria-label="Description"
              className="min-h-5 w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-sm leading-5 text-zinc-400 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:outline-none"
              placeholder="Add a description…"
              value={description}
              onChange={setDescription}
            />
          </div>

          <DialogPanel title="Properties">
            <div className="flex flex-col gap-2.5">
              <FieldRow label="Priority">
                <SegmentedChoice
                  options={PRIORITIES.map((value) => ({
                    value,
                    label: value,
                    className: PRIORITY_STYLES[value],
                  }))}
                  value={priority}
                  onChange={setPriority}
                />
              </FieldRow>
              <FieldRow label="Estimate">
                <SegmentedChoice
                  options={TSHIRTS.map((value) => ({
                    value,
                    label: value,
                    className: ESTIMATE_STYLE,
                  }))}
                  value={estimateTshirt}
                  onChange={setEstimateTshirt}
                />
              </FieldRow>
              <FieldRow label="Parent">
                <Select
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                >
                  <option value="">None</option>
                  {parentChoices.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parentOptionLabel(parent)}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label="Milestone">
                <Select
                  value={milestoneId}
                  onChange={(event) => setMilestoneId(event.target.value)}
                >
                  <option value="">None</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestoneLabel(milestone, milestones)}
                    </option>
                  ))}
                </Select>
              </FieldRow>
            </div>
          </DialogPanel>

          <DialogPanel title="People">
            <div className="flex flex-col gap-2.5">
              <FieldRow label="Assignee">
                <Select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label="Role">
                <InlineAdd
                  disabled={!newAssigneeName.trim() || createAssignee.isPending}
                  placeholder="New role"
                  value={newAssigneeName}
                  onAdd={() => void handleCreateAssignee()}
                  onChange={setNewAssigneeName}
                />
              </FieldRow>
            </div>
          </DialogPanel>

          <DialogPanel title="Tags">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      className={twMerge(
                        "cursor-pointer rounded-full px-2 py-0.5 text-[11px] focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
                        selected
                          ? "bg-gradient-to-br from-violet-500/30 to-purple-600/20 text-purple-100 ring-1 ring-violet-400/40"
                          : "bg-zinc-800/80 text-zinc-400 ring-1 ring-white/6 hover:text-zinc-200",
                      )}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {tags.length === 0 ? (
                  <span className="text-[11px] text-zinc-500">No tags yet</span>
                ) : null}
              </div>
              <InlineAdd
                disabled={!newTagName.trim() || createTag.isPending}
                placeholder="New tag"
                value={newTagName}
                onAdd={() => void handleCreateTag()}
                onChange={setNewTagName}
              />
            </div>
          </DialogPanel>

          {shareUrl ? (
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[11px] text-zinc-500 hover:text-zinc-300 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              type="button"
              onClick={() => void copyLink()}
            >
              <Link2 aria-hidden size={12} />
              {linkCopied ? "Link copied" : "Copy link"}
            </button>
          ) : null}
        </form>
      </Dialog>
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={`Delete “${task.title || keyLabel || "this card"}”?`}
        description="This will permanently delete this card. This cannot be undone."
        confirmLabel="Delete card"
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          snapByTaskId(task.id);
          onDelete(task.id);
          onClose();
        }}
      />
    </>
  );
}
