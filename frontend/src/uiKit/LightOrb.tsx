import { twMerge } from "tailwind-merge";

type LightOrbProps = {
  className?: string;
};

export default function LightOrb({ className }: LightOrbProps) {
  return (
    <div
      aria-hidden
      className={twMerge(
        "light-orb pointer-events-none absolute -top-16 -right-8 size-44 rounded-full bg-gradient-to-br from-violet-400/30 to-transparent opacity-40 blur-2xl",
        className,
      )}
    />
  );
}
