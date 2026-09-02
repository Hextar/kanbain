"use client";

import { useLayoutEffect, useRef, type ComponentProps, type Ref } from "react";
import { twMerge } from "tailwind-merge";

type TextareaProps = ComponentProps<"textarea"> & {
  autoGrow?: boolean;
};

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

export default function Textarea({
  className,
  autoGrow = false,
  onChange,
  value,
  ref,
  ...props
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!autoGrow) return;
    const node = innerRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [autoGrow, value]);

  return (
    <textarea
      {...props}
      ref={mergeRefs(innerRef, ref)}
      className={twMerge(
        "flex w-full flex-1 rounded-md border border-white/8 bg-[#12141c] px-2.5 py-2 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        autoGrow ? "min-h-0 resize-none overflow-hidden" : "min-h-28 resize-y",
        className,
      )}
      value={value}
      onChange={onChange}
    />
  );
}
