import { notFound } from "next/navigation";
import KanbanBoard from "@/Task/KanbanBoard";
import { getProject } from "@/Project/api/projects";
import { getColumns } from "@/Task/api/columns";

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
  return <KanbanBoard initialColumns={columns} project={project} />;
}
