import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

const SIZE_CLASS = {
  sm: "rounded-lg border border-white/8 bg-[#14161e] p-3 shadow-sm shadow-black/25",
  md: "rounded-xl border border-white/6 bg-[#181b24] p-5",
} as const;

export type CardSize = keyof typeof SIZE_CLASS;

export type CardProps = ComponentProps<"div"> & {
  size?: CardSize;
};

export function cardClassName(size: CardSize = "sm") {
  return twMerge("light-edge light-edge-card", SIZE_CLASS[size]);
}

export default function Card({
  size = "sm",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={twMerge(cardClassName(size), className)}
      data-light-edge=""
    >
      {children}
    </div>
  );
}
