import { useState, type FormEvent } from "react";
import Button from "@/uiKit/Button";
import TaskCardFrame from "./TaskCardFrame";

type NewTaskCardProps = {
  onSubmit: (title: string) => void;
  onCancel: () => void;
};

export default function NewTaskCard({ onCancel, onSubmit }: NewTaskCardProps) {
  const [title, setTitle] = useState("");
  const trimmedTitle = title.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedTitle) return;

    onSubmit(trimmedTitle);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <TaskCardFrame className="flex min-h-[88px] flex-col justify-between gap-3 ring-1 ring-purple-500/40">
        <textarea
          autoFocus
          className="min-h-[40px] w-full resize-none bg-transparent text-sm leading-snug font-medium text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none"
          placeholder="Card title"
          rows={2}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex flex-row items-center justify-end gap-2">
          <Button
            kind="outline"
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
          <Button disabled={!trimmedTitle} size="xs" type="submit">
            Add card
          </Button>
        </div>
      </TaskCardFrame>
    </form>
  );
}
