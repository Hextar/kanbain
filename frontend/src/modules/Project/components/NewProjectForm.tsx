"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "@uiKit/Button";
import NewProjectWizard from "./NewProjectWizard";
import type { Project } from "../types/Project";

type NewProjectFormProps = {
  size?: "hero" | "toolbar";
  onCreated: (project: Project) => void;
};

export default function NewProjectForm({
  size = "toolbar",
  onCreated,
}: NewProjectFormProps) {
  const [open, setOpen] = useState(false);
  const isHero = size === "hero";

  return (
    <>
      <Button
        className={isHero ? "px-8 py-4 text-lg" : undefined}
        size={isHero ? "lg" : "md"}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={isHero ? 22 : 18} />
          Create new project
        </span>
      </Button>
      <NewProjectWizard
        open={open}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />
    </>
  );
}
