"use client";

import { useState, useTransition, type FormEvent } from "react";
import { unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";
import Button from "@/uiKit/Button";
import Input from "@/uiKit/Input";
import { createProjectAction } from "../actions/createProject";

type NewProjectFormProps = {
  size?: "hero" | "toolbar";
};

export default function NewProjectForm({
  size = "toolbar",
}: NewProjectFormProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const trimmedName = name.trim();
  const isHero = size === "hero";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedName || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await createProjectAction(trimmedName);
      } catch (error) {
        unstable_rethrow(error);
        setError("Could not create the project.");
      }
    });
  }

  if (!isComposing) {
    return (
      <Button
        className={isHero ? "px-8 py-4 text-lg" : undefined}
        disabled={isPending}
        size={isHero ? "lg" : "md"}
        type="button"
        onClick={() => setIsComposing(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Plus size={isHero ? 22 : 18} />
          Create new project
        </span>
      </Button>
    );
  }

  return (
    <form
      className={
        isHero
          ? "flex w-full max-w-md flex-col gap-3 rounded-xl bg-zinc-800 p-6"
          : "flex flex-row items-center gap-2"
      }
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="new-project-name">
        Project name
      </label>
      <Input
        autoFocus
        className={isHero ? "bg-zinc-900" : "min-w-[220px]"}
        id="new-project-name"
        placeholder="Project name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsComposing(false);
        }}
      />
      <div className="flex flex-row items-center gap-2">
        <Button
          disabled={!trimmedName || isPending}
          size={isHero ? "md" : "sm"}
          type="submit"
        >
          {isPending ? "Creating…" : "Create project"}
        </Button>
        <Button
          disabled={isPending}
          kind="outline"
          size={isHero ? "md" : "sm"}
          type="button"
          variant="secondary"
          onClick={() => setIsComposing(false)}
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
