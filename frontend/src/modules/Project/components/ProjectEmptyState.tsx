"use client";

import { Columns3 } from "lucide-react";
import { useT } from "@/i18n";
import EmptyState from "@uiKit/EmptyState";
import NewProjectForm from "./NewProjectForm";
import type { Project } from "../types/Project";

type ProjectEmptyStateProps = {
  onCreated: (project: Project) => void;
};

export default function ProjectEmptyState({
  onCreated,
}: ProjectEmptyStateProps) {
  const t = useT();

  return (
    <EmptyState
      action={<NewProjectForm size="hero" onCreated={onCreated} />}
      body={t("project.emptyBody")}
      glow
      icon={<Columns3 aria-hidden size={28} />}
      size="page"
      title={t("project.emptyTitle")}
    />
  );
}
