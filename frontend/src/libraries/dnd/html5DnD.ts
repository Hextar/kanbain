export const DND_ITEM_SELECTOR = "[data-dnd-item]";
export const DND_DRAGGING_ATTR = "data-dnd-dragging";

export type DragPreviewSize = {
  width: number;
  height: number;
};

export type DropPlaceholder = {
  index: number;
  height: number;
  width?: number;
};

const PREVIEW_HEIGHT_ATTR = "data-dnd-preview-height";
const PREVIEW_WIDTH_ATTR = "data-dnd-preview-width";
const DND_MIME_ATTR = "data-dnd-mime";
const FALLBACK_PREVIEW_HEIGHT = 72;
const FALLBACK_PREVIEW_WIDTH = 280;

export function hasDragMime(dataTransfer: DataTransfer, mimeType: string) {
  const source = document.querySelector(`[${DND_DRAGGING_ATTR}]`);
  const activeMime = source?.getAttribute(DND_MIME_ATTR);
  if (activeMime) return activeMime === mimeType;
  const types = Array.from(dataTransfer.types);
  return types.includes(mimeType) || types.includes("text/plain");
}

export function setDragData(
  dataTransfer: DataTransfer,
  mimeType: string,
  data: unknown,
) {
  const payload = JSON.stringify(data);
  dataTransfer.setData(mimeType, payload);
  dataTransfer.setData("text/plain", payload);
}

export const DRAG_IMAGE_TILT_DEG = 5;

export function setDragImageAtCursor(
  dataTransfer: DataTransfer,
  source: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = source.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  const tiltRad = (DRAG_IMAGE_TILT_DEG * Math.PI) / 180;
  const pad = Math.ceil(
    Math.abs(rect.width * Math.sin(tiltRad)) +
      Math.abs(rect.height * Math.sin(tiltRad)),
  );

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "-2000px";
  wrapper.style.left = "0";
  wrapper.style.padding = `${pad}px`;
  wrapper.style.pointerEvents = "none";
  wrapper.setAttribute("aria-hidden", "true");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = "0";
  clone.style.overflow = "hidden";
  clone.style.transformOrigin = `${offsetX}px ${offsetY}px`;
  clone.style.transform = `rotate(${DRAG_IMAGE_TILT_DEG}deg)`;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  dataTransfer.setDragImage(wrapper, offsetX + pad, offsetY + pad);

  requestAnimationFrame(() => {
    wrapper.remove();
  });
}

export function getDragData<T>(
  dataTransfer: DataTransfer,
  mimeType: string,
): T | null {
  const raw =
    dataTransfer.getData(mimeType) || dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isPlaceholderItem(element: HTMLElement) {
  return (
    element.hasAttribute("data-dnd-placeholder") ||
    Boolean(element.closest("[data-dnd-placeholder]"))
  );
}

export function dropHitElement(
  clientX: number,
  clientY: number,
): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    if (isPlaceholderItem(node)) continue;
    return node;
  }
  return null;
}

function isDraggingItem(element: HTMLElement) {
  return element.hasAttribute(DND_DRAGGING_ATTR);
}

export function markDragSource(
  source: HTMLElement,
  preview: DragPreviewSize,
  mimeType?: string,
) {
  clearDragSources();
  source.setAttribute(DND_DRAGGING_ATTR, "");
  source.setAttribute(PREVIEW_WIDTH_ATTR, String(preview.width));
  source.setAttribute(PREVIEW_HEIGHT_ATTR, String(preview.height));
  if (mimeType) source.setAttribute(DND_MIME_ATTR, mimeType);
}

export function clearDragSources() {
  document.querySelectorAll(`[${DND_DRAGGING_ATTR}]`).forEach((element) => {
    element.removeAttribute(DND_DRAGGING_ATTR);
    element.removeAttribute(PREVIEW_WIDTH_ATTR);
    element.removeAttribute(PREVIEW_HEIGHT_ATTR);
    element.removeAttribute(DND_MIME_ATTR);
  });
}

function getActiveDragPreviewSize(): DragPreviewSize | null {
  const source = document.querySelector<HTMLElement>(`[${DND_DRAGGING_ATTR}]`);
  if (!source) return null;
  const width = Number(source.getAttribute(PREVIEW_WIDTH_ATTR));
  const height = Number(source.getAttribute(PREVIEW_HEIGHT_ATTR));
  if (!width || !height) return null;
  return { width, height };
}

export type DropInsert = {
  destIndex: number;
  visualIndex: number | null;
  previewHeight: number;
  previewWidth: number;
};

export type VerticalInsert = DropInsert;

function getInsert(
  container: HTMLElement,
  clientPos: number,
  itemSelector: string,
  edge: (rect: DOMRect) => number,
  size: (rect: DOMRect) => number,
): DropInsert {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>(itemSelector),
  ).filter((element) => !isPlaceholderItem(element));
  const draggingIndex = items.findIndex(isDraggingItem);
  const sortable =
    draggingIndex < 0
      ? items
      : items.filter((_, index) => index !== draggingIndex);

  let destIndex = sortable.length;
  for (let index = 0; index < sortable.length; index++) {
    const rect = sortable[index].getBoundingClientRect();
    if (clientPos < edge(rect) + size(rect) / 2) {
      destIndex = index;
      break;
    }
  }

  const preview = getActiveDragPreviewSize();
  const previewHeight = preview?.height ?? FALLBACK_PREVIEW_HEIGHT;
  const previewWidth = preview?.width ?? FALLBACK_PREVIEW_WIDTH;

  if (draggingIndex < 0) {
    return { destIndex, visualIndex: destIndex, previewHeight, previewWidth };
  }
  if (destIndex === draggingIndex) {
    return { destIndex, visualIndex: null, previewHeight, previewWidth };
  }
  return {
    destIndex,
    visualIndex: destIndex > draggingIndex ? destIndex + 1 : destIndex,
    previewHeight,
    previewWidth,
  };
}

export function getVerticalInsert(
  container: HTMLElement,
  clientY: number,
  itemSelector = DND_ITEM_SELECTOR,
): DropInsert {
  return getInsert(
    container,
    clientY,
    itemSelector,
    (rect) => rect.top,
    (rect) => rect.height,
  );
}

export function getHorizontalInsert(
  container: HTMLElement,
  clientX: number,
  itemSelector = DND_ITEM_SELECTOR,
): DropInsert {
  return getInsert(
    container,
    clientX,
    itemSelector,
    (rect) => rect.left,
    (rect) => rect.width,
  );
}
