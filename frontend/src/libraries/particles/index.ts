const FX_ROOT_ID = "fx-root";
const MATERIALIZE_MS = 460;
const CRUSH_MS = 110;
const BLAST_MS = 280;
const BLAST_TAIL_MS = 1120;
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
  glow?: boolean;
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

type Flash = {
  x: number;
  y: number;
  startAt: number;
  ttl: number;
  radius: number;
};

const pendingSpawns = new Set<string>();
const particles: Particle[] = [];
const spawns: SpawnJob[] = [];
const blasts: BlastJob[] = [];
const shocks: Shock[] = [];
const flashes: Flash[] = [];

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
    spawns.length > 0 ||
    blasts.length > 0 ||
    shocks.length > 0 ||
    flashes.length > 0
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
    Math.round((rect.width * rect.height) / 72),
    160,
    520,
  );
  const colors = [
    ...palette,
    "rgba(255, 247, 237, 0.98)",
    "rgba(255, 241, 242, 0.95)",
    "rgba(251, 113, 133, 0.95)",
    "rgba(244, 63, 94, 0.92)",
    "rgba(251, 191, 36, 0.9)",
    "rgba(255, 255, 255, 0.95)",
    "rgba(24, 24, 27, 0.92)",
  ];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    const spark = roll < 0.42;
    const smoke = roll > 0.88;
    const shard = !spark && !smoke && roll > 0.62;
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    const angle = Math.atan2(y - cy, x - cx) + rand(-0.55, 0.55);
    const speed = spark
      ? rand(520, 1280)
      : shard
        ? rand(280, 640)
        : smoke
          ? rand(36, 140)
          : rand(320, 820);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(80, 280),
      rot: rand(0, Math.PI * 2),
      vr: shard ? rand(-22, 22) : rand(-16, 16),
      w: spark
        ? rand(1.2, 3.2)
        : shard
          ? rand(10, 28)
          : smoke
            ? rand(12, 32)
            : rand(3.5, 11),
      h: spark
        ? rand(1, 2.4)
        : shard
          ? rand(2.5, 7)
          : smoke
            ? rand(12, 32)
            : rand(2, 5.5),
      life: 0,
      ttl: spark
        ? rand(0.22, 0.48)
        : smoke
          ? rand(0.8, 1.4)
          : rand(0.55, 1.25),
      color: pickColor(colors),
      wind: rand(-28, 28),
      grav: spark ? 30 : smoke ? 14 : 640,
      shape: smoke || spark ? "circle" : "rect",
      glow: spark,
    });
  }
}

function emitDust(
  rect: Rect,
  x0: number,
  x1: number,
  count: number,
  palette: string[],
) {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const band = Math.max(1, right - left);
  for (let i = 0; i < count; i++) {
    const spark = Math.random() < 0.16;
    const x = left + Math.random() * band;
    const y = rect.top + Math.random() * rect.height;
    const speed = spark ? rand(90, 260) : rand(50, 190);
    particles.push({
      x,
      y,
      vx: -speed + rand(-18, 36),
      vy: rand(-70, 55),
      rot: rand(0, Math.PI * 2),
      vr: rand(-6, 6),
      w: spark ? rand(1, 2.2) : rand(2, 6.5),
      h: spark ? rand(1, 2.4) : rand(2, 5.5),
      life: 0,
      ttl: spark ? rand(0.28, 0.55) : rand(0.45, 1.05),
      color: pickColor(palette),
      wind: -12,
      grav: 18,
    });
  }
}

function advanceJobs(now: number, dt: number) {
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
    const elapsed = now - job.startAt;
    const crushing = elapsed < CRUSH_MS;
    if (crushing && job.clone) {
      const p = easeInCubic(elapsed / CRUSH_MS);
      job.clone.style.transform = `scale(${(1 - 0.14 * p).toFixed(3)})`;
      job.clone.style.filter = `brightness(${(1 + 3.4 * p).toFixed(2)}) saturate(${(1 + 1.4 * p).toFixed(2)})`;
    }
    if (!job.burst && !crushing) {
      emitBlast(job.rect, job.palette);
      const cx = job.rect.left + job.rect.width / 2;
      const cy = job.rect.top + job.rect.height / 2;
      const reach = Math.max(job.rect.width, job.rect.height);
      flashes.push({
        x: cx,
        y: cy,
        startAt: now,
        ttl: 0.22,
        radius: reach * 1.15,
      });
      shocks.push({
        x: cx,
        y: cy,
        startAt: now,
        ttl: 0.32,
        r0: reach * 0.06,
        r1: reach * 1.15,
      });
      shocks.push({
        x: cx,
        y: cy,
        startAt: now + 40,
        ttl: 0.5,
        r0: reach * 0.04,
        r1: reach * 1.55,
      });
      job.burst = true;
    }
    if (job.burst && job.clone) {
      const p = easeOutCubic(clamp((elapsed - CRUSH_MS) / BLAST_MS, 0, 1));
      job.clone.style.opacity = String(1 - p);
      job.clone.style.transform = `scale(${(0.86 + 0.52 * p).toFixed(3)}) rotate(${(p * 9).toFixed(2)}deg)`;
      job.clone.style.filter = `brightness(${(4.4 * (1 - p)).toFixed(2)})`;
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

  for (let i = shocks.length - 1; i >= 0; i--) {
    if (now < shocks[i].startAt) continue;
    if (now - shocks[i].startAt > shocks[i].ttl * 1000) shocks.splice(i, 1);
  }

  for (let i = flashes.length - 1; i >= 0; i--) {
    if (now < flashes[i].startAt) continue;
    if (now - flashes[i].startAt > flashes[i].ttl * 1000) flashes.splice(i, 1);
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
  for (const flash of flashes) {
    if (now < flash.startAt) continue;
    const t = clamp((now - flash.startAt) / (flash.ttl * 1000), 0, 1);
    const p = easeOutCubic(t);
    const radius = flash.radius * (0.35 + 0.65 * p);
    const gradient = ctx.createRadialGradient(
      flash.x,
      flash.y,
      0,
      flash.x,
      flash.y,
      radius,
    );
    const fade = 1 - p;
    gradient.addColorStop(0, `rgba(255, 252, 245, ${(0.72 * fade).toFixed(3)})`);
    gradient.addColorStop(0.28, `rgba(251, 113, 133, ${(0.32 * fade).toFixed(3)})`);
    gradient.addColorStop(1, "rgba(244, 63, 94, 0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const shock of shocks) {
    if (now < shock.startAt) continue;
    const t = clamp((now - shock.startAt) / (shock.ttl * 1000), 0, 1);
    const p = easeOutCubic(t);
    ctx.save();
    ctx.beginPath();
    ctx.arc(shock.x, shock.y, shock.r0 + (shock.r1 - shock.r0) * p, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 228, 230, ${(0.7 * (1 - p)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, 7 * (1 - p));
    ctx.stroke();
    ctx.restore();
  }
  for (const particle of particles) {
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
