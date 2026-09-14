"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Flag, Plus } from "lucide-react";
import { useT } from "@/i18n";
import Button from "@uiKit/Button";
import IconButton from "@uiKit/IconButton";
import Input from "@uiKit/Input";
import PopoverPanel, { Popover } from "@uiKit/PopoverPanel";
import Tooltip from "@uiKit/Tooltip";
import {
  useCreateMilestone,
  useMilestones,
  useUpdateMilestone,
} from "../hooks/useCatalog";
import { milestoneKey } from "../helpers/milestoneLabel";
import type { Milestone } from "../types/Catalog";

type MilestoneMenuProps = {
  projectId: string;
};

type MilestoneNameFieldProps = {
  label: string;
  nameAria: string;
  milestone: Milestone;
  onSave: (title: string) => Promise<void>;
};

function MilestoneNameField({
  label,
  nameAria,
  milestone,
  onSave,
}: MilestoneNameFieldProps) {
  const [draft, setDraft] = useState(milestone.title);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    setDraft(milestone.title);
  }, [milestone.title]);

  async function commit() {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    const next = draft.trim();
    if (!next) {
      setDraft(milestone.title);
      return;
    }
    if (next === milestone.title) {
      setDraft(milestone.title);
      return;
    }
    try {
      await onSave(next);
    } catch {
      setDraft(milestone.title);
    }
  }

  function cancel() {
    skipBlurRef.current = true;
    setDraft(milestone.title);
  }

  return (
    <li className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5">
      <span className="w-6 shrink-0 text-center text-xs font-medium text-zinc-500">
        {label}
      </span>
      <Input
        aria-label={nameAria}
        autoComplete="off"
        className="h-7 min-w-0 bg-transparent px-1.5 py-0 text-sm text-zinc-200 hover:bg-zinc-900 focus:bg-zinc-900"
        value={draft}
        onBlur={() => {
          void commit();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancel();
            event.currentTarget.blur();
          }
        }}
      />
    </li>
  );
}

export default function MilestoneMenu({ projectId }: MilestoneMenuProps) {
  const t = useT();
  const { data: milestones = [] } = useMilestones(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedTitle = title.trim();
  const close = useCallback(() => setOpen(false), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) return;
    await createMilestone.mutateAsync(trimmedTitle);
    setTitle("");
    inputRef.current?.focus();
  }

  return (
    <Popover className="shrink-0" open={open} onClose={close}>
      <Tooltip content={t("milestone.title")} align="end">
        <IconButton
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={
            milestones.length === 1
              ? t("milestone.oneSaved")
              : t("milestone.nSaved", { n: milestones.length })
          }
          size="xs"
          type="button"
          variant="secondary"
          onClick={() => setOpen((current) => !current)}
        >
          <Flag size={16} />
        </IconButton>
      </Tooltip>
      {open ? (
        <PopoverPanel
          aria-label={t("milestone.title")}
          className="w-72"
          role="dialog"
        >
          <div className="relative max-h-56 overflow-y-auto p-1">
            {milestones.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500">
                {t("milestone.noneYet")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {milestones.map((milestone) => {
                  const key = milestoneKey(milestone.id, milestones) ?? "M";
                  return (
                    <MilestoneNameField
                      key={milestone.id}
                      label={key}
                      nameAria={t("milestone.nameAria", { key })}
                      milestone={milestone}
                      onSave={async (nextTitle) => {
                        await updateMilestone.mutateAsync({
                          id: milestone.id,
                          title: nextTitle,
                        });
                      }}
                    />
                  );
                })}
              </ul>
            )}
          </div>
          <form
            className="relative flex items-center gap-1.5 border-t border-zinc-700 p-2"
            onSubmit={handleSubmit}
          >
            <Input
              ref={inputRef}
              aria-label={t("milestone.newTitle")}
              autoComplete="off"
              className="h-8 min-w-0 bg-zinc-900 px-2 py-1 text-sm"
              name="milestone-title"
              placeholder={t("milestone.placeholder")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <Button
              aria-label={t("milestone.add")}
              disabled={!trimmedTitle || createMilestone.isPending}
              size="xs"
              type="submit"
            >
              <Plus size={14} />
            </Button>
          </form>
        </PopoverPanel>
      ) : null}
    </Popover>
  );
}
