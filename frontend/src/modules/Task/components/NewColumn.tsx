import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Button from "@uiKit/Button";
import Input from "@uiKit/Input";

type NewColumnProps = {
  className?: string;
  onSubmit: (title: string) => void;
};

export default function NewColumn({ className, onSubmit }: NewColumnProps) {
  const [isComposing, setIsComposing] = useState(false);

  if (isComposing) {
    return (
      <NewColumnCard
        className={className}
        onSubmit={(title) => onSubmit(title)}
        onCancel={() => setIsComposing(false)}
      />
    );
  }

  return (
    <NewColumnButton
      className={className}
      onSubmit={() => setIsComposing(true)}
    />
  );
}

type NewColumnButtonProps = {
  className?: string;
  onSubmit: () => void;
};

function NewColumnButton({ className, onSubmit }: NewColumnButtonProps) {
  return (
    <div
      className={`flex h-[60px] min-w-[240px] flex-col rounded-lg border border-zinc-700 ${className ?? ""}`}
    >
      <Button
        className="flex h-full items-center justify-center gap-2"
        kind="outline"
        size="lg"
        variant="secondary"
        onClick={() => onSubmit()}
      >
        <Plus size={20} />
        Add new column
      </Button>
    </div>
  );
}

type NewColumnCardProps = {
  className?: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
};

function NewColumnCard({ className, onSubmit, onCancel }: NewColumnCardProps) {
  const [title, setTitle] = useState("");
  const trimmedTitle = title.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const title = event.currentTarget.title;
    event.preventDefault();
    if (!trimmedTitle) return;

    onSubmit(trimmedTitle);
    setTitle("");
    onCancel();
  }

  return (
    <form
      className={`flex min-w-[240px] flex-col gap-2 rounded-lg bg-zinc-800 p-4 ${className ?? ""}`}
      onSubmit={(event) => handleSubmit(event)}
    >
      <Input
        autoFocus
        className="bg-zinc-900"
        placeholder="Column name"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
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
          Add column
        </Button>
      </div>
    </form>
  );
}
