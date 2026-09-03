import type { Project } from "../types/Project";

function asCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

export type ProjectJson = {
  id: string;
  name: string;
  goal?: string;
  description?: string;
  prdUrl?: string;
  designUrls?: string[];
  repoUrl?: string;
  deadlineKind: Project["deadlineKind"];
  deadlineAt?: string;
  methodology: Project["methodology"];
  qualityBar: Project["qualityBar"];
  riskTolerance: Project["riskTolerance"];
  thoughtEffort?: Project["thoughtEffort"];
  planStatus?: Project["planStatus"];
  planPhase?: Project["planPhase"];
  planError?: string;
  planWarning?: string;
  createdAt?: string;
  updatedAt?: string;
  members?: Project["members"];
  taskCount?: number;
  completedCount?: number;
};

export function reviveProject(project: Project): Project {
  return {
    ...project,
    deadlineAt: project.deadlineAt ? new Date(project.deadlineAt) : undefined,
    createdAt: project.createdAt ? new Date(project.createdAt) : undefined,
    updatedAt: project.updatedAt ? new Date(project.updatedAt) : undefined,
  };
}

export function projectFromJson(json: ProjectJson): Project {
  return {
    id: json.id,
    name: json.name,
    goal: json.goal,
    description: json.description,
    prdUrl: json.prdUrl,
    designUrls: json.designUrls,
    repoUrl: json.repoUrl,
    deadlineKind: json.deadlineKind,
    deadlineAt: json.deadlineAt ? new Date(json.deadlineAt) : undefined,
    methodology: json.methodology,
    qualityBar: json.qualityBar,
    riskTolerance: json.riskTolerance,
    thoughtEffort: json.thoughtEffort ?? "medium",
    planStatus: json.planStatus ?? "ready",
    planPhase: json.planPhase,
    planError: json.planError,
    planWarning: json.planWarning,
    createdAt: json.createdAt ? new Date(json.createdAt) : undefined,
    updatedAt: json.updatedAt ? new Date(json.updatedAt) : undefined,
    members: json.members ?? [],
    taskCount: asCount(json.taskCount),
    completedCount: asCount(json.completedCount),
  };
}

export function projectToJson(project: Project): ProjectJson {
  return {
    id: project.id,
    name: project.name,
    goal: project.goal,
    description: project.description,
    prdUrl: project.prdUrl,
    designUrls: project.designUrls,
    repoUrl: project.repoUrl,
    deadlineKind: project.deadlineKind,
    deadlineAt: project.deadlineAt?.toISOString(),
    methodology: project.methodology,
    qualityBar: project.qualityBar,
    riskTolerance: project.riskTolerance,
    thoughtEffort: project.thoughtEffort,
    planStatus: project.planStatus,
    planPhase: project.planPhase,
    planError: project.planError,
    planWarning: project.planWarning,
    createdAt: project.createdAt?.toISOString(),
    updatedAt: project.updatedAt?.toISOString(),
    members: project.members,
    taskCount: project.taskCount,
    completedCount: project.completedCount,
  };
}
