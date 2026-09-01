import { useEffect, useRef } from "react";

function canConsumeVerticalScroll(el: HTMLElement, deltaY: number) {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll") return false;
  const range = el.scrollHeight - el.clientHeight;
  if (range <= 1) return false;
  if (deltaY > 0) return el.scrollTop < range - 1;
  if (deltaY < 0) return el.scrollTop > 1;
  return false;
}

export function useHorizontalOverflowScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const scroller = ref.current;
    if (!scroller) return;

    const onWheel = (event: WheelEvent) => {
      if (scroller.scrollWidth <= scroller.clientWidth) return;

      const horizontal =
        event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY);
      if (horizontal) {
        const delta =
          event.deltaX !== 0 && !event.shiftKey ? event.deltaX : event.deltaY;
        if (delta === 0) return;
        event.preventDefault();
        scroller.scrollLeft += delta;
        return;
      }

      let node: HTMLElement | null =
        event.target instanceof HTMLElement ? event.target : null;
      while (node && node !== scroller) {
        if (canConsumeVerticalScroll(node, event.deltaY)) return;
        node = node.parentElement;
      }
      if (event.deltaY === 0) return;
      event.preventDefault();
      scroller.scrollLeft += event.deltaY;
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
