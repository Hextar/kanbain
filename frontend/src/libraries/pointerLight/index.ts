const TAU = 0.09;
const SETTLE_PX = 0.4;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

const canvases = new Set<HTMLElement>();

let refs = 0;
let raf = 0;
let lastTs = 0;
let primed = false;
let targetX = 0;
let targetY = 0;
let curX = 0;
let curY = 0;
let listening = false;

function canUse() {
  return (
    window.matchMedia(FINE_POINTER).matches &&
    !window.matchMedia(REDUCE_MOTION).matches
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function apply() {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  const nx = clamp((curX / width) * 2 - 1, -1, 1);
  const ny = clamp((curY / height) * 2 - 1, -1, 1);
  const root = document.documentElement;
  root.style.setProperty("--light-nx", nx.toFixed(4));
  root.style.setProperty("--light-ny", ny.toFixed(4));

  for (const el of canvases) {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--lantern-x", `${(curX - rect.left).toFixed(1)}px`);
    el.style.setProperty("--lantern-y", `${(curY - rect.top).toFixed(1)}px`);
  }
}

function settled() {
  return Math.abs(targetX - curX) < SETTLE_PX && Math.abs(targetY - curY) < SETTLE_PX;
}

function tick(now: number) {
  const dt = lastTs ? clamp((now - lastTs) / 1000, 0.001, 0.048) : 0.016;
  lastTs = now;
  const k = 1 - Math.exp(-dt / TAU);
  curX += (targetX - curX) * k;
  curY += (targetY - curY) * k;
  apply();
  if (settled()) {
    curX = targetX;
    curY = targetY;
    apply();
    raf = 0;
    lastTs = 0;
    return;
  }
  raf = requestAnimationFrame(tick);
}

function startLoop() {
  if (raf) return;
  lastTs = 0;
  raf = requestAnimationFrame(tick);
}

function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
  lastTs = 0;
}

function onPointerMove(event: PointerEvent) {
  targetX = event.clientX;
  targetY = event.clientY;
  if (!primed) {
    curX = targetX;
    curY = targetY;
    primed = true;
    apply();
  } else {
    startLoop();
  }

  const node = event.target;
  if (!(node instanceof Element)) return;
  const edge = node.closest("[data-light-edge]");
  if (!(edge instanceof HTMLElement)) return;
  const rect = edge.getBoundingClientRect();
  edge.style.setProperty("--spec-x", `${event.clientX - rect.left}px`);
  edge.style.setProperty("--spec-y", `${event.clientY - rect.top}px`);
}

function onLayout() {
  if (!primed) return;
  apply();
}

function start() {
  if (listening || !canUse()) return;
  listening = true;
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", onLayout, { passive: true, capture: true });
  window.addEventListener("resize", onLayout, { passive: true });
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("scroll", onLayout, true);
  window.removeEventListener("resize", onLayout);
  stopLoop();
  primed = false;
  document.documentElement.style.removeProperty("--light-nx");
  document.documentElement.style.removeProperty("--light-ny");
}

export function attachCanvas(el: HTMLElement) {
  canvases.add(el);
  refs += 1;
  if (refs === 1) start();
  if (primed) apply();
}

export function detachCanvas(el: HTMLElement) {
  canvases.delete(el);
  el.style.removeProperty("--lantern-x");
  el.style.removeProperty("--lantern-y");
  refs = Math.max(0, refs - 1);
  if (refs === 0) stop();
}
