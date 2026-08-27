"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import Button from "@uiKit/Button";
import Input from "@uiKit/Input";
import { useCreateMilestone, useMilestones } from "../hooks/useCatalog";

type HeaderProps = {
  className?: string;
  projectId: string;
  projectName: string;
};

export default function Header({
  className,
  projectId,
  projectName,
}: HeaderProps) {
  const { data: milestones = [] } = useMilestones(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const trimmedTitle = title.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) return;
    await createMilestone.mutateAsync(trimmedTitle);
    setTitle("");
    setIsAdding(false);
  }

  return (
    <div className={`flex justify-between gap-3 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
            href="/"
          >
            Projects
          </Link>
          <ChevronRight size={16} className="text-zinc-400" />
          <h1 className="text-3xl font-bold text-white">{projectName}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
          <Flag size={12} />
          Milestones
        </span>
        {milestones.map((milestone) => (
          <span
            key={milestone.id}
            className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300"
          >
            {milestone.title}
          </span>
        ))}
        {isAdding ? (
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <Input
              autoFocus
              className="h-8 min-w-[160px] bg-zinc-900 py-1 text-sm"
              placeholder="Milestone title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setTitle("");
                  setIsAdding(false);
                }
              }}
            />
            <Button
              disabled={!trimmedTitle || createMilestone.isPending}
              size="xs"
              type="submit"
            >
              Add
            </Button>
            <Button
              kind="ghost"
              size="xs"
              type="button"
              variant="secondary"
              onClick={() => {
                setTitle("");
                setIsAdding(false);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            kind="ghost"
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => setIsAdding(true)}
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} />
              Add milestone
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
