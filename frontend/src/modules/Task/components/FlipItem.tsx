"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { COLLAPSE_MS } from "../helpers/useListPresence";

type FlipItemProps = {
  index: number;
  enabled?: boolean;
  className?: string;
  children: ReactNode;
};

type FlipSnapshot = {
  index: number;
  x: number;
  y: number;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playFlip(node: HTMLElement, dx: number, dy: number) {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  if (prefersReducedMotion()) return;

  node.style.transition = "none";
  node.style.transform = `translate(${dx}px, ${dy}px)`;
  node.style.zIndex = "2";
  void node.offsetWidth;
  node.style.transition = `transform ${COLLAPSE_MS}ms ease-out`;
  node.style.transform = "translate(0px, 0px)";

  const done = (event: TransitionEvent) => {
    if (event.target !== node || event.propertyName !== "transform") return;
    node.style.transition = "";
    node.style.transform = "";
    node.style.zIndex = "";
    node.removeEventListener("transitionend", done);
  };
  node.addEventListener("transitionend", done);
}

export default function FlipItem({
  index,
  enabled = true,
  className,
  children,
}: FlipItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<FlipSnapshot | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const last = prev.current;
    prev.current = { index, x: rect.left, y: rect.top };
    if (!enabled || !last || last.index === index) return;
    playFlip(node, last.x - rect.left, last.y - rect.top);
  });

  return (
    <div ref={ref} className={twMerge("motion-reduce:transform-none", className)}>
      {children}
    </div>
  );
}
