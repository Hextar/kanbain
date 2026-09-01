"use client";

import { twMerge } from "tailwind-merge";
import Tooltip from "@uiKit/Tooltip";

type TaskHeadingProps = {
  taskKey?: string;
  title: string;
  className?: string;
  tooltip?: boolean;
};

export default function TaskHeading({
  taskKey,
  title,
  className,
  tooltip = true,
}: TaskHeadingProps) {
  const titleClassName =
    "block w-full min-w-0 truncate font-medium text-zinc-100";
  const titleNode = <span className={titleClassName}>{title}</span>;

  return (
    <span className={twMerge("flex min-w-0 items-baseline gap-2", className)}>
      {taskKey ? (
        <span className="shrink-0 text-[11px] font-medium tracking-wide text-zinc-500">
          {taskKey}
        </span>
      ) : null}
      {tooltip ? (
        <Tooltip
          align="start"
          className="max-w-xs"
          content={title}
          wrapperClassName="min-w-0 flex-1 overflow-hidden"
        >
          {titleNode}
        </Tooltip>
      ) : (
        <span className="min-w-0 flex-1 overflow-hidden">{titleNode}</span>
      )}
    </span>
  );
}
