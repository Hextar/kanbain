import { twMerge } from "tailwind-merge";

export type ColorSwatchProps = {
  label: string;
  colorClassName: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export default function ColorSwatch({
  label,
  colorClassName,
  selected = false,
  onClick,
  className,
}: ColorSwatchProps) {
  return (
    <button
      aria-label={label}
      aria-selected={selected}
      className={twMerge(
        "flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        className,
      )}
      role="option"
      type="button"
      onClick={onClick}
    >
      <span
        className={twMerge(
          "size-3.5 rounded-full",
          colorClassName,
          selected && "ring-2 ring-white ring-offset-2 ring-offset-[#181b24]",
        )}
      />
    </button>
  );
}
