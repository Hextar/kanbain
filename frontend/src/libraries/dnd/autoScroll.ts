const EDGE_PX = 72;
const MAX_PX_PER_FRAME = 20;

type Scroller = {
  el: HTMLElement;
  x: boolean;
  y: boolean;
};

type Session = {
  zone: HTMLElement;
  x: number;
  y: number;
  scrollers: Scroller[];
  raf: number;
  lastTs: number;
};

let session: Session | null = null;

function scrollAxes(el: HTMLElement): { x: boolean; y: boolean } {
  const style = getComputedStyle(el);
  const overflowX = style.overflowX;
  const overflowY = style.overflowY;
  return {
    x:
      (overflowX === "auto" || overflowX === "scroll") &&
      el.scrollWidth > el.clientWidth + 1,
    y:
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 1,
  };
}

function axisDelta(pos: number, start: number, end: number) {
  const span = end - start;
  if (span <= 0) return 0;
  const edge = Math.min(EDGE_PX, span * 0.35);
  if (pos < start + edge) {
    const t = Math.min(1, (start + edge - pos) / edge);
    return -MAX_PX_PER_FRAME * t * t;
  }
  if (pos > end - edge) {
    const t = Math.min(1, (pos - (end - edge)) / edge);
    return MAX_PX_PER_FRAME * t * t;
  }
  return 0;
}

function addScroller(
  out: Scroller[],
  seen: Set<HTMLElement>,
  el: HTMLElement | null,
) {
  if (!el || seen.has(el)) return;
  const axes = scrollAxes(el);
  if (!axes.x && !axes.y) return;
  seen.add(el);
  out.push({ el, x: axes.x, y: axes.y });
}

function collectScrollers(zone: HTMLElement): Scroller[] {
  const out: Scroller[] = [];
  const seen = new Set<HTMLElement>();
  addScroller(out, seen, zone);
  for (const child of zone.children) {
    if (child instanceof HTMLElement) addScroller(out, seen, child);
  }
  let node = zone.parentElement;
  while (node) {
    addScroller(out, seen, node);
    node = node.parentElement;
  }
  return out;
}

function hotRect(zone: HTMLElement, scroller: HTMLElement) {
  const rect = scroller.getBoundingClientRect();
  if (scroller === zone || !zone.contains(scroller)) return rect;
  const zoneRect = zone.getBoundingClientRect();
  return new DOMRect(rect.left, zoneRect.top, rect.width, zoneRect.height);
}

function applyAutoScroll(active: Session, dt: number) {
  for (const scroller of active.scrollers) {
    const rect = hotRect(active.zone, scroller.el);
    if (scroller.y) {
      const dy = axisDelta(active.y, rect.top, rect.bottom) * dt;
      if (dy) scroller.el.scrollTop += dy;
    }
    if (scroller.x) {
      const dx = axisDelta(active.x, rect.left, rect.right) * dt;
      if (dx) scroller.el.scrollLeft += dx;
    }
  }
}

function tick(now: number) {
  if (!session) return;
  const dt = session.lastTs
    ? Math.min(2, (now - session.lastTs) / 16.667)
    : 1;
  session.lastTs = now;
  applyAutoScroll(session, dt);
  session.raf = requestAnimationFrame(tick);
}

export function noteDropAutoScroll(
  zone: HTMLElement,
  x: number,
  y: number,
) {
  if (session && session.zone === zone) {
    session.x = x;
    session.y = y;
    return;
  }
  stopDropAutoScroll();
  const scrollers = collectScrollers(zone);
  if (scrollers.length === 0) return;
  ensureEndedListener();
  session = { zone, x, y, scrollers, raf: 0, lastTs: 0 };
  session.raf = requestAnimationFrame(tick);
}

export function stopDropAutoScroll(zone?: HTMLElement | null) {
  if (!session) return;
  if (zone && session.zone !== zone) return;
  cancelAnimationFrame(session.raf);
  session = null;
}

function onDragEnded() {
  stopDropAutoScroll();
}

let endedListening = false;

function ensureEndedListener() {
  if (endedListening) return;
  endedListening = true;
  document.addEventListener("dragend", onDragEnded);
  document.addEventListener("drop", onDragEnded);
}
