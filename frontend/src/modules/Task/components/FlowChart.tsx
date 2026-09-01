"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlowLane, FlowNode } from "../helpers/flowCluster";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";
import TaskContextMenu from "./TaskContextMenu";

type FlowChartProps = {
  columns: Column[];
  lanes: FlowLane[];
  nodes: FlowNode[];
  projectId: string;
  selectedTaskId?: string;
  doneColumnId?: string;
  onOpenTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: Task["id"]) => void;
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

type MenuAnchor = {
  task: Task;
  x: number;
  y: number;
};

export default function FlowChart({
  columns,
  lanes,
  nodes,
  projectId,
  selectedTaskId,
  doneColumnId,
  onOpenTask,
  onUpdateTask,
  onDeleteTask,
}: FlowChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const onOpenRef = useRef(onOpenTask);
  const onContextMenuRef = useRef<
    (task: Task, point: { x: number; y: number }) => void
  >(() => {});
  const modelRef = useRef({ columns, lanes, nodes, selectedTaskId });
  const [menu, setMenu] = useState<MenuAnchor | null>(null);

  const handleContextMenu = useCallback(
    (task: Task, point: { x: number; y: number }) => {
      setMenu({ task, x: point.x, y: point.y });
    },
    [],
  );

  useEffect(() => {
    onOpenRef.current = onOpenTask;
  }, [onOpenTask]);

  useEffect(() => {
    onContextMenuRef.current = handleContextMenu;
  }, [handleContextMenu]);

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
      const engine = mod.createFlowChart(host, {
        getOnOpen: () => onOpenRef.current,
        getOnContextMenu: () => onContextMenuRef.current,
      });
      engineRef.current = engine;
      engine.update(modelRef.current);
    });
    return () => {
      cancelled = true;
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const liveTask = menu
    ? (nodes.find((node) => node.id === menu.task.id)?.task ?? menu.task)
    : null;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-xl ring-1 ring-white/6">
      <div ref={hostRef} className="h-full min-h-0 w-full" />
      {menu && liveTask ? (
        <TaskContextMenu
          anchor={menu}
          doneColumnId={doneColumnId}
          projectId={projectId}
          task={liveTask}
          onClose={() => setMenu(null)}
          onDelete={onDeleteTask}
          onOpen={onOpenTask}
          onUpdate={onUpdateTask}
        />
      ) : null}
    </div>
  );
}
