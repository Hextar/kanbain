import type {
  Assignee,
  Milestone,
  Tag,
  TaskPriority,
  TshirtSize,
  WorkKind,
} from "../types/Catalog";
import type { Column } from "../types/Column";
import type { Task } from "../types/Task";
import type { VisibleColumnCard } from "./visibleColumnCards";
import { milestoneLabel } from "./milestoneLabel";

export const FILTER_PARAM = "filters";

export type FilterField =
  | "assignee"
  | "priority"
  | "milestone"
  | "tag"
  | "status"
  | "estimate"
  | "kind"
  | "title";

export type FilterOperator = "is" | "isNot" | "contains" | "isEmpty";

export type FilterClause = {
  field: FilterField;
  operator: FilterOperator;
  values: string[];
};

export type FilterCatalog = {
  assignees: Assignee[];
  milestones: Milestone[];
  tags: Tag[];
  columns: Column[];
};

export type FilterSuggestion = {
  id: string;
  label: string;
  detail?: string;
  clause: FilterClause;
  drillField?: FilterField;
};

type FieldSpec = {
  field: FilterField;
  label: string;
  aliases: string[];
};

const FIELDS: FieldSpec[] = [
  {
    field: "assignee",
    label: "Assignee",
    aliases: ["owner", "person", "user"],
  },
  { field: "priority", label: "Priority", aliases: [] },
  { field: "milestone", label: "Milestone", aliases: [] },
  { field: "tag", label: "Tag", aliases: ["label"] },
  { field: "status", label: "Status", aliases: ["column", "state"] },
  {
    field: "estimate",
    label: "Estimate",
    aliases: ["size", "t-shirt", "tshirt"],
  },
  { field: "kind", label: "Type", aliases: ["kind", "work"] },
  { field: "title", label: "Title", aliases: ["name", "text"] },
];

const FIELD_SET = new Set<string>(FIELDS.map((item) => item.field));
const OPERATOR_SET = new Set<FilterOperator>([
  "is",
  "isNot",
  "contains",
  "isEmpty",
]);

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const ESTIMATES: { value: TshirtSize; label: string }[] = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

const KINDS: { value: WorkKind; label: string }[] = [
  { value: "epic", label: "Epic" },
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
];

const EMPTY_QUERIES: { pattern: RegExp; field: FilterField }[] = [
  { pattern: /^(unassigned|no assignee|without assignee)$/, field: "assignee" },
  { pattern: /^(no milestone|without milestone)$/, field: "milestone" },
  { pattern: /^(untagged|no tags?|no labels?|without tags?)$/, field: "tag" },
  { pattern: /^(no priority|unprioritized)$/, field: "priority" },
  { pattern: /^(no estimate|unestimated)$/, field: "estimate" },
];

const MAX_SUGGESTIONS = 12;

function isFilterField(value: string): value is FilterField {
  return FIELD_SET.has(value);
}

function isFilterOperator(value: string): value is FilterOperator {
  return OPERATOR_SET.has(value as FilterOperator);
}

export function fieldLabel(field: FilterField): string {
  return FIELDS.find((item) => item.field === field)?.label ?? field;
}

export function operatorLabel(operator: FilterOperator): string {
  switch (operator) {
    case "isNot":
      return "is not";
    case "isEmpty":
      return "is empty";
    case "contains":
      return "contains";
    default:
      return "is";
  }
}

export function clauseKey(clause: FilterClause): string {
  return `${clause.field}:${clause.operator}:${clause.values.join(",")}`;
}

