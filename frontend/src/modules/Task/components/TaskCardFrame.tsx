import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const taskCardClassName =
  "min-w-0 rounded-lg border border-white/8 bg-[#14161e] p-3 shadow-sm shadow-black/25";

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
