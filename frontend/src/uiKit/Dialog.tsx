"use client";

import {
  useId,
  useLayoutEffect,
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
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      dialog.style.height = "";
      dialog.removeAttribute("data-height-ready");
      return;
    }

    if (!dialog.open) dialog.showModal();

    const applyHeight = () => {
      const header = headerRef.current;
      const body = bodyRef.current;
      const content = contentRef.current;
      const footerEl = footerRef.current;
      const dialogStyles = getComputedStyle(dialog);
      const bodyStyles = body ? getComputedStyle(body) : null;
      const padding =
        parseFloat(dialogStyles.paddingTop) +
        parseFloat(dialogStyles.paddingBottom);
      const border =
        parseFloat(dialogStyles.borderTopWidth) +
        parseFloat(dialogStyles.borderBottomWidth);
      const bodyPad = bodyStyles
        ? parseFloat(bodyStyles.paddingTop) +
          parseFloat(bodyStyles.paddingBottom)
        : 0;
      const next = `${
        padding +
        border +
        (header?.offsetHeight ?? 0) +
        (footerEl?.offsetHeight ?? 0) +
        bodyPad +
        (content?.offsetHeight ?? 0)
      }px`;
      if (dialog.style.height === next) return;
      dialog.style.height = next;
    };

    applyHeight();
    const frame = requestAnimationFrame(() => {
      dialog.setAttribute("data-height-ready", "");
    });

    const resizeObserver = new ResizeObserver(applyHeight);
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    if (footerRef.current) resizeObserver.observe(footerRef.current);
    window.addEventListener("resize", applyHeight);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", applyHeight);
    };
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
      <div
        ref={headerRef}
        className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-700/80 pb-3"
      >
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
      <div ref={bodyRef} className="app-dialog-body">
        <div ref={contentRef}>{children}</div>
      </div>
      {footer ? (
        <div
          ref={footerRef}
          className="app-dialog-footer shrink-0 border-t border-zinc-700/80 bg-zinc-800 pt-4"
        >
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
