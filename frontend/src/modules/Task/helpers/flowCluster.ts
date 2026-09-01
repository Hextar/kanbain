import { filterColumnCards } from "./boardFilter";
import { columnAccentFill } from "./columnAccent";
import { groupTasksByColumn } from "./groupTasksByColumn";
import { milestoneLabel } from "./milestoneLabel";
import { lastColumnId, visibleColumnCards } from "./visibleColumnCards";
import type { Assignee, Milestone } from "../types/Catalog";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";

export const CLUSTER_PARAM = "cluster";

export const FLOW_CLUSTERS = [
  "priority",
  "assignee",
  "kind",
  "estimate",
  "milestone",
  "stage",
] as const;

export type FlowCluster = (typeof FLOW_CLUSTERS)[number];

export const DEFAULT_FLOW_CLUSTER: FlowCluster = "priority";

export const FLOW_CLUSTER_OPTIONS: {
  id: FlowCluster;
  label: string;
}[] = [
  { id: "priority", label: "Priority" },
  { id: "assignee", label: "Person" },
  { id: "kind", label: "Type" },
  { id: "estimate", label: "Size" },
  { id: "milestone", label: "Milestone" },
  { id: "stage", label: "Stage" },
];

const CLUSTER_SET = new Set<string>(FLOW_CLUSTERS);

export function parseFlowCluster(
  value: string | null | undefined,
): FlowCluster {
  if (value && CLUSTER_SET.has(value)) return value as FlowCluster;
  return DEFAULT_FLOW_CLUSTER;
}

export type FlowLane = {
  key: string;
  label: string;
  fill: string;
};

export type FlowNode = {
  id: string;
  task: Task;
  columnId: string;
  columnIndex: number;
  clusterKey: string;
  fill: string;
};

const MUTED = "#71717a";
const PRIORITY_FILL: Record<string, string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#38bdf8",
  none: MUTED,
};
const KIND_FILL: Record<string, string> = {
  epic: "#a78bfa",
  story: "#60a5fa",
  task: "#a1a1aa",
};
const ESTIMATE_FILL: Record<string, string> = {
  xl: "#c084fc",
  l: "#a78bfa",
  m: "#818cf8",
  s: "#67e8f9",
  xs: "#5eead4",
  none: MUTED,
};
const PERSON_PALETTE = [
  "#818cf8",
  "#22d3ee",
  "#34d399",
  "#f472b6",
  "#fbbf24",
  "#fb923c",
  "#c084fc",
  "#2dd4bf",
];

const PRIORITY_ORDER = ["high", "medium", "low", "none"] as const;
const KIND_ORDER = ["epic", "story", "task"] as const;
const ESTIMATE_ORDER = ["xl", "l", "m", "s", "xs", "none"] as const;

export function clusterKey(task: Task, cluster: FlowCluster): string {
  switch (cluster) {
    case "priority":
      return task.priority ?? "none";
    case "assignee":
      return task.assigneeId ?? "none";
    case "kind":
      return task.workKind ?? "task";
    case "estimate":
      return task.estimateTshirt ?? "none";
    case "milestone":
      return task.milestoneId ?? "none";
    case "stage":
      return "all";
  }
}

export function clusterLabel(
  key: string,
  cluster: FlowCluster,
  columns: Column[],
  assignees: Assignee[],
  milestones: Milestone[],
): string {
  switch (cluster) {
    case "priority":
      return key === "none" ? "None" : capitalize(key);
    case "assignee":
      if (key === "none") return "Unassigned";
      return assignees.find((person) => person.id === key)?.name ?? "Unknown";
    case "kind":
      return capitalize(key);
    case "estimate":
      return key === "none" ? "None" : key.toUpperCase();
    case "milestone": {
      if (key === "none") return "No milestone";
      const milestone = milestones.find((item) => item.id === key);
      return milestone ? milestoneLabel(milestone, milestones) : "Unknown";
    }
    case "stage":
      return columns.find((column) => column.id === key)?.title ?? "Stage";
  }
}

export function clusterFill(
  key: string,
  cluster: FlowCluster,
  columns: Column[],
  columnIndex: number,
): string {
  switch (cluster) {
    case "priority":
      return PRIORITY_FILL[key] ?? MUTED;
    case "kind":
      return KIND_FILL[key] ?? MUTED;
    case "estimate":
      return ESTIMATE_FILL[key] ?? MUTED;
    case "assignee":
    case "milestone":
      if (key === "none") return MUTED;
      return PERSON_PALETTE[hashKey(key) % PERSON_PALETTE.length];
    case "stage": {
      const index = columns.findIndex((column) => column.id === key);
      const column = index >= 0 ? columns[index] : columns[columnIndex];
      if (!column) return MUTED;
      const doneId = lastColumnId(columns);
      return columnAccentFill(
        column.color,
        index >= 0 ? index : columnIndex,
        column.id === doneId,
      );
    }
  }
}

