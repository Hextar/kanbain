const FX_ROOT_ID = "board-fx-root";
const SNAP_WIPE_MS = 720;
const SNAP_TAIL_MS = 520;
const MATERIALIZE_MS = 460;
const BLAST_MS = 260;
const BLAST_TAIL_MS = 980;
const MAX_PARTICLES = 280;
const MIN_PARTICLES = 56;

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
};

type SnapJob = {
  clone: HTMLElement | null;
  rect: Rect;
  palette: string[];
  startAt: number;
  emitted: number;
  target: number;
};

type SpawnJob = {
  id: string;
  el: HTMLElement;
  startAt: number;
  emitted: number;
  target: number;
  palette: string[];
};

type BlastJob = {
  clone: HTMLElement | null;
  rect: Rect;
  palette: string[];
  startAt: number;
  burst: boolean;
};

type Shock = {
  x: number;
  y: number;
  startAt: number;
  ttl: number;
  r0: number;
  r1: number;
};

const pendingSpawns = new Set<string>();
const particles: Particle[] = [];
const snaps: SnapJob[] = [];
const spawns: SpawnJob[] = [];
const blasts: BlastJob[] = [];
const shocks: Shock[] = [];

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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
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

function particleBudget(rect: Rect) {
  return clamp(
    Math.round((rect.width * rect.height) / 240),
    MIN_PARTICLES,
    MAX_PARTICLES,
  );
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
    snaps.length > 0 ||
    spawns.length > 0 ||
    blasts.length > 0 ||
    shocks.length > 0
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
  const count = clamp(
    Math.round((rect.width * rect.height) / 110),
    120,
    420,
  );
  const colors = [
    ...palette,
    "rgba(255, 241, 242, 0.95)",
    "rgba(251, 113, 133, 0.95)",
    "rgba(244, 63, 94, 0.92)",
    "rgba(251, 191, 36, 0.88)",
    "rgba(255, 255, 255, 0.92)",
    "rgba(24, 24, 27, 0.9)",
  ];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    const spark = roll < 0.34;
    const smoke = roll > 0.84;
    const chunk = !spark && !smoke && roll > 0.7;
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    const angle = Math.atan2(y - cy, x - cx) + rand(-0.45, 0.45);
    const speed = spark
      ? rand(420, 980)
      : chunk
        ? rand(180, 420)
        : smoke
          ? rand(28, 120)
          : rand(240, 620);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(40, 180),
      rot: rand(0, Math.PI * 2),
      vr: rand(-14, 14),
      w: spark ? rand(1, 2.4) : chunk ? rand(8, 22) : smoke ? rand(10, 28) : rand(3, 9),
      h: spark ? rand(1, 2.2) : chunk ? rand(3, 8) : smoke ? rand(10, 28) : rand(2, 5),
      life: 0,
      ttl: spark ? rand(0.28, 0.55) : smoke ? rand(0.7, 1.25) : rand(0.55, 1.15),
      color: pickColor(colors),
      wind: rand(-20, 20),
      grav: spark ? 40 : smoke ? 18 : 520,
      shape: smoke || spark ? "circle" : "rect",
    });
  }
}

function emitDust(
  rect: Rect,
  x0: number,
  x1: number,
  count: number,
  palette: string[],
  mode: "snap" | "spawn",
) {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const band = Math.max(1, right - left);
  for (let i = 0; i < count; i++) {
    const spark = Math.random() < 0.16;
    const x = left + Math.random() * band;
    const y = rect.top + Math.random() * rect.height;
    const speed = spark ? rand(90, 260) : rand(50, 190);
    const inward = mode === "spawn" ? -1 : 1;
    particles.push({
      x,
      y,
      vx: inward * speed + rand(-18, 36),
      vy: rand(-70, 55),
      rot: rand(0, Math.PI * 2),
      vr: rand(-6, 6),
      w: spark ? rand(1, 2.2) : rand(2, 6.5),
      h: spark ? rand(1, 2.4) : rand(2, 5.5),
      life: 0,
      ttl: spark ? rand(0.28, 0.55) : rand(0.45, 1.05),
      color: pickColor(palette),
      wind: mode === "snap" ? 36 : -12,
      grav: mode === "snap" ? 95 : 18,
    });
  }
}