function optionValues(
  field: FilterField,
  catalog: FilterCatalog,
): { value: string; label: string }[] {
  switch (field) {
    case "assignee":
      return catalog.assignees.map((item) => ({
        value: item.id,
        label: item.name,
      }));
    case "milestone":
      return catalog.milestones.map((item) => ({
        value: item.id,
        label: milestoneLabel(item, catalog.milestones),
      }));
    case "tag":
      return catalog.tags.map((item) => ({
        value: item.name,
        label: item.name,
      }));
    case "status":
      return catalog.columns.map((item) => ({
        value: item.id,
        label: item.title,
      }));
    case "priority":
      return PRIORITIES;
    case "estimate":
      return ESTIMATES;
    case "kind":
      return KINDS;
    default:
      return [];
  }
}

export function displayValue(
  field: FilterField,
  value: string,
  catalog: FilterCatalog,
): string {
  const match = optionValues(field, catalog).find(
    (item) => item.value === value,
  );
  return match?.label ?? value;
}

export function clauseLabel(
  clause: FilterClause,
  catalog: FilterCatalog,
): string {
  const field = fieldLabel(clause.field);
  const operator = operatorLabel(clause.operator);
  if (clause.operator === "isEmpty") return `${field} ${operator}`;
  const values = clause.values
    .map((value) => displayValue(clause.field, value, catalog))
    .join(" or ");
  return `${field} ${operator} ${values}`;
}

export function serializeFilters(clauses: FilterClause[]): string {
  return clauses
    .map((clause) => {
      const values = clause.values.map(encodeURIComponent).join(",");
      return `${clause.field}:${clause.operator}:${values}`;
    })
    .join("|");
}

export function parseFilters(value: string | null | undefined): FilterClause[] {
  const raw = value?.trim();
  if (!raw) return [];
  const clauses: FilterClause[] = [];
  for (const part of raw.split("|")) {
    if (!part) continue;
    const first = part.indexOf(":");
    const second = part.indexOf(":", first + 1);
    if (first < 0 || second < 0) continue;
    const field = part.slice(0, first);
    const operator = part.slice(first + 1, second);
    if (!isFilterField(field) || !isFilterOperator(operator)) continue;
    const values = part
      .slice(second + 1)
      .split(",")
      .flatMap((item) => {
        if (!item) return [];
        try {
          return [decodeURIComponent(item)];
        } catch {
          return [item];
        }
      });
    if (operator !== "isEmpty" && values.length === 0) continue;
    clauses.push({ field, operator, values });
  }
  return clauses;
}

function taskFieldValues(task: Task, field: FilterField): string[] {
  switch (field) {
    case "assignee":
      return task.assigneeId ? [task.assigneeId] : [];
    case "priority":
      return task.priority ? [task.priority] : [];
    case "milestone":
      return task.milestoneId ? [task.milestoneId] : [];
    case "tag":
      return task.tags ?? [];
    case "status":
      return [task.columnId];
    case "estimate":
      return task.estimateTshirt ? [task.estimateTshirt] : [];
    case "kind":
      return task.workKind ? [task.workKind] : [];
    case "title":
      return task.title ? [task.title] : [];
  }
}

function matchesClause(task: Task, clause: FilterClause): boolean {
  const current = taskFieldValues(task, clause.field);
  if (clause.operator === "isEmpty") return current.length === 0;
  if (clause.operator === "contains") {
    return clause.values.some((needle) => {
      const query = needle.trim().toLowerCase();
      if (!query) return false;
      return current.some((value) => value.toLowerCase().includes(query));
    });
  }
  const wanted = new Set(clause.values);
  const hits = current.some((value) => wanted.has(value));
  return clause.operator === "isNot" ? !hits : hits;
}

export function taskMatchesFilters(
  task: Task,
  clauses: FilterClause[],
): boolean {
  if (clauses.length === 0) return true;
  return clauses.every((clause) => matchesClause(task, clause));
}

export function matchingTaskIds(
  tasks: Task[],
  clauses: FilterClause[],
): Set<string> | null {
  if (clauses.length === 0) return null;
  const ids = new Set<string>();
  for (const task of tasks) {
    if (taskMatchesFilters(task, clauses)) ids.add(task.id);
  }
  return ids;
}

