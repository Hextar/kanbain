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
