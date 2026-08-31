import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  Aperture,
  Box,
  Compass,
  Cpu,
  Feather,
  Flame,
  Gem,
  Globe,
  Hexagon,
  Layers,
  Leaf,
  Mountain,
  Orbit,
  Rocket,
  Sparkles,
} from "lucide-react";

export type ProjectAccent = {
  bar: string;
  tile: string;
  glow: string;
  hoverBorder: string;
};

const ACCENTS: ProjectAccent[] = [
  {
    bar: "bg-sky-400",
    tile: "bg-sky-500/15 text-sky-300",
    glow: "from-sky-400/40",
    hoverBorder: "hover:border-sky-400/50",
  },
  {
    bar: "bg-amber-400",
    tile: "bg-amber-500/15 text-amber-300",
    glow: "from-amber-400/40",
    hoverBorder: "hover:border-amber-400/50",
  },
  {
    bar: "bg-orange-500",
    tile: "bg-orange-500/15 text-orange-300",
    glow: "from-orange-400/40",
    hoverBorder: "hover:border-orange-400/50",
  },
  {
    bar: "bg-fuchsia-400",
    tile: "bg-fuchsia-500/15 text-fuchsia-300",
    glow: "from-fuchsia-400/40",
    hoverBorder: "hover:border-fuchsia-400/50",
  },
  {
    bar: "bg-violet-400",
    tile: "bg-violet-500/15 text-violet-300",
    glow: "from-violet-400/40",
    hoverBorder: "hover:border-violet-400/50",
  },
  {
    bar: "bg-teal-400",
    tile: "bg-teal-500/15 text-teal-300",
    glow: "from-teal-400/40",
    hoverBorder: "hover:border-teal-400/50",
  },
  {
    bar: "bg-emerald-400",
    tile: "bg-emerald-500/15 text-emerald-300",
    glow: "from-emerald-400/40",
    hoverBorder: "hover:border-emerald-400/50",
  },
  {
    bar: "bg-rose-400",
    tile: "bg-rose-500/15 text-rose-300",
    glow: "from-rose-400/40",
    hoverBorder: "hover:border-rose-400/50",
  },
  {
    bar: "bg-cyan-400",
    tile: "bg-cyan-500/15 text-cyan-300",
    glow: "from-cyan-400/40",
    hoverBorder: "hover:border-cyan-400/50",
  },
  {
    bar: "bg-indigo-400",
    tile: "bg-indigo-500/15 text-indigo-300",
    glow: "from-indigo-400/40",
    hoverBorder: "hover:border-indigo-400/50",
  },
];

const ICONS: LucideIcon[] = [
  Sparkles,
  Hexagon,
  Orbit,
  Gem,
  Compass,
  Rocket,
  Layers,
  Cpu,
  Globe,
  Feather,
  Anchor,
  Aperture,
  Flame,
  Leaf,
  Mountain,
  Box,
];

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function projectIdentity(id: string): {
  accent: ProjectAccent;
  Icon: LucideIcon;
} {
  const hash = hashString(id);
  return {
    accent: ACCENTS[hash % ACCENTS.length],
    Icon: ICONS[Math.floor(hash / ACCENTS.length) % ICONS.length],
  };
}

export function projectInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /[a-z]/i.test(part));
  if (parts.length === 0) {
    const fallback = name.trim().slice(0, 1).toUpperCase();
    return fallback || "?";
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function memberAccent(id: string): string {
  return ACCENTS[hashString(id) % ACCENTS.length].tile;
}
