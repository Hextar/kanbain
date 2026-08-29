import { notFound } from "next/navigation";
import ProjectWorkspace from "@modules/Project/components/ProjectWorkspace";
import { getProject } from "@modules/Project/api/projects";
import { fetchProjectBoard } from "@modules/Project/helpers/projectBoard";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const projectPromise = getProject(projectId);
  const boardPromise = fetchProjectBoard(projectId);

  let project;
  try {
    project = await projectPromise;
  } catch {
    notFound();
  }

  const board = await boardPromise;
  return (
    <ProjectWorkspace
      initialColumns={board.columns}
      initialTasks={project.planStatus === "ready" ? board.tasks : undefined}
      project={project}
    />
  );
}
