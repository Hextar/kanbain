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

export function setDragImageAtCursor(
  dataTransfer: DataTransfer,
  source: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const rect = source.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.top = "-1000px";
  clone.style.left = "-1000px";
  clone.style.width = `${rect.width}px`;
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";
  clone.setAttribute("aria-hidden", "true");
  document.body.appendChild(clone);

  dataTransfer.setDragImage(clone, offsetX, offsetY);

  requestAnimationFrame(() => {
    clone.remove();
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
