"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import Input from "@uiKit/Input";
import Select from "@uiKit/Select";
import Textarea from "@uiKit/Textarea";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import IconButton from "@uiKit/IconButton";
import { useRequirePlannerKey } from "@modules/Settings/hooks/useRequirePlannerKey";
import { createProjectAction } from "../actions/createProject";
import type {
  CreateProjectInput,
  DeadlineKind,
  Methodology,
  Project,
  ProjectMemberInput,
  QualityBar,
  RiskTolerance,
  Seniority,
} from "../types/Project";

type MemberDraft = {
  key: string;
  name: string;
  role: string;
  seniority: Seniority | "";
  capacity: string;
};

type WizardDraft = {
  name: string;
  goal: string;
  members: MemberDraft[];
  deadlineKind: DeadlineKind;
  deadlineDate: string;
  methodology: Methodology;
  qualityBar: QualityBar;
  riskTolerance: RiskTolerance;
};

const EMPTY_DRAFT: WizardDraft = {
  name: "",
  goal: "",
  members: [],
  deadlineKind: "ongoing",
  deadlineDate: "",
  methodology: "kanban",
  qualityBar: "mvp",
  riskTolerance: "medium",
};

const CONTROL =
  "box-border h-8 min-h-8 max-h-8 w-full flex-none rounded-md border border-white/8 bg-[#12141c] px-2.5 py-0 text-sm text-zinc-100";

const AREA =
  "min-h-20 w-full flex-none resize-y rounded-md border border-white/8 bg-[#12141c] px-2.5 py-2 text-sm text-zinc-100";

type NewProjectWizardProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

