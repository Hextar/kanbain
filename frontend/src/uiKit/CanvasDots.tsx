"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { twMerge } from "tailwind-merge";
import { attachCanvas, detachCanvas } from "@libraries/pointerLight";

export default function CanvasDots({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    attachCanvas(node);
    return () => detachCanvas(node);
  }, []);

  return (
    <div
      {...props}
      ref={ref}
      className={twMerge("canvas-dots relative", className)}
    >
      <div aria-hidden className="canvas-lantern">
        <div className="canvas-lantern-wash" />
        <div className="canvas-lantern-dots" />
      </div>
      {children}
    </div>
  );
}
