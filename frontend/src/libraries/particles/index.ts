const FX_ROOT_ID = "fx-root";
const MATERIALIZE_MS = 180;
const CRUSH_MS = 70;
const BLAST_MS = 180;
const BLAST_TAIL_MS = 380;
const CELEBRATE_DELAY_MS = 60;
const CELEBRATE_WAVE_MS = 90;
const CARD_RADIUS = 8;

export type CelebrateKind = "progress" | "complete";

const CELEBRATE = {
  progress: { scale: 0.42, motion: 0.72, waves: 1, ttl: 900 },
  complete: { scale: 1, motion: 1, waves: 2, ttl: 1400 },
} as const;

const CELEBRATE_COLORS = [
  "rgba(52, 211, 153, 0.95)",
  "rgba(110, 231, 183, 0.88)",
  "rgba(251, 191, 36, 0.95)",
  "rgba(253, 224, 71, 0.9)",
  "rgba(251, 146, 60, 0.88)",
  "rgba(255, 255, 255, 0.92)",
  "rgba(244, 114, 182, 0.78)",
  "rgba(125, 211, 252, 0.82)",
];

type Rect = { left: number; top: number; width: number; height: number };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  life: number;
  ttl: number;
  color: string;
  wind: number;
  grav: number;
  shape?: "rect" | "circle";
  glow?: boolean;
  behind?: boolean;
};

type SpawnJob = {
  id: string;
  el: HTMLElement;
  startAt: number;
};

type BlastJob = {
  clone: HTMLElement | null;
  rect: Rect;
  palette: string[];
  startAt: number;
  burst: boolean;
};

type CelebrateJob = {
  el: HTMLElement | null;
  rect: Rect;
  startAt: number;
  ttl: number;
  waves: number;
  maxWaves: number;
  scale: number;
  motion: number;
  palette: string[];
};

const pendingSpawns = new Set<string>();
const pendingCelebrates = new Map<string, CelebrateKind>();
const particles: Particle[] = [];
const spawns: SpawnJob[] = [];
const blasts: BlastJob[] = [];
const celebrates: CelebrateJob[] = [];

let overlay: HTMLElement | null = null;
let cloneLayer: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let raf = 0;
let lastTs = 0;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number) {
  return t * t * t;
}

function readRect(el: HTMLElement): Rect {
  const box = el.getBoundingClientRect();
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
  };
}

function usableColor(value: string) {
  if (!value || value === "transparent") return false;
  return !value.endsWith(", 0)") && value !== "rgba(0, 0, 0, 0)";
}

function samplePalette(el: HTMLElement): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    if (!usableColor(value) || seen.has(value)) return;
    seen.add(value);
    colors.push(value);
  };
  const visit = (node: Element) => {
    const style = getComputedStyle(node);
    add(style.backgroundColor);
    add(style.borderTopColor);
    add(style.color);
  };
  visit(el);
  const descendants = el.querySelectorAll("*");
  const stride = Math.max(1, Math.floor(descendants.length / 12));
  for (let i = 0; i < descendants.length && colors.length < 14; i += stride) {
    visit(descendants[i]);
  }
  add("rgba(250, 250, 252, 0.92)");
  add("rgba(212, 212, 216, 0.85)");
  add("rgba(255, 255, 255, 0.7)");
  return colors;
}

function pickColor(palette: string[]) {
  return palette[(Math.random() * palette.length) | 0] ?? "#e4e4e7";
}

function neutralizeClone(clone: HTMLElement, rect: Rect) {
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.querySelectorAll("dialog").forEach((node) => node.remove());
  clone
    .querySelectorAll("input, textarea, select, button, a")
    .forEach((node) => {
      node.setAttribute("tabindex", "-1");
      if ("disabled" in node) (node as HTMLButtonElement).disabled = true;
    });
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.pointerEvents = "none";
  clone.style.zIndex = "1";
  clone.style.overflow = "hidden";
  clone.style.boxSizing = "border-box";
}

function ensureOverlay() {
  if (overlay && canvas && ctx && cloneLayer) return;
  const root = document.createElement("div");
  root.id = FX_ROOT_ID;
  root.setAttribute("aria-hidden", "true");
  root.style.cssText =
    "position:fixed;inset:0;z-index:50;pointer-events:none;overflow:hidden";

  const clones = document.createElement("div");
  clones.style.cssText = "position:absolute;inset:0";

  const surface = document.createElement("canvas");
  surface.style.cssText = "position:absolute;inset:0;width:100%;height:100%";

  root.append(clones, surface);
  document.body.append(root);

  overlay = root;
  cloneLayer = clones;
  canvas = surface;
  ctx = surface.getContext("2d");
  syncCanvas();
  window.addEventListener("resize", onResize, { passive: true });
}

function syncCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  const nextW = Math.round(width * dpr);
  const nextH = Math.round(height * dpr);
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function busy() {
  return (
    particles.length > 0 ||
    spawns.length > 0 ||
    blasts.length > 0 ||
    celebrates.length > 0
  );
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
  ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function emitBlast(rect: Rect, palette: string[]) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = clamp(Math.round((rect.width * rect.height) / 520), 12, 28);
  const colors = [...palette.slice(0, 6), "rgba(212, 212, 216, 0.55)"];
  for (let i = 0; i < count; i++) {
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    const angle = Math.atan2(y - cy, x - cx) + rand(-0.25, 0.25);
    const speed = rand(40, 120);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(8, 36),
      rot: rand(0, Math.PI * 2),
      vr: rand(-4, 4),
      w: rand(2, 5),
      h: rand(1.4, 3),
      life: 0,
      ttl: rand(0.22, 0.48),
      color: pickColor(colors),
      wind: rand(-6, 6),
      grav: 160,
      shape: "rect",
    });
  }
}

function emitCelebrate(
  rect: Rect,
  palette: string[],
  countScale: number,
  motion: number,
) {
  const count = Math.round(
    clamp(Math.round((rect.width * rect.height) / 170), 42, 72) * countScale,
  );
  const colors = [...CELEBRATE_COLORS, ...palette.slice(0, 3)];
  for (let i = 0; i < count; i++) {
    const edge = i % 3;
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    let angle = -Math.PI / 2;
    if (edge === 0) {
      x = rect.left + rand(0, 8);
      y = rect.top + rect.height * rand(0.12, 0.88);
      angle = Math.PI + rand(-0.55, 0.35);
    } else if (edge === 1) {
      x = rect.left + rect.width - rand(0, 8);
      y = rect.top + rect.height * rand(0.12, 0.88);
      angle = rand(-0.35, 0.55);
    } else {
      x = rect.left + rect.width * rand(0.08, 0.92);
      y = rect.top + rand(0, 6);
      angle = -Math.PI / 2 + rand(-0.7, 0.7);
    }
    const spark = Math.random() < 0.3;
    const speed = (spark ? rand(50, 130) : rand(80, 210)) * motion;
    const lift = rand(70, 190) * motion;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - lift,
      rot: rand(0, Math.PI * 2),
      vr: (spark ? rand(-5, 5) : rand(-16, 16)) * motion,
      w: (spark ? rand(1.4, 2.6) : rand(3.2, 7.5)) * motion,
      h: (spark ? rand(1.2, 2.2) : rand(1.4, 2.8)) * motion,
      life: 0,
      ttl: (spark ? rand(0.5, 0.9) : rand(0.75, 1.35)) * (0.82 + 0.18 * motion),
      color: pickColor(colors),
      wind: rand(-14, 14) * motion,
      grav: spark ? 110 : 320,
      shape: spark ? "circle" : "rect",
      glow: spark,
      behind: true,
    });
  }
}

function advanceJobs(now: number, dt: number) {
  for (let i = spawns.length - 1; i >= 0; i--) {
    const job = spawns[i];
    if (now < job.startAt) continue;
    const t = clamp((now - job.startAt) / MATERIALIZE_MS, 0, 1);
    const p = easeOutCubic(t);
    if (job.el.isConnected) job.el.style.opacity = String(p);
    if (t >= 1) {
      pendingSpawns.delete(job.id);
      if (job.el.isConnected) {
        job.el.style.opacity = "";
        job.el.removeAttribute("data-spawning");
      }
      spawns.splice(i, 1);
    }
  }

  for (let i = blasts.length - 1; i >= 0; i--) {
    const job = blasts[i];
    if (now < job.startAt) continue;
    const elapsed = now - job.startAt;
    const crushing = elapsed < CRUSH_MS;
    if (crushing && job.clone) {
      const p = easeInCubic(elapsed / CRUSH_MS);
      job.clone.style.transform = `scale(${(1 - 0.04 * p).toFixed(3)})`;
      job.clone.style.opacity = String(1 - 0.12 * p);
    }
    if (!job.burst && !crushing) {
      emitBlast(job.rect, job.palette);
      job.burst = true;
    }
    if (job.burst && job.clone) {
      const p = easeOutCubic(clamp((elapsed - CRUSH_MS) / BLAST_MS, 0, 1));
      job.clone.style.opacity = String(1 - p);
      job.clone.style.transform = `scale(${(0.96 - 0.06 * p).toFixed(3)})`;
      if (p >= 1) {
        job.clone.remove();
        job.clone = null;
      }
    }
    if (elapsed > CRUSH_MS + BLAST_MS + BLAST_TAIL_MS) {
      job.clone?.remove();
      blasts.splice(i, 1);
    }
  }

  for (let i = celebrates.length - 1; i >= 0; i--) {
    const job = celebrates[i];
    if (job.el?.isConnected) job.rect = readRect(job.el);
    if (now < job.startAt) continue;
    const elapsed = now - job.startAt;
    if (job.waves < 1) {
      emitCelebrate(job.rect, job.palette, job.scale, job.motion);
      job.waves = 1;
    }
    if (
      job.maxWaves > 1 &&
      job.waves < 2 &&
      elapsed > CELEBRATE_WAVE_MS
    ) {
      emitCelebrate(job.rect, job.palette, job.scale * 0.55, job.motion);
      job.waves = 2;
    }
    if (elapsed > job.ttl) celebrates.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += particle.grav * dt;
    particle.vx += particle.wind * dt;
    particle.rot += particle.vr * dt;
    if (particle.life >= particle.ttl) particles.splice(i, 1);
  }
}