export function flowLanes(
  cluster: FlowCluster,
  nodes: FlowNode[],
  columns: Column[],
  assignees: Assignee[],
  milestones: Milestone[],
): FlowLane[] {
  if (cluster === "stage") {
    return [{ key: "all", label: "", fill: MUTED }];
  }
  const seen = new Set<string>();
  for (const node of nodes) seen.add(node.clusterKey);

  const ordered = laneOrder(cluster, columns, assignees, milestones).filter(
    (key) => seen.has(key),
  );
  for (const key of seen) {
    if (!ordered.includes(key)) ordered.push(key);
  }

  return ordered.map((key) => ({
    key,
    label: clusterLabel(key, cluster, columns, assignees, milestones),
    fill: clusterFill(key, cluster, columns, 0),
  }));
}

export function flowNodes(
  columns: Column[],
  tasks: Task[],
  matchedTaskIds: Set<string> | null,
  cluster: FlowCluster,
): FlowNode[] {
  const grouped = groupTasksByColumn(columns, tasks);
  const doneId = lastColumnId(columns);
  const nodes: FlowNode[] = [];
  for (let index = 0; index < columns.length; index++) {
    const column = columns[index];
    const cards = filterColumnCards(
      visibleColumnCards(
        column.id,
        grouped.get(column.id) ?? [],
        tasks,
        doneId,
      ),
      matchedTaskIds,
    );
    for (const card of cards) {
      pushNode(nodes, card.task, column.id, index, cluster, columns, doneId);
      for (const child of card.nested) {
        pushNode(nodes, child, column.id, index, cluster, columns, doneId);
      }
    }
  }
  return nodes;
}

function pushNode(
  nodes: FlowNode[],
  task: Task,
  columnId: string,
  columnIndex: number,
  cluster: FlowCluster,
  columns: Column[],
  doneId: string | undefined,
) {
  if (nodes.some((node) => node.id === task.id)) return;
  const key = clusterKey(task, cluster);
  const column = columns[columnIndex];
  const fill =
    cluster === "stage" && column
      ? columnAccentFill(column.color, columnIndex, column.id === doneId)
      : clusterFill(key, cluster, columns, columnIndex);
  nodes.push({
    id: task.id,
    task,
    columnId,
    columnIndex,
    clusterKey: key,
    fill,
  });
}

function laneOrder(
  cluster: FlowCluster,
  columns: Column[],
  assignees: Assignee[],
  milestones: Milestone[],
): string[] {
  switch (cluster) {
    case "priority":
      return [...PRIORITY_ORDER];
    case "kind":
      return [...KIND_ORDER];
    case "estimate":
      return [...ESTIMATE_ORDER];
    case "assignee":
      return [
        ...assignees
          .toSorted((left, right) => left.name.localeCompare(right.name))
          .map((person) => person.id),
        "none",
      ];
    case "milestone":
      return [
        ...milestones
          .toSorted(
            (left, right) =>
              left.order - right.order || left.id.localeCompare(right.id),
          )
          .map((item) => item.id),
        "none",
      ];
    case "stage":
      return columns.map((column) => column.id);
  }
}

export function clusterInsight(
  cluster: FlowCluster,
  lanes: FlowLane[],
  nodes: FlowNode[],
): string | null {
  if (cluster === "stage" || nodes.length === 0) return null;
  let top: FlowLane | null = null;
  let topCount = 0;
  for (const lane of lanes) {
    let count = 0;
    for (const node of nodes) {
      if (node.clusterKey === lane.key) count += 1;
    }
    if (count > topCount) {
      top = lane;
      topCount = count;
    }
  }
  if (!top || top.key === "none") return null;
  const share = topCount / nodes.length;
  if (share < 0.4) return null;
  const pct = Math.round(share * 100);
  if (cluster === "priority" && top.key === "high") {
    return `High priority is ${pct}% of visible work.`;
  }
  if (cluster === "assignee" || cluster === "milestone") {
    return `${top.label} holds ${pct}% of visible work.`;
  }
  return `${top.label} is ${pct}% of visible work.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hashKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
