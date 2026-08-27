import ProjectHome from "./ProjectHome";
import { getProjects } from "./api/projects";

export default async function ProjectList() {
  const projects = await getProjects();
  return <ProjectHome initialProjects={projects} />;
}
