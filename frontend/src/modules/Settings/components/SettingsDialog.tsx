"use client";

import { useId, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Button from "@uiKit/Button";
import Callout from "@uiKit/Callout";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { OPENAI_API_KEY_DOCS_URL } from "../api/settings";

type SettingsDialogProps = {
  open: boolean;
  configured: boolean;
  revoked: boolean;
  forPlanner: boolean;
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
  revoked,
  forPlanner,
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
  const status = statusCopy({ configured, revoked, forPlanner, hint });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || isPending) return;
    onSave();
  }

  return (
    <Dialog
      className="max-w-md"
      descriptionId={descriptionId}
      eyebrow="Workspace"
      footer={
        <div
          className={
            configured
              ? "flex items-center justify-between gap-3"
              : "flex items-center justify-end gap-3"
          }
        >
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
        <p className="text-sm leading-relaxed text-zinc-400" id={descriptionId}>
          The OpenAI API key is encrypted on the server so the planner worker
          can generate boards. It is never shown in full after you save it.
        </p>
        {loadFailed ? (
          <Callout tone="danger">
            Could not load settings from the server.
          </Callout>
        ) : (
          <Callout
            body={status.body}
            icon={
              status.tone === "ok" ? (
                <CheckCircle2 size={16} />
              ) : (
                <CircleAlert size={16} />
              )
            }
            title={status.title}
            tone={status.tone}
          />
        )}
        <DialogPanel title={configured ? "Replace key" : "API key"}>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor={inputId}>
              {configured ? "Replace OpenAI API key" : "OpenAI API key"}
            </FieldLabel>
            <Input
              autoComplete="off"
              autoFocus={open}
              className="font-mono"
              id={inputId}
              placeholder={configured ? "Paste a new key to replace" : "sk-..."}
              spellCheck={false}
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
            />
            <p className="text-[11px] text-zinc-500">
              Need a key?{" "}
              <a
                className="text-purple-400 underline decoration-purple-400/40 underline-offset-2 hover:text-purple-300 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                href={OPENAI_API_KEY_DOCS_URL}
                rel="noreferrer"
                target="_blank"
              >
                How to create an OpenAI API key
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            {error ? (
              <FormMessage>{error}</FormMessage>
            ) : notice ? (
              <FormMessage tone="success">{notice}</FormMessage>
            ) : null}
          </div>
        </DialogPanel>
      </form>
    </Dialog>
  );
}

function statusCopy({
  configured,
  revoked,
  forPlanner,
  hint,
}: {
  configured: boolean;
  revoked: boolean;
  forPlanner: boolean;
  hint: string | undefined;
}): { tone: "ok" | "warn" | "muted"; title: string; body: string } {
  if (configured) {
    return {
      tone: "ok",
      title: "An API key is already saved",
      body: hint
        ? `This key ends in ${hint}. Remove it, or paste a new key to replace it.`
        : "Remove it, or paste a new key to replace it.",
    };
  }
  if (revoked) {
    return {
      tone: "warn",
      title: "Stored API keys were revoked",
      body: forPlanner
        ? "Paste a new key to generate a board."
        : "Paste a new key to enable planning.",
    };
  }
  if (forPlanner) {
    return {
      tone: "warn",
      title: "An OpenAI API key is required",
      body: "Paste a key below to generate a board. You can still create an empty board without one.",
    };
  }
  return {
    tone: "muted",
    title: "No API key saved yet",
    body: "Paste one below to enable planning.",
  };
}
