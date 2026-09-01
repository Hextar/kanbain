"use client";

import { useId, type FormEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import Button from "./Button";
import Dialog, { DIALOG_ACCENTS } from "./Dialog";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const descriptionId = useId();
  const formId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm();
  }

  return (
    <Dialog
      accent={
        variant === "danger" ? DIALOG_ACCENTS.danger : DIALOG_ACCENTS.primary
      }
      className={twMerge("max-w-sm", className)}
      descriptionId={description ? descriptionId : undefined}
      eyebrow={variant === "danger" ? "Warning" : "Confirm"}
      footer={
        <div className="flex flex-row items-center justify-end gap-2">
          <Button
            kind="outline"
            size="sm"
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            autoFocus
            form={formId}
            size="sm"
            type="submit"
            variant={variant}
          >
            {confirmLabel}
          </Button>
        </div>
      }
      open={open}
      title={title}
      onClose={onCancel}
    >
      <form id={formId} onSubmit={handleSubmit}>
        {description ? (
          <p
            className="text-sm leading-relaxed text-zinc-400"
            id={descriptionId}
          >
            {description}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
