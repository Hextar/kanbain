import Link from "next/link";
import EmptyState from "@uiKit/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      action={
        <Link
          className="text-purple-400 underline-offset-4 hover:underline"
          href="/"
        >
          Back to projects
        </Link>
      }
      size="compact"
      title="Project not found"
    />
  );
}
