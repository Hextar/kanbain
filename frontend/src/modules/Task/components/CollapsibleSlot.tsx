import { useEffect, useRef, useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { COLLAPSE_MS } from "../helpers/useListPresence";

export default function CollapsibleSlot({
  present,
  animateEnter = false,
  children,
}: {
  present: boolean;
  animateEnter?: boolean;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef(false);
  const [height, setHeight] = useState<number | undefined>(
    present && !animateEnter ? undefined : 0,
  );

  useEffect(() => {
    const node = innerRef.current;
    if (!node) return;

    if (!primedRef.current) {
      primedRef.current = true;
      if (!animateEnter) return;
    }

    if (present) {
      setHeight(node.scrollHeight);
      const timeout = window.setTimeout(() => setHeight(undefined), COLLAPSE_MS);
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
  }, [animateEnter, present]);

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
      <div ref={innerRef} className={twMerge(!present && "pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}
