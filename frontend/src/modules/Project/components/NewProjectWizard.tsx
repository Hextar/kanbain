"use client";

import { useId, useState, type FormEvent } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useT } from "@/i18n";
import Button from "@uiKit/Button";
import ButtonGroup, { ButtonGroupItem } from "@uiKit/ButtonGroup";
import Input from "@uiKit/Input";
import Select from "@uiKit/Select";
import Textarea from "@uiKit/Textarea";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import Field, { FormMessage } from "@uiKit/Field";
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
  ThoughtEffort,
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
  prdUrl: string;
  designUrls: string;
  repoUrl: string;
  members: MemberDraft[];
  deadlineKind: DeadlineKind;
  deadlineDate: string;
  methodology: Methodology;
  qualityBar: QualityBar;
  riskTolerance: RiskTolerance;
  thoughtEffort: ThoughtEffort;
};

const EMPTY_DRAFT: WizardDraft = {
  name: "",
  goal: "",
  prdUrl: "",
  designUrls: "",
  repoUrl: "",
  members: [],
  deadlineKind: "ongoing",
  deadlineDate: "",
  methodology: "kanban",
  qualityBar: "mvp",
  riskTolerance: "medium",
  thoughtEffort: "medium",
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
  const t = useT();
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
      setError(t("project.createError"));
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
      eyebrow={t("project.wizardEyebrow")}
      open={open}
      title={t("project.wizardTitle")}
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
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!canCreateEmpty || isPending}
            kind="outline"
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => void handleCreate(true)}
          >
            {pending === "empty" ? t("project.creating") : t("project.createEmpty")}
          </Button>
          <Button
            disabled={!canPlan || isPending}
            form="new-project-wizard"
            size="sm"
            type="submit"
          >
            {pending === "plan" ? t("project.planningAction") : t("project.generateBoard")}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-3"
        id="new-project-wizard"
        onSubmit={handleSubmit}
      >
        <DialogPanel title={t("project.panelProject")}>
          <div className="flex flex-col gap-2.5">
            <Field htmlFor="wizard-name" label={t("project.title")}>
              <Input
                autoFocus={open}
                className={CONTROL}
                id="wizard-name"
                placeholder="KanbAIn"
                required
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field align="start" htmlFor="wizard-goal" label={t("project.description")}>
              <Textarea
                className={AREA}
                id="wizard-goal"
                placeholder={t("project.goalPlaceholder")}
                value={draft.goal}
                onChange={(event) => update("goal", event.target.value)}
              />
            </Field>
            <Field htmlFor="wizard-prd" label={t("project.prdUrl")}>
              <Input
                className={CONTROL}
                id="wizard-prd"
                inputMode="url"
                placeholder="https://…"
                value={draft.prdUrl}
                onChange={(event) => update("prdUrl", event.target.value)}
              />
            </Field>
            <Field htmlFor="wizard-designs" label={t("project.designUrls")}>
              <Input
                className={CONTROL}
                id="wizard-designs"
                placeholder={t("project.designPlaceholder")}
                value={draft.designUrls}
                onChange={(event) => update("designUrls", event.target.value)}
              />
            </Field>
            <Field htmlFor="wizard-repo" label={t("project.repoUrl")}>
              <Input
                className={CONTROL}
                id="wizard-repo"
                inputMode="url"
                placeholder="https://github.com/…"
                value={draft.repoUrl}
                onChange={(event) => update("repoUrl", event.target.value)}
              />
            </Field>
            <Field label={t("project.effort")}>
              <Segmented
                options={[
                  { value: "low", label: t("project.low") },
                  { value: "medium", label: t("project.med") },
                  { value: "high", label: t("project.high") },
                  { value: "max", label: t("project.max") },
                ]}
                value={draft.thoughtEffort}
                onChange={(value) =>
                  update("thoughtEffort", value as ThoughtEffort)
                }
              />
            </Field>
            <p className="pl-[6.5rem] text-[11px] leading-4 text-zinc-500">
              {t("project.effortHint")}
            </p>
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
            {t("project.advanced")}
          </button>
          {showAdvanced ? (
            <div className="mt-3 flex flex-col gap-3" id={advancedId}>
              <DialogPanel title={t("project.panelTeam")}>
                <TeamStep
                  members={draft.members}
                  onChange={(members) => update("members", members)}
                />
              </DialogPanel>
              <DialogPanel title={t("project.panelDeadline")}>
                <DeadlineStep draft={draft} onChange={update} />
              </DialogPanel>
              <DialogPanel title={t("project.panelPlanning")}>
                <WorkStep draft={draft} onChange={update} />
              </DialogPanel>
            </div>
          ) : null}
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
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
  const t = useT();

  return (
    <div className="flex flex-col gap-2.5">
      {members.length === 0 ? (
        <span className="text-[11px] text-zinc-500">{t("project.noTeammates")}</span>
      ) : null}
      {members.map((member) => (
        <div
          className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5 sm:grid-cols-[1fr_1fr_7.5rem_4.5rem_auto]"
          key={member.key}
        >
          <Input
            aria-label={t("auth.name")}
            className={CONTROL}
            placeholder={t("auth.name")}
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
            aria-label={t("project.role")}
            className={CONTROL}
            placeholder={t("project.role")}
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
            aria-label={t("project.seniority")}
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
            <option value="">{t("project.seniority")}</option>
            <option value="junior">{t("project.junior")}</option>
            <option value="mid">{t("project.mid")}</option>
            <option value="senior">{t("project.senior")}</option>
            <option value="staff">{t("project.staff")}</option>
            <option value="principal">{t("project.principal")}</option>
          </Select>
          <Input
            aria-label={t("project.capacity")}
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
            aria-label={t("project.removeMember", {
              name: member.name || t("project.memberFallback"),
            })}
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
          {t("project.addTeammate")}
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
  const t = useT();
  const needsDate = draft.deadlineKind !== "ongoing";
  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        options={[
          { value: "hard", label: t("project.hardDate") },
          { value: "nice_to_have", label: t("project.niceToHave") },
          { value: "ongoing", label: t("project.ongoing") },
        ]}
        value={draft.deadlineKind}
        onChange={(value) => onChange("deadlineKind", value as DeadlineKind)}
      />
      {needsDate ? (
        <Field htmlFor="wizard-deadline" label={t("project.targetDate")}>
          <Input
            className={twMerge(CONTROL, "[color-scheme:dark]")}
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
  onChange: <K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
  ) => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-col gap-2.5">
      <Segmented
        label={t("project.method")}
        options={[
          { value: "kanban", label: t("project.kanban") },
          { value: "scrum", label: t("project.scrum") },
        ]}
        value={draft.methodology}
        onChange={(value) => onChange("methodology", value as Methodology)}
      />
      <Segmented
        label={t("project.quality")}
        options={[
          { value: "mvp", label: t("project.mvp") },
          { value: "production_grade", label: t("project.productionGrade") },
        ]}
        value={draft.qualityBar}
        onChange={(value) => onChange("qualityBar", value as QualityBar)}
      />
      <Segmented
        label={t("project.risk")}
        options={[
          { value: "low", label: t("project.low") },
          { value: "medium", label: t("project.medium") },
          { value: "high", label: t("project.high") },
        ]}
        value={draft.riskTolerance}
        onChange={(value) => onChange("riskTolerance", value as RiskTolerance)}
      />
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
    <ButtonGroup size="sm">
      {options.map((option) => (
        <ButtonGroupItem
          key={option.value}
          selected={option.value === value}
          tone="primary"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </ButtonGroupItem>
      ))}
    </ButtonGroup>
  );
  if (!label) return control;
  return <Field label={label}>{control}</Field>;
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
  const prdUrl = draft.prdUrl.trim();
  const repoUrl = draft.repoUrl.trim();
  const designUrls = draft.designUrls
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    name: draft.name.trim(),
    ...(goal ? { goal } : {}),
    ...(prdUrl ? { prdUrl } : {}),
    ...(designUrls.length ? { designUrls } : {}),
    ...(repoUrl ? { repoUrl } : {}),
    deadlineKind: draft.deadlineKind,
    ...(draft.deadlineKind !== "ongoing" && draft.deadlineDate
      ? { deadlineAt: `${draft.deadlineDate}T00:00:00Z` }
      : {}),
    methodology: draft.methodology,
    qualityBar: draft.qualityBar,
    riskTolerance: draft.riskTolerance,
    ...(members.length ? { members } : {}),
    ...(skipPlan ? { skipPlan: true } : { thoughtEffort: draft.thoughtEffort }),
  };
}
