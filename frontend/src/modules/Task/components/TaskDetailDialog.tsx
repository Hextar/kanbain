"use client";

import { useEffect, useState, type FormEvent } from "react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import Dialog from "@uiKit/Dialog";
import {
  useAssignees,
  useCreateAssignee,
  useCreateTag,
  useMilestones,
  useTags,
} from "../hooks/useCatalog";
import type { TaskPriority, TshirtSize } from "../types/Catalog";
import type { Task, TaskItem } from "../types/Task";

type TaskDetailDialogProps = {
  open: boolean;
  task: TaskItem;
  projectId: string;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: Task["id"]) => void;
};

const TSHIRTS: TshirtSize[] = ["xs", "s", "m", "l", "xl"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

const fieldClassName =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none";

export default function TaskDetailDialog({
  open,
  task,
  projectId,
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
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags ?? []);
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const { data: assignees = [] } = useAssignees();
  const { data: tags = [] } = useTags();
  const { data: milestones = [] } = useMilestones(projectId);
  const createAssignee = useCreateAssignee();
  const createTag = useCreateTag();

  const trimmedTitle = title.trim();

  useEffect(() => {
    if (!open) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority ?? "");
    setEstimateTshirt(task.estimateTshirt ?? "");
    setAssigneeId(task.assigneeId ?? "");
    setMilestoneId(task.milestoneId ?? "");
    setSelectedTags(task.tags ?? []);
    setNewAssigneeName("");
    setNewTagName("");
  }, [open, task]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) return;

    onSave({
      id: task.id,
      title: trimmedTitle,
      columnId: task.columnId,
      order: task.order,
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

  return (
    <Dialog
      open={open}
      title="Card details"
      onClose={onClose}
      footer={
        <div className="flex flex-row items-center justify-between gap-2">
          <Button
            kind="ghost"
            size="sm"
            type="button"
            variant="danger"
            onClick={() => {
              onDelete(task.id);
              onClose();
            }}
          >
            Delete card
          </Button>
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
              Save
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="task-detail-form"
        className="flex flex-col gap-5"
        onSubmit={handleSave}
      >
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Title
          <input
            autoFocus
            className={twMerge(fieldClassName, "text-base font-medium")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Description
          <textarea
            className={twMerge(fieldClassName, "min-h-24 resize-y")}
            placeholder="Add a more detailed description…"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
            Priority
            <select
              className={fieldClassName}
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority | "")
              }
            >
              <option value="">None</option>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
            Estimate
            <select
              className={fieldClassName}
              value={estimateTshirt}
              onChange={(event) =>
                setEstimateTshirt(event.target.value as TshirtSize | "")
              }
            >
              <option value="">None</option>
              {TSHIRTS.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
            Assignee
            <select
              className={fieldClassName}
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              className={fieldClassName}
              placeholder="New role (e.g. Frontend Developer)"
              value={newAssigneeName}
              onChange={(event) => setNewAssigneeName(event.target.value)}
            />
            <Button
              disabled={!newAssigneeName.trim() || createAssignee.isPending}
              kind="outline"
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => void handleCreateAssignee()}
            >
              Add
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Milestone
          <select
            className={fieldClassName}
            value={milestoneId}
            onChange={(event) => setMilestoneId(event.target.value)}
          >
            <option value="">None</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-400">Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const selected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  className={twMerge(
                    "rounded-full px-2.5 py-1 text-xs",
                    selected
                      ? "bg-purple-500/20 text-purple-200"
                      : "bg-zinc-700 text-zinc-400 hover:text-zinc-200",
                  )}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </button>
              );
            })}
            {tags.length === 0 ? (
              <span className="text-xs text-zinc-500">No tags yet</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              className={fieldClassName}
              placeholder="New tag"
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
            />
            <Button
              disabled={!newTagName.trim() || createTag.isPending}
              kind="outline"
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => void handleCreateTag()}
            >
              Add
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
