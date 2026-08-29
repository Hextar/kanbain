"use client";

import { useId, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Button from "@uiKit/Button";
import Dialog from "@uiKit/Dialog";
import Input from "@uiKit/Input";

type SettingsDialogProps = {
  open: boolean;
  configured: boolean;
  hint: string | undefined;
  apiKey: string;
  error: string | null;
  notice: string | null;
  isPending: boolean;
  loadFailed: boolean;
  onApiKeyChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
};

export default function SettingsDialog({
  open,
  configured,
  hint,
  apiKey,
  error,
  notice,
  isPending,
  loadFailed,
  onApiKeyChange,
  onClose,
  onSave,
  onClear,
}: SettingsDialogProps) {
  const descriptionId = useId();
  const formId = useId();
  const inputId = useId();
  const trimmed = apiKey.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || isPending) return;
    onSave();
  }

  return (
    <Dialog
      className="max-w-md"
      descriptionId={descriptionId}
      footer={
        <div className="flex items-center justify-end gap-2">
          {configured ? (
            <Button
              disabled={isPending}
              kind="ghost"
              size="sm"
              type="button"
              variant="danger"
              onClick={onClear}
            >
              Remove key
            </Button>
          ) : null}
          <Button
            disabled={!trimmed || isPending}
            form={formId}
            size="sm"
            type="submit"
          >
            {configured ? "Replace key" : "Save key"}
          </Button>
        </div>
      }
      open={open}
      title="Settings"
      onClose={onClose}
    >
      <form className="flex flex-col gap-3" id={formId} onSubmit={handleSubmit}>
        <p className="text-sm text-zinc-300" id={descriptionId}>
          The OpenAI API key is stored on the server so the planner worker can
          generate boards. It is never shown in full after you save it.
        </p>
        {loadFailed ? (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300" role="alert">
            Could not load settings from the server.
          </p>
        ) : configured ? (
          <div
            className="flex items-start gap-2 rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300"
            role="status"
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
            <div>
              <p className="font-medium text-emerald-200">An API key is already saved</p>
              <p className="text-emerald-300/90">
                {hint
                  ? `This key ends in ${hint}. Remove it, or paste a new key to replace it.`
                  : "Remove it, or paste a new key to replace it."}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex items-start gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-400"
            role="status"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
            <p>No API key saved yet. Paste one below to enable planning.</p>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm text-zinc-300" htmlFor={inputId}>
          {configured ? "Replace OpenAI API key" : "OpenAI API key"}
          <Input
            autoComplete="off"
            autoFocus={open}
            id={inputId}
            placeholder={configured ? "Paste a new key to replace" : "sk-..."}
            type="password"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
        </label>
        <div aria-live="polite" className="min-h-5 text-sm">
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : notice ? (
            <p className="text-emerald-300">{notice}</p>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
