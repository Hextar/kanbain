"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnchoredHoverPreview } from "@uiKit/HoverPreview";
import type { FlowLane, FlowNode } from "../helpers/flowCluster";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";
import TaskCardPreview from "./TaskCardPreview";
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

type NodePreview = {
  task: Task;
  anchor: Element | null;
  immediate: boolean;
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
  const onPreviewEnterRef = useRef<
    (task: Task, anchor: Element, immediate: boolean) => void
  >(() => {});
  const onPreviewLeaveRef = useRef<(immediate?: boolean) => void>(() => {});
  const modelRef = useRef({ columns, lanes, nodes, selectedTaskId });
  const [menu, setMenu] = useState<MenuAnchor | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);

  const handleContextMenu = useCallback(
    (task: Task, point: { x: number; y: number }) => {
      setMenu({ task, x: point.x, y: point.y });
    },
    [],
  );

  const handlePreviewEnter = useCallback(
    (task: Task, anchor: Element, immediate: boolean) => {
      setPreview({ task, anchor, immediate });
    },
    [],
  );

  const handlePreviewLeave = useCallback((immediate?: boolean) => {
    if (immediate) {
      setPreview(null);
      return;
    }
    setPreview((current) =>
      current ? { ...current, anchor: null, immediate: false } : null,
    );
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    onOpenRef.current = onOpenTask;
  }, [onOpenTask]);

  useEffect(() => {
    onContextMenuRef.current = handleContextMenu;
  }, [handleContextMenu]);

  useEffect(() => {
    onPreviewEnterRef.current = handlePreviewEnter;
  }, [handlePreviewEnter]);

  useEffect(() => {
    onPreviewLeaveRef.current = handlePreviewLeave;
  }, [handlePreviewLeave]);

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
        getOnPreviewEnter: () => onPreviewEnterRef.current,
        getOnPreviewLeave: () => onPreviewLeaveRef.current,
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

  const liveMenuTask = menu
    ? (nodes.find((node) => node.id === menu.task.id)?.task ?? menu.task)
    : null;
  const livePreviewNode = preview
    ? (nodes.find((node) => node.id === preview.task.id) ?? null)
    : null;
  const livePreviewTask = livePreviewNode?.task ?? preview?.task ?? null;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-xl ring-1 ring-white/6">
      <div ref={hostRef} className="h-full min-h-0 w-full" />
      <AnchoredHoverPreview
        anchor={preview?.anchor ?? null}
        disabled={!preview || Boolean(menu)}
        immediate={preview?.immediate ?? false}
        content={
          livePreviewTask ? (
            <TaskCardPreview
              accentColor={livePreviewNode?.fill}
              projectId={projectId}
              task={livePreviewTask}
            />
          ) : null
        }
      />
      {menu && liveMenuTask ? (
        <TaskContextMenu
          anchor={menu}
          doneColumnId={doneColumnId}
          projectId={projectId}
          task={liveMenuTask}
          onClose={closeMenu}
          onDelete={onDeleteTask}
          onOpen={onOpenTask}
          onUpdate={onUpdateTask}
        />
      ) : null}
    </div>
  );
}