export function filterColumnCards(
  cards: VisibleColumnCard[],
  matchedIds: Set<string> | null,
): VisibleColumnCard[] {
  if (!matchedIds) return cards;
  const visible: VisibleColumnCard[] = [];
  for (const card of cards) {
    if (matchedIds.has(card.task.id)) {
      visible.push(card);
      continue;
    }
    const nested = card.nested.filter((child) => matchedIds.has(child.id));
    if (nested.length > 0) visible.push({ ...card, nested });
  }
  return visible;
}

export function upsertClause(
  clauses: FilterClause[],
  next: FilterClause,
): FilterClause[] {
  if (next.operator === "isEmpty") {
    return [
      ...clauses.filter((clause) => clause.field !== next.field),
      { field: next.field, operator: "isEmpty", values: [] },
    ];
  }
  const withoutEmpty = clauses.filter(
    (clause) => !(clause.field === next.field && clause.operator === "isEmpty"),
  );
  const index = withoutEmpty.findIndex(
    (clause) =>
      clause.field === next.field && clause.operator === next.operator,
  );
  if (index < 0) return [...withoutEmpty, next];
  const current = withoutEmpty[index];
  const values = [...current.values];
  for (const value of next.values) {
    if (!values.includes(value)) values.push(value);
  }
  return withoutEmpty.map((clause, clauseIndex) =>
    clauseIndex === index ? { ...clause, values } : clause,
  );
}

export function removeClause(
  clauses: FilterClause[],
  key: string,
): FilterClause[] {
  return clauses.filter((clause) => clauseKey(clause) !== key);
}

export function cycleClauseOperator(clause: FilterClause): FilterClause {
  if (clause.operator === "is") return { ...clause, operator: "isNot" };
  if (clause.operator === "isNot") return { ...clause, operator: "is" };
  return clause;
}

export function replaceClause(
  clauses: FilterClause[],
  key: string,
  next: FilterClause,
): FilterClause[] {
  return clauses.map((clause) => (clauseKey(clause) === key ? next : clause));
}

function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 1;
  const hay = haystack.toLowerCase();
  const query = needle.toLowerCase();
  if (hay === query) return 100;
  if (hay.startsWith(query)) return 80;
  const index = hay.indexOf(query);
  if (index >= 0) return 60 - Math.min(index, 20);
  const tokens = hay.split(/[\s/_-]+/);
  if (tokens.some((token) => token.startsWith(query))) return 50;
  return 0;
}

function bestAliasScore(spec: FieldSpec, query: string): number {
  let best = scoreMatch(spec.label, query);
  for (const alias of spec.aliases) {
    const score = scoreMatch(alias, query);
    if (score > best) best = score;
  }
  return best;
}

function splitFieldPrefix(query: string): {
  field?: FilterField;
  rest: string;
} {
  const trimmed = query.trim();
  if (!trimmed) return { rest: "" };
  const lower = trimmed.toLowerCase();
  let best: { field: FilterField; rest: string; length: number } | null = null;
  for (const spec of FIELDS) {
    const names = [spec.label, spec.field, ...spec.aliases];
    for (const name of names) {
      const prefix = name.toLowerCase();
      if (lower === prefix) {
        return { field: spec.field, rest: "" };
      }
      if (!lower.startsWith(`${prefix} `)) continue;
      if (!best || prefix.length > best.length) {
        best = {
          field: spec.field,
          rest: trimmed.slice(name.length).trim(),
          length: prefix.length,
        };
      }
    }
  }
  return best ? { field: best.field, rest: best.rest } : { rest: trimmed };
}

