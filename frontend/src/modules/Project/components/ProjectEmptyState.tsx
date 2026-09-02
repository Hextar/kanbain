import { Columns3 } from "lucide-react";
import EmptyState from "@uiKit/EmptyState";
import NewProjectForm from "./NewProjectForm";
import type { Project } from "../types/Project";

type ProjectEmptyStateProps = {
  onCreated: (project: Project) => void;
};

export default function ProjectEmptyState({
  onCreated,
}: ProjectEmptyStateProps) {
  return (
    <EmptyState
      action={<NewProjectForm size="hero" onCreated={onCreated} />}
      body="Add a title and a short description. The planner can fill the board, or start from an empty one."
      glow
      icon={<Columns3 aria-hidden size={28} />}
      size="page"
      title="No projects yet"
    />
  );
}
