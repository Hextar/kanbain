export type DeadlineKind = "hard" | "nice_to_have" | "ongoing";
export type Methodology = "kanban" | "scrum";
export type QualityBar = "mvp" | "production_grade";
export type RiskTolerance = "low" | "medium" | "high";

export type ProjectMember = {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  seniority?: string;
  capacity?: number;
};

export type Project = {
  id: string;
  name: string;
  goal?: string;
  description?: string;
  deadlineKind: DeadlineKind;
  deadlineAt?: Date;
  methodology: Methodology;
  qualityBar: QualityBar;
  riskTolerance: RiskTolerance;
  createdAt?: Date;
  updatedAt?: Date;
  members: ProjectMember[];
};

export type CreateProjectInput = {
  id?: Project["id"];
  name: string;
};
