import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { select, type Selection } from "d3-selection";
import "d3-transition";
import { compactTaskKey } from "./taskKey";
import type { FlowLane, FlowNode } from "./flowCluster";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";

export type FlowChartModel = {
  columns: Column[];
  lanes: FlowLane[];
  nodes: FlowNode[];
  selectedTaskId?: string;
};

type SimNode = FlowNode &
  SimulationNodeDatum & {
    targetX: number;
    targetY: number;
    r: number;
  };

type FlowChartHandle = {
  update: (model: FlowChartModel) => void;
  destroy: () => void;
};

const PAD_TOP = 40;
const PAD_RIGHT = 20;
const PAD_BOTTOM = 16;
const PAD_LEFT_LANES = 128;
const PAD_LEFT_STAGE = 16;
const LANE_LABEL_FAMILY = "ui-sans-serif, system-ui, sans-serif";
const LANE_LABEL_FONT = `500 11px ${LANE_LABEL_FAMILY}`;
const LANE_LINE_HEIGHT = 14;
const NODE_SHEEN_ID = "flow-node-sheen";

export function createFlowChart(
  host: HTMLElement,
  handlers: {
    getOnOpen: () => (task: Task) => void;
    getOnContextMenu: () => (
      task: Task,
      point: { x: number; y: number },
    ) => void;
    getOnPreviewEnter: () => (
      task: Task,
      anchor: Element,
      immediate: boolean,
    ) => void;
    getOnPreviewLeave: () => (immediate?: boolean) => void;
  },
): FlowChartHandle {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const svg = select(host)
    .append("svg")
    .attr("class", "h-full w-full touch-manipulation")
    .attr("role", "group");
  const defs = svg.append("defs");
  paintNodeSheen(defs);
  const grid = svg.append("g").attr("aria-hidden", true);
  const labels = svg.append("g").attr("aria-hidden", true);
  const layer = svg.append("g");

  let sim: Simulation<SimNode, undefined> | undefined;
  let current: SimNode[] = [];
  let model: FlowChartModel = { columns: [], lanes: [], nodes: [] };
  let layoutKey = "";

  const observer = new ResizeObserver(() => {
    layoutKey = "";
    render(model, false);
  });
  observer.observe(host);

  const onMotion = () => {
    layoutKey = "";
    render(model, true);
  };
  reduced.addEventListener("change", onMotion);

  function render(next: FlowChartModel, clusterChanged: boolean) {
    model = next;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 32 || height < 32) return;

    const nextKey = [
      width,
      height,
      next.columns.map((column) => column.id).join(),
      next.lanes.map((lane) => `${lane.key}:${lane.label}`).join(),
      next.nodes
        .map((node) => `${node.id}:${node.columnIndex}:${node.clusterKey}`)
        .join(),
    ].join("|");
    if (nextKey === layoutKey) {
      paintSelection(next.selectedTaskId);
      return;
    }
    layoutKey = nextKey;

    const laneMode = next.lanes.length > 1;
    const padLeft = laneMode ? PAD_LEFT_LANES : PAD_LEFT_STAGE;
    const innerW = width - padLeft - PAD_RIGHT;
    const innerH = height - PAD_TOP - PAD_BOTTOM;
    const colCount = Math.max(next.columns.length, 1);
    const laneCount = Math.max(next.lanes.length, 1);
    const colW = innerW / colCount;
    const laneH = innerH / laneCount;
    const laneIndex = new Map(
      next.lanes.map((lane, index) => [lane.key, index]),
    );
    const cellCount = new Map<string, number>();
    for (const node of next.nodes) {
      const key = `${node.columnIndex}:${node.clusterKey}`;
      cellCount.set(key, (cellCount.get(key) ?? 0) + 1);
    }
    let densest = 1;
    for (const count of cellCount.values()) {
      if (count > densest) densest = count;
    }
    const radius = nodeRadius(densest, colW, laneH);
    const previous = new Map(current.map((node) => [node.id, node]));
    const nodes: SimNode[] = next.nodes.map((node) => {
      const lane = laneIndex.get(node.clusterKey) ?? 0;
      const targetX = padLeft + (node.columnIndex + 0.5) * colW;
      const targetY = PAD_TOP + (lane + 0.5) * laneH;
      const prior = previous.get(node.id);
      const incoming = clusterChanged && !prior;
      return {
        ...node,
        r: radius,
        targetX,
        targetY,
        x: prior?.x ?? (incoming ? width / 2 : targetX),
        y: prior?.y ?? (incoming ? height / 2 : targetY),
        vx: prior?.vx ?? 0,
        vy: prior?.vy ?? 0,
      };
    });
    current = nodes;
    paintNodeFills(defs, [...new Set(nodes.map((node) => node.fill))]);

    svg.attr(
      "aria-label",
      `Work in progress chart, ${nodes.length} tasks across ${colCount} stages`,
    );

    const colSel = grid
      .selectAll<SVGLineElement, Column>("line.col")
      .data(next.columns.slice(0, -1), (column) => column.id);
    colSel.exit().remove();
    colSel
      .enter()
      .append("line")
      .attr("class", "col")
      .attr("stroke", "rgb(255 255 255 / 0.06)")
      .merge(colSel)
      .attr("x1", (_, index) => padLeft + (index + 1) * colW)
      .attr("x2", (_, index) => padLeft + (index + 1) * colW)
      .attr("y1", PAD_TOP)
      .attr("y2", height - PAD_BOTTOM);

    const laneSel = grid
      .selectAll<SVGLineElement, FlowLane>("line.lane")
      .data(laneMode ? next.lanes.slice(0, -1) : [], (lane) => lane.key);
    laneSel.exit().remove();
    laneSel
      .enter()
      .append("line")
      .attr("class", "lane")
      .attr("stroke", "rgb(255 255 255 / 0.06)")
      .attr("stroke-dasharray", "4 6")
      .merge(laneSel)
      .attr("x1", padLeft)
      .attr("x2", width - PAD_RIGHT)
      .attr("y1", (_, index) => PAD_TOP + (index + 1) * laneH)
      .attr("y2", (_, index) => PAD_TOP + (index + 1) * laneH);

    const colLabel = labels
      .selectAll<SVGTextElement, Column>("text.col")
      .data(next.columns, (column) => column.id);
    colLabel.exit().remove();
    colLabel
      .enter()
      .append("text")
      .attr("class", "col")
      .attr("fill", "#e4e4e7")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("text-anchor", "middle")
      .merge(colLabel)
      .attr("x", (_, index) => padLeft + (index + 0.5) * colW)
      .attr("y", 22)
      .text((column) => {
        const count = nodes.filter(
          (node) => node.columnId === column.id,
        ).length;
        return `${column.title}  ${count}`;
      });

    const laneMaxLines = Math.min(
      4,
      Math.max(1, Math.floor((laneH - 12) / LANE_LINE_HEIGHT)),
    );
    const laneLabelWidth = Math.max(48, padLeft - 20);
    const laneLabel = labels
      .selectAll<SVGTextElement, FlowLane>("text.lane")
      .data(laneMode ? next.lanes : [], (lane) => lane.key);
    laneLabel.exit().remove();
    laneLabel
      .enter()
      .append("text")
      .attr("class", "lane")
      .attr("fill", "#a1a1aa")
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("font-family", LANE_LABEL_FAMILY)
      .style("pointer-events", "none")
      .merge(laneLabel)
      .attr("dominant-baseline", "central")
      .attr("fill", (lane) => lane.fill)
      .each(function (lane, index) {
        paintLaneLabel(
          this,
          lane.label,
          padLeft - 12,
          PAD_TOP + (index + 0.5) * laneH,
          laneLabelWidth,
          laneMaxLines,
        );
      });

    const nodeSel = layer
      .selectAll<SVGGElement, SimNode>("g.node")
      .data(nodes, (node) => node.id);
    nodeSel
      .exit()
      .attr("data-leaving", "true")
      .transition()
      .duration(reduced.matches ? 0 : 180)
      .attr("opacity", 0)
      .remove();

    const enter = nodeSel
      .enter()
      .append("g")
      .attr("class", "node flow-node")
      .style("cursor", "pointer")
      .style("outline", "none")
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("opacity", 0)
      .attr("transform", (node) => `translate(${node.x},${node.y})`);

    enter
      .append("circle")
      .attr("class", "halo")
      .attr("fill", "none")
      .attr("stroke", "#a855f7")
      .attr("stroke-width", 2)
      .attr("opacity", 0);
    enter.append("circle").attr("class", "body");
    enter
      .append("circle")
      .attr("class", "sheen")
      .attr("fill", `url(#${NODE_SHEEN_ID})`)
      .attr("pointer-events", "none");
    enter
      .append("text")
      .attr("class", "key")
      .attr("fill", "#09090b")
      .attr("font-size", 8)
      .attr("font-weight", 700)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("pointer-events", "none");

    const merged = enter.merge(nodeSel);
    merged
      .attr("class", "node flow-node")
      .style("outline", "none")
      .attr(
        "aria-label",
        (node) => `${compactTaskKey(node.task) ?? "Task"} ${node.task.title}`,
      )
      .attr("aria-current", (node) =>
        node.id === next.selectedTaskId ? "true" : null,
      )
      .on("click", (event: MouseEvent, node) => {
        event.preventDefault();
        (event.currentTarget as SVGGElement | null)?.blur();
        handlers.getOnPreviewLeave()(true);
        handlers.getOnOpen()(node.task);
      })
      .on("contextmenu", (event: MouseEvent, node) => {
        event.preventDefault();
        event.stopPropagation();
        handlers.getOnPreviewLeave()(true);
        let { clientX: x, clientY: y } = event;
        if (x === 0 && y === 0) {
          const rect = (
            event.currentTarget as SVGGElement
          ).getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.bottom;
        }
        handlers.getOnContextMenu()(node.task, { x, y });
      })
      .on("keydown", (event: KeyboardEvent, node) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handlers.getOnPreviewLeave()(true);
        handlers.getOnOpen()(node.task);
      })
      .on("pointerenter", (event: PointerEvent, node) => {
        handlers.getOnPreviewEnter()(
          node.task,
          event.currentTarget as Element,
          false,
        );
      })
      .on("pointerleave", () => {
        handlers.getOnPreviewLeave()();
      })
      .on("focus", (event: FocusEvent, node) => {
        handlers.getOnPreviewEnter()(
          node.task,
          event.currentTarget as Element,
          true,
        );
      })
      .on("blur", () => {
        handlers.getOnPreviewLeave()();
      });

    merged
      .select<SVGCircleElement>("circle.body")
      .attr("r", (node) => node.r)
      .attr("fill", (node) => `url(#${nodeFillId(node.fill)})`);
    merged.select<SVGCircleElement>("circle.sheen").attr("r", (node) => node.r);
    merged
      .select<SVGCircleElement>("circle.halo")
      .attr("r", (node) => node.r + 3.5)
      .attr("opacity", (node) => (node.id === next.selectedTaskId ? 1 : 0));
    merged
      .select<SVGTextElement>("text.key")
      .attr("opacity", (node) =>
        node.r >= 11 && node.task.taskNumber ? 0.85 : 0,
      )
      .text((node) =>
        node.r >= 11 && node.task.taskNumber
          ? String(node.task.taskNumber)
          : "",
      );

    enter
      .transition()
      .duration(reduced.matches ? 0 : 280)
      .attr("opacity", 1);

    sim?.stop();
    if (reduced.matches) {
      for (const node of nodes) {
        node.x = node.targetX;
        node.y = node.targetY;
      }
      merged.attr("transform", (node) => `translate(${node.x},${node.y})`);
      sim = undefined;
      return;
    }

    sim = forceSimulation(nodes)
      .force("x", forceX<SimNode>((node) => node.targetX).strength(0.22))
      .force("y", forceY<SimNode>((node) => node.targetY).strength(0.22))
      .force(
        "collide",
        forceCollide<SimNode>((node) => node.r + 1.6).iterations(3),
      )
      .alpha(clusterChanged ? 0.95 : 0.55)
      .alphaDecay(0.06)
      .on("tick", () => {
        merged.attr(
          "transform",
          (node) => `translate(${node.x ?? 0},${node.y ?? 0})`,
        );
      });
  }

  function paintSelection(selectedTaskId?: string) {
    layer
      .selectAll<SVGGElement, SimNode>("g.node")
      .attr("aria-current", (node) =>
        node.id === selectedTaskId ? "true" : null,
      )
      .select<SVGCircleElement>("circle.halo")
      .attr("opacity", (node) => (node.id === selectedTaskId ? 1 : 0));
  }

  return {
    update(next) {
      const clusterChanged =
        model.lanes.length !== next.lanes.length ||
        model.lanes.some((lane, index) => lane.key !== next.lanes[index]?.key);
      render(next, clusterChanged || current.length === 0);
    },
    destroy() {
      sim?.stop();
      observer.disconnect();
      reduced.removeEventListener("change", onMotion);
      svg.remove();
    },
  };
}

