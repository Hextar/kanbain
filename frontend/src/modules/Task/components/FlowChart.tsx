"use client";

import { useEffect, useRef } from "react";
import type { FlowLane, FlowNode } from "../helpers/flowCluster";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";

type FlowChartProps = {
  columns: Column[];
  lanes: FlowLane[];
  nodes: FlowNode[];
  selectedTaskId?: string;
  onOpenTask: (task: Task) => void;
};

type Engine = {
  update: (model: {
    columns: Column[];
    lanes: FlowLane[];
    nodes: FlowNode[];
    selectedTaskId?: string;
  }) => void;
  destroy: () => void;
};

export default function FlowChart({
  columns,
  lanes,
  nodes,
  selectedTaskId,
  onOpenTask,
}: FlowChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const onOpenRef = useRef(onOpenTask);
  const modelRef = useRef({ columns, lanes, nodes, selectedTaskId });

  useEffect(() => {
    onOpenRef.current = onOpenTask;
  }, [onOpenTask]);

  useEffect(() => {
    modelRef.current = { columns, lanes, nodes, selectedTaskId };
    engineRef.current?.update(modelRef.current);
  }, [columns, lanes, nodes, selectedTaskId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import("../helpers/flowChartEngine").then((mod) => {
      if (cancelled || !hostRef.current) return;
      const engine = mod.createFlowChart(host, () => onOpenRef.current);
      engineRef.current = engine;
      engine.update(modelRef.current);
    });
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-[#14161e] ring-1 ring-white/6"
    />
  );
}
