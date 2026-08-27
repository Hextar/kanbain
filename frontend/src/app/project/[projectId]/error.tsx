"use client";

import Button from "@uiKit/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-bold text-white">
        Could not load this board
      </h1>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
