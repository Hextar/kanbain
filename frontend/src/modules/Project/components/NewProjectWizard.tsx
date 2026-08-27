"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@uiKit/Button";
import Input from "@uiKit/Input";
import Textarea from "@uiKit/Textarea";
import Dialog from "@uiKit/Dialog";
import IconButton from "@uiKit/IconButton";
import { createProjectAction } from "../actions/createProject";
import type {
  CreateProjectInput,
  DeadlineKind,
  Methodology,
  Project,
  QualityBar,
  RiskTolerance,
  Seniority,
} from "../types/Project";

const STEPS = ["Project", "Team", "Deadline", "How you work"] as const;

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
  prdUrl: string;
  designUrl: string;
  repoUrl: string;
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
  prdUrl: "",
  designUrl: "",
  repoUrl: "",
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
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function resetAndClose() {
    if (isPending) return;
    setStep(0);
    setDraft(EMPTY_DRAFT);
    setError(null);
    onClose();
  }

  function update<K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const canContinue = stepIsValid(step, draft);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue || isPending) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const project = await createProjectAction(toCreateInput(draft));
      setStep(0);
      setDraft(EMPTY_DRAFT);
      onCreated(project);
      onClose();
    } catch {
      setError("Could not create the project.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      title="Create new project"
      className="max-h-[min(90dvh,40rem)]"
      onClose={resetAndClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <div className="flex flex-row items-center gap-2">
            {step > 0 ? (
              <Button
                disabled={isPending}
                kind="outline"
                type="button"
                variant="secondary"
                onClick={() => setStep((current) => current - 1)}
              >
                Back
              </Button>
            ) : (
              <Button
                disabled={isPending}
                kind="outline"
                type="button"
                variant="secondary"
                onClick={resetAndClose}
              >
                Cancel
              </Button>
            )}
            <Button
              disabled={!canContinue || isPending}
              form="new-project-wizard"
              type="submit"
            >
              {isPending
                ? "Planning…"
                : step === STEPS.length - 1
                  ? "Create project"
                  : "Continue"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        id="new-project-wizard"
        onSubmit={handleSubmit}
      >
        {step === 0 ? <ProjectStep draft={draft} onChange={update} /> : null}
        {step === 1 ? (
          <TeamStep
            members={draft.members}
            onChange={(members) => update("members", members)}
          />
        ) : null}
        {step === 2 ? <DeadlineStep draft={draft} onChange={update} /> : null}
        {step === 3 ? <WorkStep draft={draft} onChange={update} /> : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </Dialog>
  );
}

function ProjectStep({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Project name" htmlFor="wizard-name">
        <Input
          autoFocus
          className="bg-zinc-900"
          id="wizard-name"
          placeholder="KanbAIn"
          required
          value={draft.name}
          onChange={(event) => onChange("name", event.target.value)}
        />
      </Field>
      <Field label="What are you building?" htmlFor="wizard-goal">
        <Textarea
          className="bg-zinc-900"
          id="wizard-goal"
          placeholder="Describe the goal, constraints, and anything the planner should know."
          required
          value={draft.goal}
          onChange={(event) => onChange("goal", event.target.value)}
        />
      </Field>
      <Field label="PRD URL (optional)" htmlFor="wizard-prd">
        <Input
          className="bg-zinc-900"
          id="wizard-prd"
          placeholder="https://"
          value={draft.prdUrl}
          onChange={(event) => onChange("prdUrl", event.target.value)}
        />
      </Field>
      <Field label="Design URL (optional)" htmlFor="wizard-design">
        <Input
          className="bg-zinc-900"
          id="wizard-design"
          placeholder="https://"
          value={draft.designUrl}
          onChange={(event) => onChange("designUrl", event.target.value)}
        />
      </Field>
      <Field label="Repo URL (optional)" htmlFor="wizard-repo">
        <Input
          className="bg-zinc-900"
          id="wizard-repo"
          placeholder="https://"
          value={draft.repoUrl}
          onChange={(event) => onChange("repoUrl", event.target.value)}
        />
      </Field>
    </div>
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        Add the people the planner should assign work to. You can skip this.
      </p>
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
        <Field label="Target date" htmlFor="wizard-deadline">
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

function stepIsValid(step: number, draft: WizardDraft) {
  if (step === 0) return draft.name.trim().length > 0 && draft.goal.trim().length > 0;
  if (step === 2 && draft.deadlineKind !== "ongoing") {
    return draft.deadlineDate.length > 0;
  }
  return true;
}

function toCreateInput(draft: WizardDraft): CreateProjectInput {
  const members = draft.members.flatMap((member) => {
    const name = member.name.trim();
    if (!name) return [];
    const capacity = member.capacity ? Number(member.capacity) : undefined;
    return [
      {
        name,
        role: member.role.trim() || undefined,
        seniority: member.seniority || undefined,
        capacity: Number.isFinite(capacity) ? capacity : undefined,
      },
    ];
  });
  const designUrl = draft.designUrl.trim();
  return {
    name: draft.name.trim(),
    goal: draft.goal.trim(),
    prdUrl: draft.prdUrl.trim() || undefined,
    designUrls: designUrl ? [designUrl] : undefined,
    repoUrl: draft.repoUrl.trim() || undefined,
    deadlineKind: draft.deadlineKind,
    deadlineAt:
      draft.deadlineKind === "ongoing" || !draft.deadlineDate
        ? undefined
        : `${draft.deadlineDate}T00:00:00Z`,
    methodology: draft.methodology,
    qualityBar: draft.qualityBar,
    riskTolerance: draft.riskTolerance,
    members: members.length ? members : undefined,
  };
}
