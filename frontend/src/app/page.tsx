import { Suspense } from "react";
import ProjectList from "@modules/Project/ProjectList";
import ProjectHomeSkeleton from "@modules/Project/components/ProjectHomeSkeleton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<ProjectHomeSkeleton />}>
      <ProjectList />
    </Suspense>
  );
}
