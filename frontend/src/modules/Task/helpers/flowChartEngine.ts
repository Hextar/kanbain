import {
  forceCollide,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { pointer, select } from "d3-selection";
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
const PAD_LEFT_LANES = 92;
const PAD_LEFT_STAGE = 16;

export function createFlowChart(
  host: HTMLElement,
  getOnOpen: () => (task: Task) => void,
): FlowChartHandle {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const svg = select(host)
    .append("svg")
    .attr("class", "h-full w-full touch-manipulation")
    .attr("role", "group");
  const grid = svg.append("g").attr("aria-hidden", true);
  const labels = svg.append("g").attr("aria-hidden", true);
  const layer = svg.append("g");
  const tooltip = select(host)
    .append("div")
    .attr(
      "class",
      "pointer-events-none absolute z-10 hidden max-w-56 rounded-md border border-white/10 bg-[#181b24] px-2 py-1.5 text-xs text-zinc-100 shadow-lg shadow-black/40",
    );

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
      next.lanes.map((lane) => lane.key).join(),
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

    svg.attr(
      "aria-label",
      `Work in progress chart, ${nodes.length} tasks across ${colCount} stages`,
    );

    const colSel = grid
      .selectAll<SVGLineElement, Column>("line.col")
      .data(next.columns, (column) => column.id);
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
      .attr("dominant-baseline", "middle")
      .merge(laneLabel)
      .attr("x", padLeft - 12)
      .attr("y", (_, index) => PAD_TOP + (index + 0.5) * laneH)
      .attr("fill", (lane) => lane.fill)
      .text((lane) => lane.label);

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
        getOnOpen()(node.task);
      })
      .on("keydown", (event: KeyboardEvent, node) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        getOnOpen()(node.task);
      })
      .on("pointerenter", (event: PointerEvent, node) => {
        showTooltip(event, node);
      })
      .on("pointermove", (event: PointerEvent, node) => {
        showTooltip(event, node);
      })
      .on("pointerleave", hideTooltip)
      .on("focus", (event: FocusEvent, node) => {
        const target = event.currentTarget as SVGGElement;
        const rect = target.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        tooltip
          .classed("hidden", false)
          .style("left", `${rect.left - hostRect.left + rect.width / 2}px`)
          .style("top", `${rect.top - hostRect.top - 8}px`)
          .style("transform", "translate(-50%, -100%)")
          .text(tooltipText(node));
      })
      .on("blur", hideTooltip);

    merged
      .select<SVGCircleElement>("circle.body")
      .attr("r", (node) => node.r)
      .attr("fill", (node) => node.fill);
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

  function showTooltip(event: PointerEvent, node: SimNode) {
    const [x, y] = pointer(event, host);
    tooltip
      .classed("hidden", false)
      .style("left", `${x}px`)
      .style("top", `${y - 12}px`)
      .style("transform", "translate(-50%, -100%)")
      .text(tooltipText(node));
  }

  function hideTooltip() {
    tooltip.classed("hidden", true);
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
      tooltip.remove();
      svg.remove();
    },
  };
}

function tooltipText(node: SimNode): string {
  const key = compactTaskKey(node.task);
  return key ? `${key}  ${node.task.title}` : node.task.title;
}

function nodeRadius(densest: number, colW: number, laneH: number): number {
  const area = Math.max(colW * laneH, 1);
  const packed = Math.sqrt(area / (densest * Math.PI * 3.2));
  return Math.max(6, Math.min(16, packed));
}
