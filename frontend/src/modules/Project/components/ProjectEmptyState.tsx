import { Columns3 } from "lucide-react";
import NewProjectForm from "./NewProjectForm";
import type { Project } from "../types/Project";

type ProjectEmptyStateProps = {
  onCreated: (project: Project) => void;
};

export default function ProjectEmptyState({
  onCreated,
}: ProjectEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -m-6 rounded-full bg-gradient-to-br from-purple-500/20 to-transparent blur-2xl"
        />
        <div className="relative flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-[#181b24] text-purple-300">
          <Columns3 aria-hidden size={28} />
        </div>
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-2xl font-semibold text-white">No projects yet</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Add a title and a short description. The planner can fill the board,
          or start from an empty one.
        </p>
      </div>
      <NewProjectForm size="hero" onCreated={onCreated} />
    </div>
  );
}
