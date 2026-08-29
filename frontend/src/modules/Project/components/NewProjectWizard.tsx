"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import Button from "@uiKit/Button";
import Input from "@uiKit/Input";
import Textarea from "@uiKit/Textarea";
import Dialog from "@uiKit/Dialog";
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
      open={open}
      title="Create new project"
      onClose={resetAndClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            disabled={isPending}
            kind="outline"
            type="button"
            variant="secondary"
            onClick={resetAndClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!canCreateEmpty || isPending}
            kind="outline"
            type="button"
            variant="secondary"
            onClick={() => void handleCreate(true)}
          >
            {pending === "empty" ? "Creating…" : "Create empty board"}
          </Button>
          <Button
            disabled={!canPlan || isPending}
            form="new-project-wizard"
            type="submit"
          >
            {pending === "plan" ? "Planning…" : "Generate board"}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        id="new-project-wizard"
        onSubmit={handleSubmit}
      >
        <Field htmlFor="wizard-name" label="Title">
          <Input
            autoFocus
            className="bg-zinc-900"
            id="wizard-name"
            placeholder="KanbAIn"
            required
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>
        <Field htmlFor="wizard-goal" label="Description">
          <Textarea
            className="bg-zinc-900"
            id="wizard-goal"
            placeholder="What are you building? Constraints, outcomes, anything the planner should know."
            value={draft.goal}
            onChange={(event) => update("goal", event.target.value)}
          />
        </Field>
        <div>
          <Button
            aria-controls={showAdvanced ? advancedId : undefined}
            aria-expanded={showAdvanced}
            kind="ghost"
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            <span
              className={`inline-flex transition-transform motion-reduce:transition-none ${showAdvanced ? "rotate-180" : ""}`}
            >
              <ChevronDown aria-hidden size={16} />
            </span>
            Advanced
          </Button>
          {showAdvanced ? (
            <div className="mt-4 flex flex-col gap-5" id={advancedId}>
              <TeamStep
                members={draft.members}
                onChange={(members) => update("members", members)}
              />
              <DeadlineStep draft={draft} onChange={update} />
              <WorkStep draft={draft} onChange={update} />
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-300">Team</p>
      {members.map((member) => (
        <div
          className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border border-zinc-700 p-3 sm:grid-cols-[1fr_1fr_8rem_5rem_auto]"
          key={member.key}
        >
          <Input
            aria-label="Name"
            className="bg-zinc-900"
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
            className="bg-zinc-900"
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
          <select
            aria-label="Seniority"
            className="rounded-md bg-zinc-900 px-3 py-2 text-white focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
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
          </select>
          <Input
            aria-label="Capacity"
            className="bg-zinc-900"
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
            size="sm"
            type="button"
            variant="secondary"
            onClick={() =>
              onChange(members.filter((item) => item.key !== member.key))
            }
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      ))}
      <Button
        kind="outline"
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
        <span className="inline-flex items-center gap-2">
          <Plus size={16} />
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
  onChange: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
}) {
  const needsDate = draft.deadlineKind !== "ongoing";
  return (
    <div className="flex flex-col gap-4">
      <ChoiceGroup
        legend="Deadline"
        options={[
          { value: "hard", label: "Hard date" },
          { value: "nice_to_have", label: "Nice to have" },
          { value: "ongoing", label: "Ongoing" },
        ]}
        value={draft.deadlineKind}
        onChange={(value) => onChange("deadlineKind", value as DeadlineKind)}
      />
      {needsDate ? (
        <Field htmlFor="wizard-deadline" label="Target date">
          <Input
            className="bg-zinc-900 [color-scheme:dark]"
            id="wizard-deadline"
            required
            type="date"
            value={draft.deadlineDate}
            onChange={(event) => onChange("deadlineDate", event.target.value)}
          />
        </Field>
      ) : null}
    </div>
  );
}

function WorkStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ChoiceGroup
        legend="Methodology"
        options={[
          { value: "kanban", label: "Kanban" },
          { value: "scrum", label: "Scrum" },
        ]}
        value={draft.methodology}
        onChange={(value) => onChange("methodology", value as Methodology)}
      />
      <ChoiceGroup
        legend="Quality bar"
        options={[
          { value: "mvp", label: "MVP" },
          { value: "production_grade", label: "Production-grade" },
        ]}
        value={draft.qualityBar}
        onChange={(value) => onChange("qualityBar", value as QualityBar)}
      />
      <ChoiceGroup
        legend="Risk tolerance"
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-zinc-300" htmlFor={htmlFor}>
      {label}
      {children}
    </label>
  );
}

function ChoiceGroup({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-zinc-300">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              aria-pressed={selected}
              className={
                selected
                  ? "rounded-md bg-purple-500 px-4 py-2 text-white"
                  : "rounded-md bg-zinc-900 px-4 py-2 text-zinc-300 hover:bg-zinc-700"
              }
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function deadlineIsValid(draft: WizardDraft) {
  return draft.deadlineKind === "ongoing" || draft.deadlineDate.length > 0;
}

function toCreateInput(draft: WizardDraft, skipPlan: boolean): CreateProjectInput {
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
