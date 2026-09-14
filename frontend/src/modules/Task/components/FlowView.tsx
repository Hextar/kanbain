"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { useT, type TFunction } from "@/i18n";
import ButtonGroup, { buttonGroupItemClassName } from "@uiKit/ButtonGroup";
import EmptyState from "@uiKit/EmptyState";
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

const CLUSTER_LABEL_KEYS = {
  priority: "flow.priority",
  assignee: "flow.person",
  kind: "flow.type",
  estimate: "flow.size",
  milestone: "flow.milestone",
  stage: "flow.stage",
} as const satisfies Record<FlowCluster, `flow.${string}`>;

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
  const t = useT();
  const { data: assignees = [] } = useAssignees();
  const { data: milestones = [] } = useMilestones(projectId);

  if (columns.length === 0) {
    return (
      <EmptyState
        aria-labelledby="view-tab-flow"
        body={t("flow.noColumnsBody")}
        icon={<ChartColumn aria-hidden size={22} />}
        id="view-panel-flow"
        role="tabpanel"
        title={t("flow.noColumnsTitle")}
      />
    );
  }

  const nodes = flowNodes(columns, tasks, matchedTaskIds, cluster);
  if (nodes.length === 0) {
    return (
      <EmptyState
        aria-labelledby="view-tab-flow"
        body={
          matchedTaskIds ? t("flow.noMatchingBody") : t("flow.noTasksBody")
        }
        icon={<ChartColumn aria-hidden size={22} />}
        id="view-panel-flow"
        role="tabpanel"
        title={
          matchedTaskIds ? t("flow.noMatchingTitle") : t("flow.noTasksTitle")
        }
      />
    );
  }

  const lanes = flowLanes(
    cluster,
    nodes,
    columns,
    assignees,
    milestones,
    t,
  );
  const insight = clusterInsight(cluster, lanes, nodes, t);

  return (
    <div
      aria-labelledby="view-tab-flow"
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      id="view-panel-flow"
      role="tabpanel"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 pt-3 pb-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {t("flow.groupBy")}
        </p>
        <ClusterTabs cluster={cluster} hrefFor={hrefForCluster} t={t} />
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
  t,
}: {
  cluster: FlowCluster;
  hrefFor: (cluster: FlowCluster) => string;
  t: TFunction;
}) {
  return (
    <ButtonGroup aria-label={t("flow.groupTasksBy")} role="tablist">
      {FLOW_CLUSTER_OPTIONS.map((item) => {
        const selected = item.id === cluster;
        return (
          <Link
            key={item.id}
            aria-selected={selected}
            className={buttonGroupItemClassName({ selected })}
            href={hrefFor(item.id)}
            role="tab"
            scroll={false}
            tabIndex={selected ? 0 : -1}
          >
            {t(CLUSTER_LABEL_KEYS[item.id])}
          </Link>
        );
      })}
    </ButtonGroup>
  );
}
