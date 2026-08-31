import { useLayoutEffect, useRef, useState } from "react";

export const COLLAPSE_MS = 200;

export type PresenceItem<T> = {
  item: T;
  present: boolean;
  animateEnter: boolean;
};

function idsKey<T>(items: readonly T[], getId: (item: T) => string) {
  return items.map(getId).join("\0");
}

export function useListPresence<T>(
  items: readonly T[],
  getId: (item: T) => string,
  durationMs = COLLAPSE_MS,
): PresenceItem<T>[] {
  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const previousRef = useRef<readonly T[] | null>(null);
  const [exits, setExits] = useState<{ item: T; index: number }[]>([]);

  const previous = previousRef.current;
  const primed = previous !== null;
  const prevIds = new Set((previous ?? []).map(getId));
  const enteringIds = new Set<string>();
  if (primed) {
    for (const item of items) {
      if (!prevIds.has(getId(item))) enteringIds.add(getId(item));
    }
  }

  useLayoutEffect(() => {
    const idOf = getIdRef.current;
    const previousItems = previousRef.current;
    previousRef.current = items;
    if (previousItems === null) return;
    if (idsKey(previousItems, idOf) === idsKey(items, idOf)) return;

    const nextIds = new Set(items.map(idOf));
    const leaving = previousItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !nextIds.has(idOf(item)));
    if (leaving.length === 0) return;

    setExits((current) => {
      const existing = new Set(current.map((entry) => idOf(entry.item)));
      return [
        ...current,
        ...leaving.filter((entry) => !existing.has(idOf(entry.item))),
      ];
    });
    const timeout = window.setTimeout(() => {
      const leaveIds = new Set(leaving.map((entry) => idOf(entry.item)));
      setExits((current) =>
        current.filter((entry) => !leaveIds.has(idOf(entry.item))),
      );
    }, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, items]);

  const nextIds = new Set(items.map(getId));
  const displayed: PresenceItem<T>[] = items.map((item) => ({
    item,
    present: true,
    animateEnter: enteringIds.has(getId(item)),
  }));

  for (const exit of exits) {
    if (nextIds.has(getId(exit.item))) continue;
    const index = Math.min(exit.index, displayed.length);
    displayed.splice(index, 0, {
      item: exit.item,
      present: false,
      animateEnter: false,
    });
  }

  return displayed;
}
