"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronRight, Columns3 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useT } from "@/i18n";

const crumbClass =
  "min-w-0 truncate rounded-full bg-surface px-3 py-1 text-sm font-semibold text-fg ring-1 ring-fg/8";

type HeaderTargets = {
  center: HTMLElement | null;
  trailing: HTMLElement | null;
};

const EMPTY_TARGETS: HeaderTargets = { center: null, trailing: null };

const HeaderTargetsContext = createContext<HeaderTargets>(EMPTY_TARGETS);
const HeaderSetTargetContext = createContext<
  (slot: keyof HeaderTargets, el: HTMLElement | null) => void
>(() => {});

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<HeaderTargets>(EMPTY_TARGETS);
  const setTarget = useCallback(
    (slot: keyof HeaderTargets, el: HTMLElement | null) => {
      setTargets((current) => {
        const owned = current[slot];
        if (el == null) {
          if (owned?.isConnected) return current;
          return owned == null ? current : { ...current, [slot]: null };
        }
        if (owned && owned !== el && owned.isConnected) return current;
        return owned === el ? current : { ...current, [slot]: el };
      });
    },
    [],
  );

  return (
    <HeaderSetTargetContext.Provider value={setTarget}>
      <HeaderTargetsContext.Provider value={targets}>
        {children}
      </HeaderTargetsContext.Provider>
    </HeaderSetTargetContext.Provider>
  );
}

export function HeaderSlot({
  center,
  children,
}: {
  center?: ReactNode;
  children?: ReactNode;
}) {
  const targets = useContext(HeaderTargetsContext);
  return (
    <>
      {targets.center && center != null
        ? createPortal(center, targets.center)
        : null}
      {targets.trailing && children != null
        ? createPortal(children, targets.trailing)
        : null}
    </>
  );
}

type AppHeaderProps = {
  className?: string;
  projectName?: string;
  children?: ReactNode;
};

export default function AppHeader({
  className,
  projectName,
  children,
}: AppHeaderProps) {
  const t = useT();
  const setTarget = useContext(HeaderSetTargetContext);
  const setCenter = useCallback(
    (el: HTMLDivElement | null) => setTarget("center", el),
    [setTarget],
  );
  const setTrailing = useCallback(
    (el: HTMLDivElement | null) => setTarget("trailing", el),
    [setTarget],
  );

  return (
    <header
      className={twMerge(
        "relative z-40 grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-fg/5 bg-canvas px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label={t("chrome.home")}
          className="group flex shrink-0 items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          href="/"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-purple-500/15 text-purple-300 group-hover:bg-purple-500/25">
            <Columns3 aria-hidden size={16} />
          </span>
          <span className="text-sm font-semibold text-fg">
            Kanb<span className="text-purple-300">AI</span>n
          </span>
        </Link>
        <nav
          aria-label={t("chrome.breadcrumb")}
          className="flex min-w-0 items-center gap-2"
        >
          {projectName ? (
            <Link
              className="inline-flex shrink-0 text-sm text-subtle hover:text-fg"
              href="/"
            >
              {t("chrome.projects")}
            </Link>
          ) : (
            <h1 className="shrink-0 text-sm text-subtle">{t("chrome.projects")}</h1>
          )}
          {projectName ? (
            <>
              <ChevronRight
                aria-hidden
                className="shrink-0 text-faint"
                size={14}
              />
              <h1 aria-current="page" className={crumbClass}>
                {projectName}
              </h1>
            </>
          ) : null}
        </nav>
      </div>
      <div className="flex items-center justify-center" ref={setCenter} />
      <div className="flex min-w-0 items-center justify-end gap-2">
        <div
          className="flex min-w-0 items-center justify-end gap-2"
          ref={setTrailing}
        />
        {children}
      </div>
    </header>
  );
}
