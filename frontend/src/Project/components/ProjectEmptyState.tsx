import { FolderKanban } from "lucide-react";
import NewProjectForm from "./NewProjectForm";

export default function ProjectEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800 text-purple-400">
        <FolderKanban aria-hidden size={32} />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-3xl font-bold text-white">No projects yet</h2>
        <p className="text-base text-zinc-400">
          Create a project to open its Kanban board. You can add the team,
          deadline, and plan later.
        </p>
      </div>
      <NewProjectForm size="hero" />
    </div>
  );
}
