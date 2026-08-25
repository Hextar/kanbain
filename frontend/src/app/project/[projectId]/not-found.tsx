import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-bold text-white">Project not found</h1>
      <Link
        className="text-purple-400 underline-offset-4 hover:underline"
        href="/"
      >
        Back to projects
      </Link>
    </div>
  );
}