function splitOperatorPrefix(query: string): {
  operator?: FilterOperator;
  rest: string;
} {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "empty" || lower.startsWith("empty ")) {
    return { operator: "isEmpty", rest: trimmed.slice(5).trim() };
  }
  if (lower.startsWith("is not ")) {
    return { operator: "isNot", rest: trimmed.slice(7).trim() };
  }
  if (lower.startsWith("is empty")) {
    return { operator: "isEmpty", rest: trimmed.slice(8).trim() };
  }
  if (lower.startsWith("not ")) {
    return { operator: "isNot", rest: trimmed.slice(4).trim() };
  }
  if (lower.startsWith("contains ")) {
    return { operator: "contains", rest: trimmed.slice(9).trim() };
  }
  if (lower.startsWith("is ")) {
    return { operator: "is", rest: trimmed.slice(3).trim() };
  }
  return { rest: trimmed };
}

function suggestionId(clause: FilterClause, drillField?: FilterField): string {
  if (drillField) return `drill:${drillField}`;
  return `apply:${clauseKey(clause)}`;
}

function sameClause(left: FilterClause, right: FilterClause): boolean {
  if (left.field !== right.field || left.operator !== right.operator) {
    return false;
  }
  if (left.values.length !== right.values.length) return false;
  return left.values.every((value, index) => value === right.values[index]);
}

function alreadyActive(clauses: FilterClause[], next: FilterClause): boolean {
  return clauses.some((clause) => {
    if (clause.field !== next.field || clause.operator !== next.operator) {
      return false;
    }
    if (next.operator === "isEmpty") return true;
    return next.values.every((value) => clause.values.includes(value));
  });
}

type RankedSuggestion = FilterSuggestion & { score: number };

function pushSuggestion(
  into: RankedSuggestion[],
  suggestion: FilterSuggestion,
  score: number,
  active: FilterClause[],
) {
  if (score <= 0) return;
  if (!suggestion.drillField && alreadyActive(active, suggestion.clause))
    return;
  if (into.some((item) => item.id === suggestion.id)) return;
  into.push({ ...suggestion, score });
}

function valueSuggestions(
  field: FilterField,
  query: string,
  operator: FilterOperator,
  catalog: FilterCatalog,
  active: FilterClause[],
): RankedSuggestion[] {
  const ranked: RankedSuggestion[] = [];
  if (field === "title") {
    const text = query.trim();
    if (text.length < 2) return ranked;
    const clause: FilterClause = {
      field: "title",
      operator: "contains",
      values: [text],
    };
    pushSuggestion(
      ranked,
      {
        id: suggestionId(clause),
        label: `Title contains ${text}`,
        clause,
      },
      90,
      active,
    );
    return ranked;
  }

  const emptyAllowed =
    field === "assignee" ||
    field === "milestone" ||
    field === "tag" ||
    field === "priority" ||
    field === "estimate" ||
    field === "kind";
  if (emptyAllowed) {
    const emptyScore =
      !query ||
      scoreMatch("empty", query) ||
      scoreMatch("unassigned", query) ||
      scoreMatch("none", query);
    if (emptyScore) {
      const clause: FilterClause = { field, operator: "isEmpty", values: [] };
      pushSuggestion(
        ranked,
        {
          id: suggestionId(clause),
          label: `${fieldLabel(field)} is empty`,
          clause,
        },
        typeof emptyScore === "number" ? Math.max(emptyScore, 40) : 40,
        active,
      );
    }
  }

  const nextOperator =
    operator === "isEmpty" || operator === "contains" ? "is" : operator;
  for (const option of optionValues(field, catalog)) {
    const score = query ? scoreMatch(option.label, query) : 70;
    if (!score) continue;
    const clause: FilterClause = {
      field,
      operator: nextOperator,
      values: [option.value],
    };
    pushSuggestion(
      ranked,
      {
        id: suggestionId(clause),
        label: `${fieldLabel(field)} ${operatorLabel(nextOperator)} ${option.label}`,
        detail: option.label,
        clause,
      },
      score,
      active,
    );
  }
  return ranked;
}

