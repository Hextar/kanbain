import { DRAG_IMAGE_TILT_DEG } from "./html5DnD";

export const DND_ACCENT_FILL_ATTR = "data-dnd-accent-fill";
export const DND_GHOST_ACCENT_ATTR = "data-dnd-ghost-accent";
export const DND_LIVE_GHOST_ATTR = "data-dnd-live-ghost";

const GHOST_ACCENT_SELECTOR = `[${DND_GHOST_ACCENT_ATTR}]`;
const COLUMN_SELECTOR = "[data-dnd-board-column]";

type LiveGhost = {
  wrapper: HTMLElement;
  offsetX: number;
  offsetY: number;
  pad: number;
  originalFill: string | null;
  currentFill: string | null;
};

let liveGhost: LiveGhost | null = null;
let listening = false;

function hideNativeDragImage(dataTransfer: DataTransfer) {
  const blank = document.createElement("div");
  blank.style.cssText =
    "position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;pointer-events:none";
  document.body.appendChild(blank);
  dataTransfer.setDragImage(blank, 0, 0);
  requestAnimationFrame(() => blank.remove());
}

function stripCloneNoise(clone: HTMLElement) {
  clone.removeAttribute("id");
  clone.removeAttribute("data-dnd-item");
  clone.removeAttribute("data-dnd-dragging");
  clone.querySelectorAll("[id]").forEach((node) => {
    node.removeAttribute("id");
  });
  clone.querySelectorAll("[draggable]").forEach((node) => {
    node.removeAttribute("draggable");
  });
  clone
    .querySelectorAll(`[data-dnd-nested-row] ${GHOST_ACCENT_SELECTOR}`)
    .forEach((node) => {
      node.removeAttribute(DND_GHOST_ACCENT_ATTR);
    });
}

function ensureGhostAccent(clone: HTMLElement) {
  if (clone.querySelector(GHOST_ACCENT_SELECTOR)) return;
  const host =
    clone.querySelector<HTMLElement>("button") ??
    (clone.firstElementChild instanceof HTMLElement
      ? clone.firstElementChild
      : clone);
  host.style.position = "relative";
  const bar = document.createElement("div");
  bar.setAttribute(DND_GHOST_ACCENT_ATTR, "");
  bar.setAttribute("aria-hidden", "true");
  bar.className = "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-lg";
  host.prepend(bar);
}

function accentFillFromPoint(clientX: number, clientY: number): string | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    if (node.closest(`[${DND_LIVE_GHOST_ATTR}]`)) continue;
    const column = node.closest(COLUMN_SELECTOR);
    if (column instanceof HTMLElement) {
      return column.getAttribute(DND_ACCENT_FILL_ATTR);
    }
  }
  return null;
}

function applyGhostAccent(fill: string | null) {
  if (!liveGhost || fill === liveGhost.currentFill) return;
  liveGhost.currentFill = fill;
  const { wrapper } = liveGhost;
  wrapper.querySelectorAll<HTMLElement>(GHOST_ACCENT_SELECTOR).forEach((bar) => {
    bar.style.backgroundColor = fill ?? "";
  });
  wrapper.style.filter = fill
    ? `drop-shadow(0 0 10px ${fill}99) drop-shadow(0 12px 18px rgb(0 0 0 / 0.45))`
    : "drop-shadow(0 12px 18px rgb(0 0 0 / 0.45))";
}

function positionGhost(clientX: number, clientY: number) {
  if (!liveGhost) return;
  const { wrapper, offsetX, offsetY, pad } = liveGhost;
  wrapper.style.transform = `translate(${clientX - offsetX - pad}px, ${clientY - offsetY - pad}px)`;
}

function onDragOver(event: DragEvent) {
  if (!liveGhost) return;
  positionGhost(event.clientX, event.clientY);
  applyGhostAccent(
    accentFillFromPoint(event.clientX, event.clientY) ?? liveGhost.originalFill,
  );
}

function onDragEnd() {
  clearLiveDragGhost();
}

function bindListeners() {
  if (listening) return;
  listening = true;
  document.addEventListener("dragover", onDragOver, true);
  document.addEventListener("dragend", onDragEnd, true);
}

function unbindListeners() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("dragover", onDragOver, true);
  document.removeEventListener("dragend", onDragEnd, true);
}

export function startLiveDragGhost(
  dataTransfer: DataTransfer,
  source: HTMLElement,
  clientX: number,
  clientY: number,
) {
  clearLiveDragGhost();
  hideNativeDragImage(dataTransfer);

  const rect = source.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  const tiltRad = (DRAG_IMAGE_TILT_DEG * Math.PI) / 180;
  const pad = Math.ceil(
    Math.abs(rect.width * Math.sin(tiltRad)) +
      Math.abs(rect.height * Math.sin(tiltRad)),
  );

  const wrapper = document.createElement("div");
  wrapper.setAttribute(DND_LIVE_GHOST_ATTR, "");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "0";
  wrapper.style.top = "0";
  wrapper.style.zIndex = "80";
  wrapper.style.padding = `${pad}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.style.willChange = "transform";

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = "0";
  clone.style.overflow = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.transformOrigin = `${offsetX}px ${offsetY}px`;
  clone.style.transform = `rotate(${DRAG_IMAGE_TILT_DEG}deg)`;
  stripCloneNoise(clone);
  ensureGhostAccent(clone);
  clone.querySelectorAll<HTMLElement>(GHOST_ACCENT_SELECTOR).forEach((bar) => {
    bar.style.transition = "background-color 120ms ease";
  });
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  const sourceColumn = source.closest<HTMLElement>(COLUMN_SELECTOR);
  const originalFill = sourceColumn?.getAttribute(DND_ACCENT_FILL_ATTR) ?? null;

  liveGhost = {
    wrapper,
    offsetX,
    offsetY,
    pad,
    originalFill,
    currentFill: null,
  };
  positionGhost(clientX, clientY);
  applyGhostAccent(
    accentFillFromPoint(clientX, clientY) ?? originalFill,
  );
  bindListeners();
}

export function clearLiveDragGhost() {
  if (!liveGhost) return;
  unbindListeners();
  liveGhost.wrapper.remove();
  liveGhost = null;
}
