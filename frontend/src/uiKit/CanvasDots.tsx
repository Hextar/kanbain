"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { attachCanvas, detachCanvas } from "@libraries/pointerLight";
import CanvasSurface from "./CanvasSurface";

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
    <CanvasSurface {...props} ref={ref} className={className}>
      {children}
    </CanvasSurface>
  );
}
