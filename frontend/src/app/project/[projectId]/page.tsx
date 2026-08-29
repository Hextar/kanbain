import { notFound } from "next/navigation";
import ProjectWorkspace from "@modules/Project/components/ProjectWorkspace";
import { getProject } from "@modules/Project/api/projects";
import { getColumns } from "@modules/Task/api/columns";
import { getTasks } from "@modules/Task/api/tasks";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const projectPromise = getProject(projectId);
  const columnsPromise = getColumns(projectId);
  const tasksPromise = getTasks({ projectId });

  let project;
  try {
    project = await projectPromise;
  } catch {
    notFound();
  }

  const [columns, tasks] = await Promise.all([columnsPromise, tasksPromise]);
  return (
    <ProjectWorkspace
      initialColumns={columns}
      initialTasks={project.planStatus === "ready" ? tasks : undefined}
      project={project}
    />
  );
}