export function suggestFilters(
  query: string,
  catalog: FilterCatalog,
  active: FilterClause[],
  drillField?: FilterField,
): FilterSuggestion[] {
  const trimmed = query.trim();
  const ranked: RankedSuggestion[] = [];

  if (drillField) {
    const { operator, rest } = splitOperatorPrefix(trimmed);
    ranked.push(
      ...valueSuggestions(drillField, rest, operator ?? "is", catalog, active),
    );
    return ranked
      .toSorted((left, right) => right.score - left.score)
      .slice(0, MAX_SUGGESTIONS);
  }

  for (const empty of EMPTY_QUERIES) {
    if (!empty.pattern.test(trimmed.toLowerCase())) continue;
    const clause: FilterClause = {
      field: empty.field,
      operator: "isEmpty",
      values: [],
    };
    pushSuggestion(
      ranked,
      {
        id: suggestionId(clause),
        label: `${fieldLabel(empty.field)} is empty`,
        clause,
      },
      100,
      active,
    );
  }

  const prefixed = splitFieldPrefix(trimmed);
  if (prefixed.field) {
    const { operator, rest } = splitOperatorPrefix(prefixed.rest);
    if (!rest && !operator) {
      const drill: FilterClause = {
        field: prefixed.field,
        operator: "is",
        values: [],
      };
      pushSuggestion(
        ranked,
        {
          id: suggestionId(drill, prefixed.field),
          label: fieldLabel(prefixed.field),
          detail: "Choose a value",
          clause: drill,
          drillField: prefixed.field,
        },
        95,
        active,
      );
    }
    ranked.push(
      ...valueSuggestions(
        prefixed.field,
        rest,
        operator ?? (prefixed.field === "title" ? "contains" : "is"),
        catalog,
        active,
      ),
    );
  }

  if (trimmed) {
    const { operator, rest } = splitOperatorPrefix(trimmed);
    const valueQuery = rest || trimmed;
    for (const spec of FIELDS) {
      if (spec.field === "title") continue;
      const fieldScore = bestAliasScore(spec, trimmed);
      if (fieldScore >= 50) {
        const drill: FilterClause = {
          field: spec.field,
          operator: "is",
          values: [],
        };
        pushSuggestion(
          ranked,
          {
            id: suggestionId(drill, spec.field),
            label: spec.label,
            detail: "Choose a value",
            clause: drill,
            drillField: spec.field,
          },
          fieldScore,
          active,
        );
      }
      ranked.push(
        ...valueSuggestions(
          spec.field,
          valueQuery,
          operator ?? "is",
          catalog,
          active,
        ).map((item) => ({
          ...item,
          score: Math.min(item.score, fieldScore || item.score),
        })),
      );
    }
    if (trimmed.length >= 2) {
      const clause: FilterClause = {
        field: "title",
        operator: "contains",
        values: [trimmed],
      };
      pushSuggestion(
        ranked,
        {
          id: suggestionId(clause),
          label: `Title contains ${trimmed}`,
          clause,
        },
        35,
        active,
      );
    }
  } else {
    for (const spec of FIELDS) {
      const drill: FilterClause = {
        field: spec.field,
        operator: "is",
        values: [],
      };
      pushSuggestion(
        ranked,
        {
          id: suggestionId(drill, spec.field),
          label: spec.label,
          detail:
            spec.field === "title" ? "Match card titles" : "Choose a value",
          clause: drill,
          drillField: spec.field,
        },
        70,
        active,
      );
    }
  }

  const unique: RankedSuggestion[] = [];
  for (const item of ranked.toSorted(
    (left, right) => right.score - left.score,
  )) {
    if (unique.some((seen) => seen.id === item.id)) continue;
    if (
      !item.drillField &&
      unique.some(
        (seen) => !seen.drillField && sameClause(seen.clause, item.clause),
      )
    ) {
      continue;
    }
    unique.push(item);
    if (unique.length >= MAX_SUGGESTIONS) break;
  }
  return unique;
}
