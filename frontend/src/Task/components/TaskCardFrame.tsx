import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const taskCardClassName =
  "rounded-xl border border-zinc-700/90 bg-zinc-950 p-2 shadow-md shadow-black/40";

type TaskCardFrameProps = {
  children: ReactNode;
  className?: string;
};

export default function TaskCardFrame({
  children,
  className,
}: TaskCardFrameProps) {
  return (
    <div className={twMerge(taskCardClassName, className)}>{children}</div>
  );
}