export default function NewProjectWizard({
  open,
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const advancedId = useId();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"plan" | "empty" | null>(null);
  const requirePlannerKey = useRequirePlannerKey();
  const isPending = pending !== null;
  const hasName = draft.name.trim().length > 0;
  const hasGoal = draft.goal.trim().length > 0;
  const canPlan = hasName && hasGoal && deadlineIsValid(draft);
  const canCreateEmpty = hasName && deadlineIsValid(draft);

  function resetAndClose() {
    if (isPending) return;
    setDraft(EMPTY_DRAFT);
    setShowAdvanced(false);
    setError(null);
    onClose();
  }

  function update<K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(skipPlan: boolean) {
    if (isPending) return;
    if (skipPlan ? !canCreateEmpty : !canPlan) return;
    if (!skipPlan && !(await requirePlannerKey())) return;
    setError(null);
    setPending(skipPlan ? "empty" : "plan");
    try {
      const project = await createProjectAction(toCreateInput(draft, skipPlan));
      setDraft(EMPTY_DRAFT);
      setShowAdvanced(false);
      onCreated(project);
      onClose();
    } catch {
      setError("Could not create the project.");
    } finally {
      setPending(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleCreate(false);
  }

  return (
    <Dialog
      eyebrow="New project"
      open={open}
      title="Create"
      onClose={resetAndClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            disabled={isPending}
            kind="outline"
            size="sm"
            type="button"
            variant="secondary"
            onClick={resetAndClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!canCreateEmpty || isPending}
            kind="outline"
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => void handleCreate(true)}
          >
            {pending === "empty" ? "Creating…" : "Create empty board"}
          </Button>
          <Button
            disabled={!canPlan || isPending}
            form="new-project-wizard"
            size="sm"
            type="submit"
          >
            {pending === "plan" ? "Planning…" : "Generate board"}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-3"
        id="new-project-wizard"
        onSubmit={handleSubmit}
      >
        <DialogPanel title="Project">
          <div className="flex flex-col gap-2.5">
            <FieldRow htmlFor="wizard-name" label="Title">
              <Input
                autoFocus
                className={CONTROL}
                id="wizard-name"
                placeholder="KanbAIn"
                required
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </FieldRow>
            <FieldRow align="start" htmlFor="wizard-goal" label="Description">
              <Textarea
                className={AREA}
                id="wizard-goal"
                placeholder="What are you building? Constraints, outcomes, anything the planner should know…"
                value={draft.goal}
                onChange={(event) => update("goal", event.target.value)}
              />
            </FieldRow>
          </div>
        </DialogPanel>
        <div>
          <button
            aria-controls={showAdvanced ? advancedId : undefined}
            aria-expanded={showAdvanced}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            <ChevronDown
              aria-hidden
              className={twMerge(
                "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                showAdvanced && "rotate-90",
              )}
              size={14}
            />
            Advanced
          </button>
          {showAdvanced ? (
            <div className="mt-3 flex flex-col gap-3" id={advancedId}>
              <DialogPanel title="Team">
                <TeamStep
                  members={draft.members}
                  onChange={(members) => update("members", members)}
                />
              </DialogPanel>
              <DialogPanel title="Deadline">
                <DeadlineStep draft={draft} onChange={update} />
              </DialogPanel>
              <DialogPanel title="Planning">
                <WorkStep draft={draft} onChange={update} />
              </DialogPanel>
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </Dialog>
  );
}

function TeamStep({
  members,
  onChange,
}: {
  members: MemberDraft[];
  onChange: (members: MemberDraft[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {members.length === 0 ? (
        <span className="text-[11px] text-zinc-500">No teammates yet</span>
      ) : null}
      {members.map((member) => (
        <div
          className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5 sm:grid-cols-[1fr_1fr_7.5rem_4.5rem_auto]"
          key={member.key}
        >
          <Input
            aria-label="Name"
            className={CONTROL}
            placeholder="Name"
            value={member.name}
            onChange={(event) =>
              onChange(
                members.map((item) =>
                  item.key === member.key
                    ? { ...item, name: event.target.value }
                    : item,
                ),
              )
            }
          />
          <Input
            aria-label="Role"
            className={CONTROL}
            placeholder="Role"
            value={member.role}
            onChange={(event) =>
              onChange(
                members.map((item) =>
                  item.key === member.key
                    ? { ...item, role: event.target.value }
                    : item,
                ),
              )
            }
          />
          <Select
            aria-label="Seniority"
            value={member.seniority}
            onChange={(event) =>
              onChange(
                members.map((item) =>
                  item.key === member.key
                    ? {
                        ...item,
                        seniority: event.target.value as Seniority | "",
                      }
                    : item,
                ),
              )
            }
          >
            <option value="">Seniority</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="staff">Staff</option>
            <option value="principal">Principal</option>
          </Select>
          <Input
            aria-label="Capacity"
            className={CONTROL}
            min="0"
            placeholder="1"
            step="0.1"
            type="number"
            value={member.capacity}
            onChange={(event) =>
              onChange(
                members.map((item) =>
                  item.key === member.key
                    ? { ...item, capacity: event.target.value }
                    : item,
                ),
              )
            }
          />
          <IconButton
            aria-label={`Remove ${member.name || "member"}`}
            size="xs"
            type="button"
            variant="secondary"
            onClick={() =>
              onChange(members.filter((item) => item.key !== member.key))
            }
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ))}
      <Button
        className="self-start"
        kind="ghost"
        size="xs"
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...members,
            {
              key: crypto.randomUUID(),
              name: "",
              role: "",
              seniority: "",
              capacity: "1",
            },
          ])
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Plus size={14} />
          Add teammate
        </span>
      </Button>
    </div>
  );
}

function DeadlineStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: <K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
  ) => void;
}) {
  const needsDate = draft.deadlineKind !== "ongoing";
  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        options={[
          { value: "hard", label: "Hard date" },
          { value: "nice_to_have", label: "Nice to have" },
          { value: "ongoing", label: "Ongoing" },
        ]}
        value={draft.deadlineKind}
        onChange={(value) => onChange("deadlineKind", value as DeadlineKind)}
      />
      {needsDate ? (
        <FieldRow htmlFor="wizard-deadline" label="Target date">
          <Input
            className={twMerge(CONTROL, "[color-scheme:dark]")}
            id="wizard-deadline"
            required
            type="date"
            value={draft.deadlineDate}
            onChange={(event) => onChange("deadlineDate", event.target.value)}
          />
        </FieldRow>
      ) : null}
    </div>
  );
}

function WorkStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: <K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        label="Method"
        options={[
          { value: "kanban", label: "Kanban" },
          { value: "scrum", label: "Scrum" },
        ]}
        value={draft.methodology}
        onChange={(value) => onChange("methodology", value as Methodology)}
      />
      <Segmented
        label="Quality"
        options={[
          { value: "mvp", label: "MVP" },
          { value: "production_grade", label: "Production-grade" },
        ]}
        value={draft.qualityBar}
        onChange={(value) => onChange("qualityBar", value as QualityBar)}
      />
      <Segmented
        label="Risk"
        options={[
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]}
        value={draft.riskTolerance}
        onChange={(value) => onChange("riskTolerance", value as RiskTolerance)}
      />
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  align = "center",
  children,
}: {
  label: string;
  htmlFor?: string;
  align?: "center" | "start";
  children: ReactNode;
}) {
  const labelClass = "text-[11px] font-medium tracking-wide text-zinc-500";
  return (
    <div
      className={twMerge(
        "grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 gap-y-1",
        align === "start" ? "items-start" : "items-center",
      )}
    >
      {htmlFor ? (
        <label
          className={twMerge(labelClass, align === "start" && "pt-2")}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const control = (
    <div className="flex h-8 min-w-0 rounded-md bg-[#12141c] p-0.5 ring-1 ring-white/8">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            aria-pressed={selected}
            className={twMerge(
              "h-full min-w-0 flex-1 cursor-pointer rounded px-1 text-[10px] font-medium tracking-wide focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
              selected
                ? "bg-gradient-to-br from-violet-400 to-purple-600 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.22)]"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
  if (!label) return control;
  return <FieldRow label={label}>{control}</FieldRow>;
}

function deadlineIsValid(draft: WizardDraft) {
  return draft.deadlineKind === "ongoing" || draft.deadlineDate.length > 0;
}

function toCreateInput(
  draft: WizardDraft,
  skipPlan: boolean,
): CreateProjectInput {
  const members = draft.members.flatMap((member) => {
    const name = member.name.trim();
    if (!name) return [];
    const next: ProjectMemberInput = { name };
    const role = member.role.trim();
    if (role) next.role = role;
    if (member.seniority) next.seniority = member.seniority;
    const capacity = Number(member.capacity);
    if (member.capacity && Number.isFinite(capacity)) next.capacity = capacity;
    return [next];
  });
  const goal = draft.goal.trim();
  return {
    name: draft.name.trim(),
    ...(goal ? { goal } : {}),
    deadlineKind: draft.deadlineKind,
    ...(draft.deadlineKind !== "ongoing" && draft.deadlineDate
      ? { deadlineAt: `${draft.deadlineDate}T00:00:00Z` }
      : {}),
    methodology: draft.methodology,
    qualityBar: draft.qualityBar,
    riskTolerance: draft.riskTolerance,
    ...(members.length ? { members } : {}),
    ...(skipPlan ? { skipPlan: true } : {}),
  };
}
