"use client";

import type { KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Skeleton from "@uiKit/Skeleton";
import { useAssignees, useMilestones } from "../hooks/useCatalog";
import {
  FLOW_CLUSTER_OPTIONS,
  clusterInsight,
  flowLanes,
  flowNodes,
  type FlowCluster,
} from "../helpers/flowCluster";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";

const FlowChart = dynamic(() => import("./FlowChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

type FlowViewProps = {
  projectId: string;
  columns: Column[];
  tasks: Task[];
  matchedTaskIds: Set<string> | null;
  selectedTaskId?: string;
  doneColumnId?: string;
  cluster: FlowCluster;
  hrefForCluster: (cluster: FlowCluster) => string;
  onOpenTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: Task["id"]) => void;
};

export default function FlowView({
  projectId,
  columns,
  tasks,
  matchedTaskIds,
  selectedTaskId,
  doneColumnId,
  cluster,
  hrefForCluster,
  onOpenTask,
  onUpdateTask,
  onDeleteTask,
}: FlowViewProps) {
  const { data: assignees = [] } = useAssignees();
  const { data: milestones = [] } = useMilestones(projectId);

  if (columns.length === 0) {
    return (
      <EmptyState
        title="No columns yet"
        body="Switch to Board to add a column, then come back to see where work sits."
      />
    );
  }

  const nodes = flowNodes(columns, tasks, matchedTaskIds, cluster);
  if (nodes.length === 0) {
    return (
      <EmptyState
        title={matchedTaskIds ? "No matching tasks" : "No tasks yet"}
        body={
          matchedTaskIds
            ? "Nothing matches the current filters. Clear them to see the full flow."
            : "Add tasks on the Board. This view sizes each stage by how many sit there."
        }
      />
    );
  }

  const lanes = flowLanes(cluster, nodes, columns, assignees, milestones);
  const insight = clusterInsight(cluster, lanes, nodes);

  return (
    <div
      aria-labelledby="view-tab-flow"
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      id="view-panel-flow"
      role="tabpanel"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 pt-3 pb-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Group by
        </p>
        <ClusterTabs cluster={cluster} hrefFor={hrefForCluster} />
        {insight ? (
          <p className="text-xs text-amber-200/90">{insight}</p>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1 px-4 pb-4">
        <FlowChart
          columns={columns}
          doneColumnId={doneColumnId}
          lanes={lanes}
          nodes={nodes}
          projectId={projectId}
          selectedTaskId={selectedTaskId}
          onDeleteTask={onDeleteTask}
          onOpenTask={onOpenTask}
          onUpdateTask={onUpdateTask}
        />
      </div>
    </div>
  );
}

function ClusterTabs({
  cluster,
  hrefFor,
}: {
  cluster: FlowCluster;
  hrefFor: (cluster: FlowCluster) => string;
}) {
  return (
    <div
      aria-label="Group tasks by"
      className="flex h-7 items-center rounded-md bg-[#181b24] p-0.5 ring-1 ring-white/8"
      role="tablist"
      onKeyDown={onTabListKeyDown}
    >
      {FLOW_CLUSTER_OPTIONS.map((item) => {
        const selected = item.id === cluster;
        return (
          <Link
            key={item.id}
            aria-selected={selected}
            className={twMerge(
              "inline-flex h-6 touch-manipulation items-center justify-center rounded px-2 text-xs font-medium tracking-wide focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
              selected
                ? "bg-zinc-700/90 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
            href={hrefFor(item.id)}
            role="tab"
            scroll={false}
            tabIndex={selected ? 0 : -1}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      aria-labelledby="view-tab-flow"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      id="view-panel-flow"
      role="tabpanel"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl border border-white/8 bg-[#181b24] text-purple-300">
        <ChartColumn aria-hidden size={22} />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className="text-lg font-semibold text-pretty text-white">
          {title}
        </h2>
        <p className="text-sm leading-6 text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function onTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const current = (event.target as HTMLElement).closest<HTMLElement>(
    '[role="tab"]',
  );
  if (!current) return;
  const tabs = [
    ...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
  ];
  const index = tabs.indexOf(current);
  if (index < 0 || tabs.length === 0) return;
  event.preventDefault();
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const next = tabs[(index + delta + tabs.length) % tabs.length];
  next?.focus();
}
