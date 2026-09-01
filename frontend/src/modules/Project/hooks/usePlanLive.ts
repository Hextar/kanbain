"use client";

import { useEffect, useRef, useState } from "react";
import {
  creepPlanProgress,
  planFlavorMessage,
  planProgressFloor,
} from "../helpers/planProgress";
import type { PlanPhase, Project } from "../types/Project";

const ROTATE_MS = 3800;
const CREEP_MS = 400;

type PlanLiveState = {
  message: string;
  progress: number;
  phase?: PlanPhase;
};

export function usePlanLive(project: Project, enabled: boolean): PlanLiveState {
  const phase = enabled ? project.planPhase : undefined;
  const startedAtRef = useRef(Date.now());
  const [state, setState] = useState<PlanLiveState>(() => ({
    message: planFlavorMessage(phase),
    progress: planProgressFloor(phase),
    phase,
  }));

  useEffect(() => {
    if (!enabled) return;
    startedAtRef.current = Date.now();
    setState({
      message: planFlavorMessage(phase),
      progress: planProgressFloor(phase),
      phase,
    });
    const rotate = window.setInterval(() => {
      setState((current) => ({
        ...current,
        message: planFlavorMessage(current.phase, current.message),
      }));
    }, ROTATE_MS);
    const creep = window.setInterval(() => {
      setState((current) => ({
        ...current,
        progress: creepPlanProgress(
          current.phase,
          Date.now() - startedAtRef.current,
        ),
      }));
    }, CREEP_MS);
    return () => {
      window.clearInterval(rotate);
      window.clearInterval(creep);
    };
  }, [enabled, phase]);

  return state;
}
