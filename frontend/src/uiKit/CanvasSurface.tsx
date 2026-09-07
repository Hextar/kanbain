import { twMerge } from "tailwind-merge";
import type { ComponentProps } from "react";

export default function CanvasSurface({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div {...props} className={twMerge("canvas-dots relative", className)}>
      <div aria-hidden className="canvas-lantern">
        <div className="canvas-lantern-wash" />
        <div className="canvas-lantern-dots" />
      </div>
      {children}
    </div>
  );
}
