export const DND_ITEM_SELECTOR = "[data-dnd-item]";
export const DND_DRAGGING_ATTR = "data-dnd-dragging";

export type DragPreviewSize = {
  width: number;
  height: number;
};

let activeDragPreviewSize: DragPreviewSize | null = null;

export function setActiveDragPreviewSize(size: DragPreviewSize | null) {
  activeDragPreviewSize = size;
}

export function getActiveDragPreviewSize() {
  return activeDragPreviewSize;
}

export function hasDragMime(dataTransfer: DataTransfer, mimeType: string) {
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

const DRAG_IMAGE_TILT_DEG = 5;

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
  clone.style.margin = "0";
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
  return element.hasAttribute("data-dnd-placeholder");
}

function isDraggingItem(element: HTMLElement) {
  return element.hasAttribute(DND_DRAGGING_ATTR);
}

export function markDragSource(source: HTMLElement) {
  clearDragSources();
  source.setAttribute(DND_DRAGGING_ATTR, "");
}

export function clearDragSources() {
  document.querySelectorAll(`[${DND_DRAGGING_ATTR}]`).forEach((element) => {
    element.removeAttribute(DND_DRAGGING_ATTR);
  });
}

export type VerticalInsert = {
  destIndex: number;
  visualIndex: number | null;
};

export function getVerticalInsert(
  container: HTMLElement,
  clientY: number,
  itemSelector = DND_ITEM_SELECTOR,
): VerticalInsert {
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
    if (clientY < rect.top + rect.height / 2) {
      destIndex = index;
      break;
    }
  }

  if (draggingIndex < 0) {
    return { destIndex, visualIndex: destIndex };
  }
  if (destIndex === draggingIndex) {
    return { destIndex, visualIndex: null };
  }
  return {
    destIndex,
    visualIndex: destIndex > draggingIndex ? destIndex + 1 : destIndex,
  };
}
