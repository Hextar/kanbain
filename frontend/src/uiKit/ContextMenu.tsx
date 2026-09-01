"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight } from "lucide-react";
import { twMerge } from "tailwind-merge";

const GUTTER = 8;
const SUBMENU_GAP = 4;

const PANEL_CLASS =
  "fixed z-[90] min-w-44 rounded-xl border border-white/8 bg-[#181b24] p-1 shadow-xl shadow-black/40";

const ITEM_CLASS =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-left text-sm text-zinc-200 outline-none hover:bg-white/8 focus:bg-white/8 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";

type TriggerProps = {
  onContextMenu?: (event: ReactMouseEvent<HTMLElement>) => void;
};

export type ContextMenuItem = {
  type?: "item";
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  hidden?: boolean;
  onSelect?: () => void;
  items?: ContextMenuEntry[];
  content?: ReactNode;
};

export type ContextMenuSeparator = {
  type: "separator";
};

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

export type ContextMenuAnchor = { x: number; y: number };

type ContextMenuProps = {
  children?: ReactElement<TriggerProps>;
  items: ContextMenuEntry[] | ((close: () => void) => ContextMenuEntry[]);
  disabled?: boolean;
  label?: string;
  anchor?: ContextMenuAnchor | null;
  onClose?: () => void;
};

type Coords = { top: number; left: number };

let closeActiveMenu: (() => void) | null = null;

function isSeparator(entry: ContextMenuEntry): entry is ContextMenuSeparator {
  return entry.type === "separator";
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function visibleEntries(entries: ContextMenuEntry[]) {
  return entries.filter((entry) => isSeparator(entry) || !entry.hidden);
}

function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number,
): Coords {
  const left = Math.min(
    Math.max(GUTTER, x),
    Math.max(GUTTER, window.innerWidth - width - GUTTER),
  );
  let top = y;
  if (top + height > window.innerHeight - GUTTER) {
    top = y - height;
  }
  top = Math.min(
    Math.max(GUTTER, top),
    Math.max(GUTTER, window.innerHeight - height - GUTTER),
  );
  return { top, left };
}

function submenuPosition(anchor: DOMRect, width: number, height: number): Coords {
  let left = anchor.right + SUBMENU_GAP;
  if (left + width > window.innerWidth - GUTTER) {
    left = anchor.left - width - SUBMENU_GAP;
  }
  let top = anchor.top;
  if (top + height > window.innerHeight - GUTTER) {
    top = window.innerHeight - height - GUTTER;
  }
  return {
    top: Math.max(GUTTER, top),
    left: Math.max(GUTTER, left),
  };
}

function hasSubmenu(item: ContextMenuItem) {
  return Boolean(item.content) || (item.items?.length ?? 0) > 0;
}

