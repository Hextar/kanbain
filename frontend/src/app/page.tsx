import { Suspense } from "react";
import ProjectList from "@modules/Project/ProjectList";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6 text-zinc-400">Loading projects…</p>}>
      <ProjectList />
    </Suspense>
  );
}
