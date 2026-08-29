export type DeadlineKind = "hard" | "nice_to_have" | "ongoing";
export type Methodology = "kanban" | "scrum";
export type QualityBar = "mvp" | "production_grade";
export type RiskTolerance = "low" | "medium" | "high";
export type PlanStatus = "planning" | "ready" | "failed";
export type Seniority = "junior" | "mid" | "senior" | "staff" | "principal";

export type ProjectMember = {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  seniority?: Seniority;
  capacity?: number;
};

export type ProjectMemberInput = {
  name: string;
  role?: string;
  seniority?: Seniority;
  capacity?: number;
};

export type Project = {
  id: string;
  name: string;
  goal?: string;
  description?: string;
  prdUrl?: string;
  designUrls?: string[];
  repoUrl?: string;
  deadlineKind: DeadlineKind;
  deadlineAt?: Date;
  methodology: Methodology;
  qualityBar: QualityBar;
  riskTolerance: RiskTolerance;
  planStatus: PlanStatus;
  planError?: string;
  createdAt?: Date;
  updatedAt?: Date;
  members: ProjectMember[];
};

export type CreateProjectInput = {
  id?: Project["id"];
  name: string;
  goal?: string;
  prdUrl?: string;
  designUrls?: string[];
  repoUrl?: string;
  deadlineKind?: DeadlineKind;
  deadlineAt?: string;
  methodology?: Methodology;
  qualityBar?: QualityBar;
  riskTolerance?: RiskTolerance;
  members?: ProjectMemberInput[];
  skipPlan?: boolean;
};
