import { Columns3 } from "lucide-react";
import { SettingsButton } from "@modules/Settings/components/SettingsProvider";
import Skeleton from "@uiKit/Skeleton";

const CARD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export default function ProjectHomeSkeleton() {
  return (
    <div aria-busy className="flex min-h-dvh w-full flex-col" role="status">
      <span className="sr-only">Loading projects…</span>
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-purple-500/15 text-purple-300">
            <Columns3 aria-hidden size={16} />
          </div>
          <h1 className="text-sm font-semibold text-white">KanbAIn</h1>
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-md" />
          <SettingsButton size="xs" />
        </div>
      </header>
      <ul className="grid grid-cols-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 xl:grid-cols-3">
        {CARD_KEYS.map((key) => (
          <li key={key} className="min-w-0">
            <ProjectCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/6 bg-[#181b24] p-5 pt-4">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10" />
      <Skeleton className="absolute top-4 right-4 size-7 rounded-md" />
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 pr-12">
          <Skeleton className="h-5 w-2/3" />
          <div className="mt-1 min-h-10">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-4/5" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-[5.5rem] rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </article>
  );
}
