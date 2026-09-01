import type { PlanPhase } from "../types/Project";

const PHASE_MESSAGES: Record<PlanPhase | "planning", string[]> = {
  planning: [
    "Warming up the planner…",
    "Shuffling the deck…",
    "Getting a feel for the brief…",
  ],
  exploring: [
    "Reading the brief like it owes us a sprint…",
    "Sniffing out hidden constraints…",
    "Asking what done actually means…",
    "Looking for the landmines in the goal…",
  ],
  decomposing: [
    "Carving work into pieces a human could ship…",
    "Naming epics that won't embarrass us later…",
    "Hunting for the load-bearing stories…",
    "Sketching a backlog that can survive a deadline…",
  ],
  generating: [
    "Dealing cards onto the board…",
    "Writing acceptance criteria that could survive a demo…",
    "Assigning work without inventing teammates…",
    "Putting estimates on things that actually need them…",
  ],
  reviewing: [
    "Grading the plan like a skeptical tech lead…",
    "Checking the deadline isn't decorative…",
    "Hunting for mushy tasks…",
    "Making sure every card earns its keep…",
  ],
  revising: [
    "Sending the plan back for another pass…",
    "Tightening the backlog…",
    "Cutting cards that don't pull their weight…",
    "Fixing what the critic just roasted…",
  ],
};

const PHASE_PROGRESS: Record<PlanPhase | "planning", [number, number]> = {
  planning: [0.04, 0.16],
  exploring: [0.16, 0.34],
  decomposing: [0.34, 0.52],
  generating: [0.52, 0.72],
  reviewing: [0.72, 0.86],
  revising: [0.86, 0.96],
};

export function planFlavorMessage(
  phase?: PlanPhase | null,
  previous?: string,
): string {
  const pool = PHASE_MESSAGES[phase ?? "planning"];
  const choices = pool.filter((item) => item !== previous);
  const source = choices.length > 0 ? choices : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export function planProgressFloor(phase?: PlanPhase | null): number {
  return PHASE_PROGRESS[phase ?? "planning"][0];
}

export function creepPlanProgress(
  phase: PlanPhase | null | undefined,
  elapsedMs: number,
): number {
  const [start, end] = PHASE_PROGRESS[phase ?? "planning"];
  const span = end - start;
  return Math.min(end - 0.01, start + (elapsedMs / 45000) * span);
}