function punchCelebrateHoles() {
  if (!ctx || celebrates.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (const job of celebrates) {
    ctx.beginPath();
    ctx.roundRect(
      job.rect.left,
      job.rect.top,
      job.rect.width,
      job.rect.height,
      CARD_RADIUS,
    );
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  drawParticles(true);
  punchCelebrateHoles();
  drawParticles(false);
}

function drawParticles(behind: boolean) {
  if (!ctx) return;
  for (const particle of particles) {
    if (Boolean(particle.behind) !== behind) continue;
    const fade = 1 - particle.life / particle.ttl;
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rot);
    ctx.globalAlpha = fade * fade;
    if (particle.glow) ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = particle.color;
    if (particle.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, particle.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h);
    }
    ctx.restore();
  }
}

function tick(now: number) {
  const dt = lastTs ? clamp((now - lastTs) / 1000, 0.001, 0.048) : 0.016;
  lastTs = now;
  advanceJobs(now, dt);
  draw();
  if (!busy()) {
    stopLoop();
    return;
  }
  raf = requestAnimationFrame(tick);
}

function onResize() {
  if (!overlay) return;
  syncCanvas();
}

export function markSpawn(id: string) {
  if (prefersReducedMotion()) return;
  pendingSpawns.add(id);
}

export function isSpawnPending(id: string) {
  return pendingSpawns.has(id);
}

export function consumeSpawn(id: string, el: HTMLElement | null) {
  if (!el || !pendingSpawns.has(id) || prefersReducedMotion()) return;
  if (spawns.some((job) => job.el === el)) return;
  const rect = readRect(el);
  if (rect.width < 2 || rect.height < 2) {
    pendingSpawns.delete(id);
    el.removeAttribute("data-spawning");
    return;
  }
  el.setAttribute("data-spawning", "");
  el.style.opacity = "0";
  spawns.push({
    id,
    el,
    startAt: performance.now(),
  });
  startLoop();
}

export function releaseSpawn(el: HTMLElement | null) {
  if (!el) return;
  const index = spawns.findIndex((job) => job.el === el);
  if (index < 0) return;
  spawns.splice(index, 1);
  el.style.opacity = "";
}

export function markCelebrate(id: string, kind: CelebrateKind = "complete") {
  if (prefersReducedMotion()) return;
  const previous = pendingCelebrates.get(id);
  pendingCelebrates.set(
    id,
    previous === "complete" || kind === "complete" ? "complete" : "progress",
  );
  window.setTimeout(() => pendingCelebrates.delete(id), 2500);
}

export function consumeCelebrate(id: string, el: HTMLElement | null) {
  if (!el || !pendingCelebrates.has(id) || prefersReducedMotion()) return;
  if (celebrates.some((job) => job.el === el)) return;
  const kind = pendingCelebrates.get(id) ?? "complete";
  pendingCelebrates.delete(id);
  const rect = readRect(el);
  if (rect.width < 2 || rect.height < 2) return;
  const preset = CELEBRATE[kind];
  ensureOverlay();
  celebrates.push({
    el,
    rect,
    startAt: performance.now() + CELEBRATE_DELAY_MS,
    ttl: preset.ttl,
    waves: 0,
    maxWaves: preset.waves,
    scale: preset.scale,
    motion: preset.motion,
    palette: samplePalette(el),
  });
  startLoop();
}

export function releaseCelebrate(el: HTMLElement | null) {
  if (!el) return;
  const job = celebrates.find((item) => item.el === el);
  if (job) job.el = null;
}

function elementByAttr(attr: string, value: string) {
  const node = document.querySelector(`[${attr}="${CSS.escape(value)}"]`);
  return node instanceof HTMLElement ? node : null;
}

export function shatter(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  const rect = readRect(el);
  if (rect.width < 2 || rect.height < 2) return;
  ensureOverlay();
  const clone = el.cloneNode(true) as HTMLElement;
  neutralizeClone(clone, rect);
  clone.style.transformOrigin = "center center";
  cloneLayer?.append(clone);
  el.style.visibility = "hidden";
  blasts.push({
    clone,
    rect,
    palette: samplePalette(el),
    startAt: performance.now(),
    burst: false,
  });
  startLoop();
}

export function shatterByAttr(attr: string, value: string) {
  shatter(elementByAttr(attr, value));
}
