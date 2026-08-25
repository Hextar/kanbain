import NewProjectForm from "./components/NewProjectForm";
import ProjectCard from "./components/ProjectCard";
import ProjectEmptyState from "./components/ProjectEmptyState";
import { getProjects } from "./api/projects";

export default async function ProjectList() {
  const projects = await getProjects();
  const hasProjects = projects.length > 0;

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="flex items-center justify-between gap-4 p-6">
        <h1 className="text-3xl font-bold text-white">KanbAIn</h1>
        {hasProjects ? <NewProjectForm /> : null}
      </header>
      {hasProjects ? (
        <ul className="grid grid-cols-1 gap-4 overflow-y-auto px-6 pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <ProjectEmptyState />
      )}
    </div>
  );
}
