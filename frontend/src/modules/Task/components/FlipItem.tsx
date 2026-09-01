"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const FLIP_MS = 200;

type FlipItemProps = {
  enabled?: boolean;
  className?: string;
  children: ReactNode;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const flipDone = new WeakMap<HTMLElement, (event: TransitionEvent) => void>();

function playFlip(node: HTMLElement, dx: number, dy: number) {
  const previous = flipDone.get(node);
  if (previous) {
    node.removeEventListener("transitionend", previous);
    flipDone.delete(node);
  }

  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  if (prefersReducedMotion()) return;

  node.style.transition = "none";
  node.style.transform = `translate(${dx}px, ${dy}px)`;
  node.style.zIndex = "2";
  void node.offsetWidth;
  node.style.transition = `transform ${FLIP_MS}ms ease-out`;
  node.style.transform = "translate(0px, 0px)";

  const done = (event: TransitionEvent) => {
    if (event.target !== node || event.propertyName !== "transform") return;
    node.style.transition = "";
    node.style.transform = "";
    node.style.zIndex = "";
    node.removeEventListener("transitionend", done);
    flipDone.delete(node);
  };
  flipDone.set(node, done);
  node.addEventListener("transitionend", done);
}

export default function FlipItem({
  enabled = true,
  className,
  children,
}: FlipItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const visual = node.getBoundingClientRect();
    node.style.transition = "none";
    node.style.transform = "";
    node.style.zIndex = "";
    const layout = node.getBoundingClientRect();
    playFlip(node, visual.left - layout.left, visual.top - layout.top);
  });

  return (
    <div
      ref={ref}
      className={twMerge("motion-reduce:transform-none", className)}
    >
      {children}
    </div>
  );
}
