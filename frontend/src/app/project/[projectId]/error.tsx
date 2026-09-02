"use client";

import Button from "@uiKit/Button";
import EmptyState from "@uiKit/EmptyState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
      size="compact"
      title="Could not load this board"
    />
  );
}