function MenuItemButton({
  item,
  menuId,
  submenuOpen,
  buttonRef,
  onSelect,
}: {
  item: ContextMenuItem;
  menuId: string;
  submenuOpen: boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onSelect: () => void;
}) {
  const radio = item.checked !== undefined;
  return (
    <button
      ref={buttonRef}
      aria-checked={radio ? item.checked : undefined}
      aria-disabled={item.disabled || undefined}
      aria-expanded={hasSubmenu(item) ? submenuOpen : undefined}
      aria-haspopup={hasSubmenu(item) ? "menu" : undefined}
      className={twMerge(
        ITEM_CLASS,
        item.danger &&
          "text-red-400 hover:bg-red-500/15 focus:bg-red-500/15",
      )}
      disabled={item.disabled}
      id={`${menuId}-${item.id}`}
      role={radio ? "menuitemradio" : "menuitem"}
      tabIndex={-1}
      type="button"
      onClick={onSelect}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {radio && item.checked ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          item.icon
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {hasSubmenu(item) ? (
        <ChevronRight aria-hidden className="size-3.5 shrink-0 text-zinc-500" />
      ) : null}
    </button>
  );
}

export default function ContextMenu({
  children,
  items,
  disabled = false,
  label = "Actions",
  anchor = null,
  onClose,
}: ContextMenuProps) {
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const closeRef = useRef<() => void>(() => {});
  const [open, setOpen] = useState(() => Boolean(anchor));
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(
    () => anchor ?? null,
  );
  const [coords, setCoords] = useState<Coords | null>(null);
  const [submenuId, setSubmenuId] = useState<string | null>(null);
  const [submenuCoords, setSubmenuCoords] = useState<Coords | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setCursor(null);
    setCoords(null);
    setSubmenuId(null);
    setSubmenuCoords(null);
    if (closeActiveMenu === closeRef.current) closeActiveMenu = null;
    onClose?.();
  }, [onClose]);

  closeRef.current = close;

  const resolved =
    typeof items === "function" ? items(close) : items;
  const entries = visibleEntries(resolved);

  const closeSubmenu = useCallback(() => {
    setSubmenuId(null);
    setSubmenuCoords(null);
  }, []);

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (disabled || isEditableTarget(event.target)) return;
      const nextItems =
        typeof items === "function" ? items(closeRef.current) : items;
      if (visibleEntries(nextItems).length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      closeActiveMenu?.();
      closeActiveMenu = closeRef.current;
      setSubmenuId(null);
      setSubmenuCoords(null);
      setCursor({ x: event.clientX, y: event.clientY });
      setOpen(true);
    },
    [disabled, items],
  );

  useEffect(() => {
    if (!anchor) return;
    if (closeActiveMenu && closeActiveMenu !== closeRef.current) {
      closeActiveMenu();
    }
    closeActiveMenu = closeRef.current;
    setSubmenuId(null);
    setSubmenuCoords(null);
    setCursor(anchor);
    setOpen(true);
  }, [anchor]);

  useEffect(() => {
    if (!open) return;
    if (closeActiveMenu !== closeRef.current) {
      closeActiveMenu?.();
      closeActiveMenu = closeRef.current;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (submenuRef.current?.contains(target)) return;
      closeRef.current();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (submenuId) {
        closeSubmenu();
        return;
      }
      closeRef.current();
    }

    function onDocumentContextMenu(event: Event) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) {
        event.preventDefault();
        return;
      }
      if (submenuRef.current?.contains(target)) {
        event.preventDefault();
        return;
      }
      closeRef.current();
    }

    function onScroll() {
      closeRef.current();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("contextmenu", onDocumentContextMenu);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onDocumentContextMenu);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [closeSubmenu, open, submenuId]);

  useLayoutEffect(() => {
    if (!open || !cursor || !panelRef.current) {
      if (!open) setCoords(null);
      return;
    }
    const rect = panelRef.current.getBoundingClientRect();
    setCoords(clampPosition(cursor.x, cursor.y, rect.width, rect.height));
  }, [cursor, entries.length, open]);

  const submenuItem = submenuId
    ? entries.find(
        (entry): entry is ContextMenuItem =>
          !isSeparator(entry) && entry.id === submenuId,
      )
    : undefined;

  useLayoutEffect(() => {
    if (!submenuId || !submenuRef.current) {
      setSubmenuCoords(null);
      return;
    }
    const anchor = itemRefs.current.get(submenuId);
    if (!anchor) return;
    const rect = submenuRef.current.getBoundingClientRect();
    setSubmenuCoords(
      submenuPosition(anchor.getBoundingClientRect(), rect.width, rect.height),
    );
  }, [submenuId]);

  useLayoutEffect(() => {
    if (!open || !coords) return;
    const first = panelRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)',
    );
    first?.focus();
  }, [coords, open]);

  useLayoutEffect(() => {
    if (!submenuItem || !submenuCoords) return;
    const first = submenuRef.current?.querySelector<HTMLElement>(
      "button:not(:disabled), [role='menuitem']:not(:disabled), [role='menuitemradio']:not(:disabled)",
    );
    first?.focus();
  }, [submenuCoords, submenuItem]);

  function focusItem(id: string) {
    itemRefs.current.get(id)?.focus();
  }

  function actionableIds(list: ContextMenuEntry[]) {
    return list.flatMap((entry) =>
      isSeparator(entry) || entry.disabled ? [] : [entry.id],
    );
  }

  function moveFocus(list: ContextMenuEntry[], currentId: string | undefined, delta: number) {
    const ids = actionableIds(list);
    if (ids.length === 0) return;
    const current = currentId ? ids.indexOf(currentId) : -1;
    const next =
      current < 0
        ? delta > 0
          ? ids[0]
          : ids[ids.length - 1]
        : ids[(current + delta + ids.length) % ids.length];
    focusItem(next);
  }

  function activateItem(item: ContextMenuItem) {
    if (item.disabled) return;
    if (hasSubmenu(item)) {
      setSubmenuId((current) => (current === item.id ? null : item.id));
      return;
    }
    item.onSelect?.();
    close();
  }

  function onPanelKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    list: ContextMenuEntry[],
    isSubmenu: boolean,
  ) {
    const target = event.target as HTMLElement;
    const currentId = target.id.startsWith(`${menuId}-`)
      ? target.id.slice(`${menuId}-`.length)
      : undefined;
    const current = list.find(
      (entry): entry is ContextMenuItem =>
        !isSeparator(entry) && entry.id === currentId,
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(list, currentId, 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(list, currentId, -1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      const ids = actionableIds(list);
      if (ids[0]) focusItem(ids[0]);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      const ids = actionableIds(list);
      const last = ids[ids.length - 1];
      if (last) focusItem(last);
      return;
    }
    if (event.key === "ArrowRight" && current && hasSubmenu(current)) {
      event.preventDefault();
      setSubmenuId(current.id);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "Escape") {
      if (isSubmenu || submenuId) {
        event.preventDefault();
        event.stopPropagation();
        const parentId = submenuId;
        closeSubmenu();
        if (parentId) focusItem(parentId);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }
  }

  const trigger =
    children && isValidElement<TriggerProps>(children)
      ? cloneElement(children, {
          onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
            children.props.onContextMenu?.(event);
            handleContextMenu(event);
          },
        })
      : children;

  const submenuEntries = submenuItem?.items
    ? visibleEntries(submenuItem.items)
    : [];

  return (
    <>
      {trigger}
      {open && cursor
        ? createPortal(
            <>
              <div
                ref={panelRef}
                aria-label={label}
                className={twMerge(PANEL_CLASS, !coords && "opacity-0")}
                role="menu"
                style={
                  coords
                    ? { top: coords.top, left: coords.left }
                    : { top: cursor.y, left: cursor.x }
                }
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => onPanelKeyDown(event, entries, false)}
              >
                {entries.map((entry, index) => {
                  if (isSeparator(entry)) {
                    return (
                      <div
                        key={`separator-${index}`}
                        className="my-1 h-px bg-white/8"
                        role="separator"
                      />
                    );
                  }
                  return (
                    <MenuItemButton
                      key={entry.id}
                      buttonRef={(node) => {
                        if (node) itemRefs.current.set(entry.id, node);
                        else itemRefs.current.delete(entry.id);
                      }}
                      item={entry}
                      menuId={menuId}
                      submenuOpen={submenuId === entry.id}
                      onSelect={() => activateItem(entry)}
                    />
                  );
                })}
              </div>
              {submenuItem
                ? (
                    <div
                      ref={submenuRef}
                      aria-label={submenuItem.label}
                      className={twMerge(PANEL_CLASS, !submenuCoords && "opacity-0")}
                      role="menu"
                      style={
                        submenuCoords
                          ? {
                              top: submenuCoords.top,
                              left: submenuCoords.left,
                            }
                          : { top: 0, left: 0 }
                      }
                      onContextMenu={(event) => event.preventDefault()}
                      onKeyDown={(event) =>
                        onPanelKeyDown(event, submenuEntries, true)
                      }
                    >
                      {submenuItem.content
                        ? submenuItem.content
                        : submenuEntries.map((entry, index) => {
                            if (isSeparator(entry)) {
                              return (
                                <div
                                  key={`separator-${index}`}
                                  className="my-1 h-px bg-white/8"
                                  role="separator"
                                />
                              );
                            }
                            return (
                              <MenuItemButton
                                key={entry.id}
                                buttonRef={(node) => {
                                  if (node) itemRefs.current.set(entry.id, node);
                                  else itemRefs.current.delete(entry.id);
                                }}
                                item={entry}
                                menuId={menuId}
                                submenuOpen={false}
                                onSelect={() => activateItem(entry)}
                              />
                            );
                          })}
                    </div>
                  )
                : null}
            </>,
            document.body,
          )
        : null}
    </>
  );
}
