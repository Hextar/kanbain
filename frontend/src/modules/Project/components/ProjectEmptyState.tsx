import { FolderKanban } from "lucide-react";
import NewProjectForm from "./NewProjectForm";
import type { Project } from "../types/Project";

type ProjectEmptyStateProps = {
  onCreated: (project: Project) => void;
};

export default function ProjectEmptyState({ onCreated }: ProjectEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800 text-purple-400">
        <FolderKanban aria-hidden size={32} />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-3xl font-bold text-white">No projects yet</h2>
        <p className="text-base text-zinc-400">
          Describe the work, the team, and the deadline. The planner fills the
          board while you keep using the rest of the app.
        </p>
      </div>
      <NewProjectForm size="hero" onCreated={onCreated} />
    </div>
  );
}
