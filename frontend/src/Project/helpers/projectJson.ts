import type { Project } from "../types/Project";

export type ProjectJson = {
  id: string;
  name: string;
  goal?: string;
  description?: string;
  deadlineKind: Project["deadlineKind"];
  deadlineAt?: string;
  methodology: Project["methodology"];
  qualityBar: Project["qualityBar"];
  riskTolerance: Project["riskTolerance"];
  createdAt?: string;
  updatedAt?: string;
  members?: Project["members"];
};

export function projectFromJson(json: ProjectJson): Project {
  return {
    id: json.id,
    name: json.name,
    goal: json.goal,
    description: json.description,
    deadlineKind: json.deadlineKind,
    deadlineAt: json.deadlineAt ? new Date(json.deadlineAt) : undefined,
    methodology: json.methodology,
    qualityBar: json.qualityBar,
    riskTolerance: json.riskTolerance,
    createdAt: json.createdAt ? new Date(json.createdAt) : undefined,
    updatedAt: json.updatedAt ? new Date(json.updatedAt) : undefined,
    members: json.members ?? [],
  };
}

export function projectToJson(project: Project): ProjectJson {
  return {
    id: project.id,
    name: project.name,
    goal: project.goal,
    description: project.description,
    deadlineKind: project.deadlineKind,
    deadlineAt: project.deadlineAt?.toISOString(),
    methodology: project.methodology,
    qualityBar: project.qualityBar,
    riskTolerance: project.riskTolerance,
    createdAt: project.createdAt?.toISOString(),
    updatedAt: project.updatedAt?.toISOString(),
    members: project.members,
  };
}
