"use client";

import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";
import Button from "./Button";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const focusTimer = window.setTimeout(() => {
        confirmRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(focusTimer);
    }
    if (dialog.open) dialog.close();
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onCancel();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={twMerge("confirm-dialog", className)}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={handleBackdropClick}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-zinc-300">
              {description}
            </p>
          ) : null}
        </div>
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
          <Button ref={confirmRef} size="sm" type="submit" variant={variant}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
