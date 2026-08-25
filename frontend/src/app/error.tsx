"use client";

import Button from "@/uiKit/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-bold text-white">Could not load projects</h1>
      <p className="text-zinc-400">
        The Flask API may be down. Start Postgres and the backend, then try
        again.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
