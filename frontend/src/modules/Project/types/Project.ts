export type DeadlineKind = "hard" | "nice_to_have" | "ongoing";
export type Methodology = "kanban" | "scrum";
export type QualityBar = "mvp" | "production_grade";
export type RiskTolerance = "low" | "medium" | "high";
export type ThoughtEffort = "low" | "medium" | "high" | "max";
export type PlanPhase =
  | "classifying"
  | "retrieving"
  | "ingesting"
  | "exploring"
  | "decomposing"
  | "generating"
  | "reviewing"
  | "revising";
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
  thoughtEffort: ThoughtEffort;
  planStatus: PlanStatus;
  planPhase?: PlanPhase;
  planError?: string;
  planWarning?: string;
  createdAt?: Date;
  updatedAt?: Date;
  members: ProjectMember[];
  taskCount: number;
  completedCount: number;
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
  thoughtEffort?: ThoughtEffort;
  members?: ProjectMemberInput[];
  skipPlan?: boolean;
};