function nodeFillId(fill: string): string {
  return `flow-fill-${fill.replace(/[^a-zA-Z0-9]/g, "")}`;
}

type SvgDefs = Selection<SVGDefsElement, unknown, null, undefined>;

function paintNodeSheen(defs: SvgDefs) {
  const sheen = defs
    .append("radialGradient")
    .attr("id", NODE_SHEEN_ID)
    .attr("cx", "32%")
    .attr("cy", "26%")
    .attr("r", "68%");
  sheen
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.42);
  sheen
    .append("stop")
    .attr("offset", "42%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0.1);
  sheen
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#fff")
    .attr("stop-opacity", 0);
}

function paintNodeFills(defs: SvgDefs, fills: string[]) {
  const fillSel = defs
    .selectAll<SVGLinearGradientElement, string>("linearGradient.node-fill")
    .data(fills, (fill) => fill);
  fillSel.exit().remove();
  const fillEnter = fillSel
    .enter()
    .append("linearGradient")
    .attr("class", "node-fill")
    .attr("gradientUnits", "objectBoundingBox")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 1)
    .attr("y2", 1);
  fillEnter.append("stop").attr("class", "from").attr("offset", "0%");
  fillEnter.append("stop").attr("class", "to").attr("offset", "100%");
  const merged = fillEnter.merge(fillSel);
  merged.attr("id", (fill) => nodeFillId(fill));
  merged
    .select<SVGStopElement>("stop.from")
    .attr("stop-color", (fill) => mixHex(fill, 255, 0.34));
  merged
    .select<SVGStopElement>("stop.to")
    .attr("stop-color", (fill) => mixHex(fill, 0, 0.3));
}

