import { useEffect, useRef, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const COLLAPSE_MS = 200;

export default function CollapsibleSlot({
  present,
  children,
}: {
  present: boolean;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef(false);
  const [height, setHeight] = useState<number | undefined>(
    present ? undefined : 0,
  );

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    if (!primedRef.current) {
      primedRef.current = true;
      return;
    }

    if (present) {
      setHeight(node.scrollHeight);
      const timeout = window.setTimeout(
        () => setHeight(undefined),
        COLLAPSE_MS,
      );
      return () => window.clearTimeout(timeout);
    }

    setHeight(node.getBoundingClientRect().height);
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setHeight(0));
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [present]);

  return (
    <div
      className="motion-reduce:transition-none"
      style={{
        height: height === undefined ? "auto" : height,
        overflow: height === undefined ? "visible" : "hidden",
        transitionProperty: "height",
        transitionDuration: `${COLLAPSE_MS}ms`,
        transitionTimingFunction: "ease-out",
      }}
    >
      <div
        ref={innerRef}
        className={twMerge(!present && "pointer-events-none")}
      >
        {children}
      </div>
    </div>
  );
}
