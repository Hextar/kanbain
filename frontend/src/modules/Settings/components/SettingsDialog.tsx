"use client";

import { useId, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Button from "@uiKit/Button";
import Callout from "@uiKit/Callout";
import Dialog, { DialogPanel } from "@uiKit/Dialog";
import { FieldLabel, FormMessage } from "@uiKit/Field";
import Input from "@uiKit/Input";
import { useT, type TFunction } from "@/i18n";
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
  const t = useT();
  const descriptionId = useId();
  const formId = useId();
  const inputId = useId();
  const trimmed = apiKey.trim();
  const status = statusCopy(t, { configured, revoked, forPlanner, hint });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || isPending) return;
    onSave();
  }

  return (
    <Dialog
      className="max-w-md"
      descriptionId={descriptionId}
      eyebrow={t("settings.eyebrow")}
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
              {t("settings.removeKey")}
            </Button>
          ) : null}
          <Button
            disabled={!trimmed || isPending}
            form={formId}
            size="sm"
            type="submit"
          >
            {configured ? t("settings.replaceKey") : t("settings.saveKey")}
          </Button>
        </div>
      }
      open={open}
      title={t("settings.title")}
      onClose={onClose}
    >
      <form className="flex flex-col gap-3" id={formId} onSubmit={handleSubmit}>
        <p className="text-sm leading-relaxed text-muted" id={descriptionId}>
          {t("settings.description")}
        </p>
        {loadFailed ? (
          <Callout tone="danger">{t("settings.loadFailed")}</Callout>
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
        <DialogPanel>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor={inputId}>
              {configured ? t("settings.labelReplace") : t("settings.labelKey")}
            </FieldLabel>
            <Input
              autoComplete="off"
              autoFocus={open}
              className="font-mono"
              id={inputId}
              placeholder={
                configured ? t("settings.placeholderReplace") : t("settings.placeholderSk")
              }
              spellCheck={false}
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
            />
            <p className="text-[11px] text-subtle">
              {t("settings.needAKey")}{" "}
              <a
                className="text-purple-400 underline decoration-purple-400/40 underline-offset-2 hover:text-purple-300 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                href={OPENAI_API_KEY_DOCS_URL}
                rel="noreferrer"
                target="_blank"
              >
                {t("settings.howToCreate")}
                <span className="sr-only">{t("settings.opensInNewTab")}</span>
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

function statusCopy(
  t: TFunction,
  {
    configured,
    revoked,
    forPlanner,
    hint,
  }: {
    configured: boolean;
    revoked: boolean;
    forPlanner: boolean;
    hint: string | undefined;
  },
): { tone: "ok" | "warn" | "muted"; title: string; body: string } {
  if (configured) {
    return {
      tone: "ok",
      title: t("settings.configuredTitle"),
      body: hint
        ? t("settings.configuredBodyHint", { hint })
        : t("settings.configuredBody"),
    };
  }
  if (revoked) {
    return {
      tone: "warn",
      title: t("settings.revokedTitle"),
      body: forPlanner
        ? t("settings.revokedBodyPlanner")
        : t("settings.revokedBody"),
    };
  }
  if (forPlanner) {
    return {
      tone: "warn",
      title: t("settings.requiredTitle"),
      body: t("settings.requiredBody"),
    };
  }
  return {
    tone: "muted",
    title: t("settings.emptyTitle"),
    body: t("settings.emptyBody"),
  };
}
