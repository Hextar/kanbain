import { notFound } from "next/navigation";
import ProjectWorkspace from "@modules/Project/components/ProjectWorkspace";
import { getProject } from "@modules/Project/api/projects";
import { getColumns } from "@modules/Task/api/columns";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const projectPromise = getProject(projectId);
  const columnsPromise = getColumns(projectId);

  let project;
  try {
    project = await projectPromise;
  } catch {
    notFound();
  }

  const columns = await columnsPromise;
  return <ProjectWorkspace initialColumns={columns} project={project} />;
}
