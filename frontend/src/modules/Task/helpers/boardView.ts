import { FILTER_PARAM } from "./boardFilter";
import {
  CLUSTER_PARAM,
  DEFAULT_FLOW_CLUSTER,
  parseFlowCluster,
  type FlowCluster,
} from "./flowCluster";

export const VIEW_PARAM = "view";

export const BOARD_VIEWS = ["board", "flow"] as const;

export type BoardView = (typeof BOARD_VIEWS)[number];

export const DEFAULT_BOARD_VIEW: BoardView = "board";

export function parseBoardView(value: string | null | undefined): BoardView {
  return value === "flow" ? "flow" : DEFAULT_BOARD_VIEW;
}

export function boardQueryString(parts: {
  view?: BoardView | null;
  task?: string | null;
  filters?: string | null;
  cluster?: FlowCluster | null;
}): string {
  const params = new URLSearchParams();
  if (parts.view && parts.view !== DEFAULT_BOARD_VIEW) {
    params.set(VIEW_PARAM, parts.view);
  }
  if (parts.task) params.set("task", parts.task);
  if (parts.filters) params.set(FILTER_PARAM, parts.filters);
  const cluster = parseFlowCluster(parts.cluster);
  if (cluster !== DEFAULT_FLOW_CLUSTER) {
    params.set(CLUSTER_PARAM, cluster);
  }
  return params.toString();
}

export function boardHref(
  pathname: string,
  parts: {
    view?: BoardView | null;
    task?: string | null;
    filters?: string | null;
    cluster?: FlowCluster | null;
  },
): string {
  const query = boardQueryString(parts);
  return query ? `${pathname}?${query}` : pathname;
}
