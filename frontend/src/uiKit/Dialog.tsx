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
import LightOrb from "./LightOrb";

export type DialogAccent = {
  bar: string;
  glow: string;
};

export const DIALOG_ACCENTS = {
  primary: { bar: "bg-violet-400/80", glow: "from-violet-400/25" },
  danger: { bar: "bg-rose-400", glow: "from-rose-400/30" },
} as const satisfies Record<string, DialogAccent>;

export type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  descriptionId?: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  accent?: DialogAccent;
  titleTranslate?: "no";
};

export default function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  className,
  descriptionId,
  eyebrow,
  subtitle,
  accent = DIALOG_ACCENTS.primary,
  titleTranslate,
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
    dialog.querySelector<HTMLElement>("[autofocus]")?.focus();

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
      className={twMerge(
        "app-dialog glass-overlay light-edge light-edge-card",
        className,
      )}
      data-light-edge=""
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <div
        aria-hidden
        className={twMerge("absolute inset-x-0 top-0 h-0.5", accent.bar)}
      />
      <LightOrb className={accent.glow} />
      <div
        ref={headerRef}
        className={twMerge(
          "relative flex shrink-0 justify-between gap-3 border-b border-white/6 px-4 py-2.5",
          eyebrow ? "items-start" : "items-center",
        )}
      >
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div
            className={twMerge(
              "flex min-w-0 items-center gap-2",
              subtitle ? "justify-between" : null,
              eyebrow ? "mt-0.5" : null,
            )}
          >
            <h2
              id={titleId}
              translate={titleTranslate}
              className={twMerge(
                "min-w-0 truncate font-semibold text-pretty text-white",
                subtitle ? "flex-1" : null,
                eyebrow ? "text-sm tracking-wide" : "text-base",
                titleTranslate === "no" ? "tabular-nums" : null,
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1.5">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        <IconButton
          aria-label="Close"
          className="shrink-0"
          kind="ghost"
          size="xs"
          type="button"
          variant="secondary"
          onClick={onClose}
        >
          <X size={16} />
        </IconButton>
      </div>
      <div ref={bodyRef} className="app-dialog-body px-4 py-3">
        <div ref={contentRef}>{children}</div>
      </div>
      {footer ? (
        <div
          ref={footerRef}
          className="app-dialog-footer relative shrink-0 border-t border-white/6 px-4 py-2.5"
        >
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

export function DialogPanel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-white/8 bg-[#14161e]/55 p-3 backdrop-blur-sm">
      {title ? (
        <h3 className="mb-2.5 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}