function advanceJobs(now: number, dt: number) {
  for (let i = snaps.length - 1; i >= 0; i--) {
    const job = snaps[i];
    if (now < job.startAt) continue;
    const t = clamp((now - job.startAt) / SNAP_WIPE_MS, 0, 1);
    const p = easeInOutCubic(t);
    if (job.clone) {
      job.clone.style.clipPath = `inset(0 0 0 ${(p * 100).toFixed(2)}%)`;
      if (p >= 1) {
        job.clone.remove();
        job.clone = null;
      }
    }
    const shouldHave = Math.floor(p * job.target);
    const extra = shouldHave - job.emitted;
    if (extra > 0) {
      const prev = (job.emitted / job.target) * job.rect.width;
      const next = p * job.rect.width;
      emitDust(
        job.rect,
        job.rect.left + prev,
        job.rect.left + next,
        extra,
        job.palette,
        "snap",
      );
      job.emitted = shouldHave;
    }
    if (now - job.startAt > SNAP_WIPE_MS + SNAP_TAIL_MS) {
      job.clone?.remove();
      snaps.splice(i, 1);
    }
  }

  for (let i = spawns.length - 1; i >= 0; i--) {
    const job = spawns[i];
    if (now < job.startAt) continue;
    const t = clamp((now - job.startAt) / MATERIALIZE_MS, 0, 1);
    const p = easeOutCubic(t);
    if (job.el.isConnected) {
      job.el.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
      job.el.style.opacity = String(clamp(p * 3.2, 0, 1));
      job.el.style.boxShadow = `0 0 ${Math.round(26 * (1 - p))}px rgba(167, 139, 250, ${(0.4 * (1 - p)).toFixed(2)})`;
    }
    const shouldHave = Math.floor(p * job.target);
    const extra = shouldHave - job.emitted;
    if (extra > 0) {
      const front = job.el.isConnected ? readRect(job.el) : null;
      const rect = front ?? { left: 0, top: 0, width: 0, height: 0 };
      if (rect.width > 0) {
        const prev = (job.emitted / job.target) * rect.width;
        const next = p * rect.width;
        emitDust(
          rect,
          rect.left + prev + 8,
          rect.left + next + 28,
          extra,
          job.palette,
          "spawn",
        );
      }
      job.emitted = shouldHave;
    }
    if (t >= 1) {
      pendingSpawns.delete(job.id);
      if (job.el.isConnected) {
        job.el.style.clipPath = "";
        job.el.style.opacity = "";
        job.el.style.boxShadow = "";
        job.el.removeAttribute("data-spawning");
      }
      spawns.splice(i, 1);
    }
  }

  for (let i = blasts.length - 1; i >= 0; i--) {
    const job = blasts[i];
    if (now < job.startAt) continue;
    if (!job.burst) {
      emitBlast(job.rect, job.palette);
      const cx = job.rect.left + job.rect.width / 2;
      const cy = job.rect.top + job.rect.height / 2;
      const reach = Math.max(job.rect.width, job.rect.height);
      shocks.push({
        x: cx,
        y: cy,
        startAt: now,
        ttl: 0.38,
        r0: reach * 0.08,
        r1: reach * 0.95,
      });
      shocks.push({
        x: cx,
        y: cy,
        startAt: now + 50,
        ttl: 0.48,
        r0: reach * 0.04,
        r1: reach * 1.25,
      });
      job.burst = true;
    }
    const t = clamp((now - job.startAt) / BLAST_MS, 0, 1);
    const p = easeOutCubic(t);
    if (job.clone) {
      job.clone.style.opacity = String(1 - p);
      job.clone.style.transform = `scale(${(1 + 0.16 * p).toFixed(3)}) rotate(${(p * 4).toFixed(2)}deg)`;
      job.clone.style.filter = `brightness(${(1 + 2.2 * (1 - p)).toFixed(2)})`;
      if (p >= 1) {
        job.clone.remove();
        job.clone = null;
      }
    }
    if (now - job.startAt > BLAST_MS + BLAST_TAIL_MS) {
      job.clone?.remove();
      blasts.splice(i, 1);
    }
  }

  for (let i = shocks.length - 1; i >= 0; i--) {
    if (now < shocks[i].startAt) continue;
    if (now - shocks[i].startAt > shocks[i].ttl * 1000) shocks.splice(i, 1);
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

function draw() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const now = lastTs;
  for (const shock of shocks) {
    if (now < shock.startAt) continue;
    const t = clamp((now - shock.startAt) / (shock.ttl * 1000), 0, 1);
    const p = easeOutCubic(t);
    ctx.save();
    ctx.beginPath();
    ctx.arc(shock.x, shock.y, shock.r0 + (shock.r1 - shock.r0) * p, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 228, 230, ${(0.55 * (1 - p)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 5 * (1 - p));
    ctx.stroke();
    ctx.restore();
  }
  for (const particle of particles) {
    const fade = 1 - particle.life / particle.ttl;
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rot);
    ctx.globalAlpha = fade * fade;
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
  ensureOverlay();
  el.setAttribute("data-spawning", "");
  el.style.opacity = "0";
  el.style.clipPath = "inset(0 100% 0 0)";
  spawns.push({
    id,
    el,
    startAt: performance.now(),
    emitted: 0,
    target: particleBudget(rect),
    palette: samplePalette(el),
  });
  startLoop();
}

export function releaseSpawn(el: HTMLElement | null) {
  if (!el) return;
  const index = spawns.findIndex((job) => job.el === el);
  if (index < 0) return;
  spawns.splice(index, 1);
  el.style.clipPath = "";
  el.style.opacity = "";
  el.style.boxShadow = "";
}

export function snapByTaskId(id: string) {
  const node = document.querySelector(`[data-task-id="${CSS.escape(id)}"]`);
  snap(node instanceof HTMLElement ? node : null);
}

export function snap(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  const rect = readRect(el);
  if (rect.width < 2 || rect.height < 2) return;
  ensureOverlay();
  const clone = el.cloneNode(true) as HTMLElement;
  neutralizeClone(clone, rect);
  cloneLayer?.append(clone);
  el.style.visibility = "hidden";
  snaps.push({
    clone,
    rect,
    palette: samplePalette(el),
    startAt: performance.now(),
    emitted: 0,
    target: particleBudget(rect),
  });
  startLoop();
}

export function shatterByProjectId(id: string) {
  const node = document.querySelector(
    `[data-project-id="${CSS.escape(id)}"]`,
  );
  shatter(node instanceof HTMLElement ? node : null);
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
