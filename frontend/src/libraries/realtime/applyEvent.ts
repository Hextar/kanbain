import type { QueryClient } from "@tanstack/react-query";
import { projectKeys } from "@modules/Project/api/projectKeys";
import type { PlanPhase, PlanStatus, Project } from "@modules/Project/types/Project";
import { columnKeys } from "@modules/Task/api/columnKeys";
import { taskKeys } from "@modules/Task/api/taskKeys";

const PLAN_STATUSES = new Set<string>(["planning", "ready", "failed"]);
const PLAN_PHASES = new Set<string>([
  "exploring",
  "decomposing",
  "generating",
  "reviewing",
  "revising",
]);

export type RealtimeMessage = {
  event: string;
  projectId: string;
  origin?: string | null;
  payload?: Record<string, unknown>;
};

export function parseRealtimeMessage(raw: string): RealtimeMessage | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (data === null || typeof data !== "object") return null;
    if (!("event" in data) || !("projectId" in data)) return null;
    const event = data.event;
    const projectId = data.projectId;
    if (typeof event !== "string" || typeof projectId !== "string") return null;
    const origin = "origin" in data ? data.origin : null;
    const payload = "payload" in data && isRecord(data.payload) ? data.payload : {};
    return {
      event,
      projectId,
      origin: typeof origin === "string" ? origin : null,
      payload,
    };
  } catch {
    return null;
  }
}

export function applyRealtimeMessage(
  queryClient: QueryClient,
  message: RealtimeMessage,
  clientId: string,
) {
  if (message.origin === clientId) return;
  if (message.event === "plan.updated") {
    applyPlanUpdated(queryClient, message);
    return;
  }
  if (message.event === "board.updated") {
    invalidateBoard(queryClient, message.projectId);
  }
}

function applyPlanUpdated(queryClient: QueryClient, message: RealtimeMessage) {
  const payload = message.payload ?? {};
  const planStatus = asPlanStatus(payload.planStatus);
  const planPhase = asPlanPhase(payload.planPhase);
  const planError =
    typeof payload.planError === "string" ? payload.planError : undefined;

  function patch(project: Project | undefined) {
    if (!project) return project;
    return {
      ...project,
      planStatus: planStatus ?? project.planStatus,
      planPhase,
      planError,
    };
  }

  queryClient.setQueryData(projectKeys.detail(message.projectId), patch);
  queryClient.setQueryData<Project[]>(projectKeys.list(), (list) =>
    list?.map((item) => (item.id === message.projectId ? (patch(item) ?? item) : item)),
  );
  if (planStatus === "ready") {
    invalidateBoard(queryClient, message.projectId);
  }
}

function invalidateBoard(queryClient: QueryClient, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: projectKeys.board(projectId) });
  void queryClient.invalidateQueries({ queryKey: columnKeys.list(projectId) });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (key[0] !== "tasks") return false;
      const filters = key[2];
      return isRecord(filters) && filters.projectId === projectId;
    },
  });
}

function asPlanStatus(value: unknown): PlanStatus | undefined {
  return typeof value === "string" && PLAN_STATUSES.has(value)
    ? (value as PlanStatus)
    : undefined;
}

function asPlanPhase(value: unknown): PlanPhase | undefined {
  return typeof value === "string" && PLAN_PHASES.has(value)
    ? (value as PlanPhase)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