function mixHex(hex: string, toward: number, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(
    rgb[0] + (toward - rgb[0]) * amount,
    rgb[1] + (toward - rgb[1]) * amount,
    rgb[2] + (toward - rgb[2]) * amount,
  );
}

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  if (raw.length !== 6) return null;
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value)) return null;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function nodeRadius(densest: number, colW: number, laneH: number): number {
  const area = Math.max(colW * laneH, 1);
  const packed = Math.sqrt(area / (densest * Math.PI * 3.2));
  return Math.max(6, Math.min(16, packed));
}

function paintLaneLabel(
  node: SVGTextElement,
  label: string,
  x: number,
  centerY: number,
  maxWidth: number,
  maxLines: number,
) {
  const text = select(node);
  text.selectAll("tspan").remove();
  text.text(null);
  const lines = wrapLabelLines(label, maxWidth, maxLines);
  const start = centerY - ((lines.length - 1) * LANE_LINE_HEIGHT) / 2;
  for (let index = 0; index < lines.length; index++) {
    text
      .append("tspan")
      .attr("x", x)
      .attr("y", start + index * LANE_LINE_HEIGHT)
      .text(lines[index]);
  }
}

let measureCtx: CanvasRenderingContext2D | null | undefined;

function measureLabel(value: string): number {
  if (measureCtx === undefined) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return value.length * 6.5;
  measureCtx.font = LANE_LABEL_FONT;
  return measureCtx.measureText(value).width;
}

function fitLabelWidth(value: string, maxWidth: number): string {
  if (measureLabel(value) <= maxWidth) return value;
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measureLabel(`${value.slice(0, mid)}…`) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low <= 0 ? "…" : `${value.slice(0, low)}…`;
}

function wrapLabelLines(
  label: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const limit = Math.max(1, maxLines);
  const lines: string[] = [];
  let current = "";

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const tentative = current ? `${current} ${word}` : word;
    if (measureLabel(tentative) <= maxWidth || current === "") {
      current = tentative;
      continue;
    }
    if (lines.length + 1 >= limit) {
      lines.push(
        fitLabelWidth([current, ...words.slice(index)].join(" "), maxWidth),
      );
      return lines;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(fitLabelWidth(current, maxWidth));
  return lines;
}
