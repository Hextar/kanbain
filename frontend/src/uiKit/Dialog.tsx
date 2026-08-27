"use client";

import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import IconButton from "./IconButton";

export type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  descriptionId?: string;
};

export default function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  className,
  descriptionId,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={twMerge("app-dialog", className)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-700/80 pb-3">
        <h2 id={titleId} className="text-lg font-semibold text-white">
          {title}
        </h2>
        <IconButton
          aria-label="Close"
          size="xs"
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          <X size={16} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-zinc-700/80 bg-zinc-800 pt-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
