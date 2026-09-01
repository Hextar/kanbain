"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ListFilter, X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@uiKit/Button";
import IconButton from "@uiKit/IconButton";
import Input from "@uiKit/Input";
import {
  cycleClauseOperator,
  clauseKey,
  clauseLabel,
  displayValue,
  fieldLabel,
  operatorLabel,
  removeClause,
  replaceClause,
  suggestFilters,
  upsertClause,
  type FilterCatalog,
  type FilterClause,
  type FilterField,
  type FilterSuggestion,
} from "../helpers/boardFilter";

type BoardFilterProps = {
  catalog: FilterCatalog;
  clauses: FilterClause[];
  onChange: (clauses: FilterClause[]) => void;
};

const menuClassName =
  "absolute top-full right-0 z-50 mt-1.5 w-[22rem] overflow-hidden rounded-xl border border-white/8 bg-[#181b24] shadow-xl shadow-black/40";

export default function BoardFilter({
  catalog,
  clauses,
  onChange,
}: BoardFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [drillField, setDrillField] = useState<FilterField | undefined>();
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const suggestions = suggestFilters(query, catalog, clauses, drillField);
  const clampedIndex =
    suggestions.length === 0
      ? 0
      : Math.min(activeIndex, suggestions.length - 1);
  const activeSuggestion = suggestions[clampedIndex];
  const activeOptionId = activeSuggestion
    ? `${listId}-${activeSuggestion.id}`
    : undefined;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, drillField]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery("");
      setDrillField(undefined);
      setActiveIndex(0);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setDrillField(undefined);
    setActiveIndex(0);
  }

  function applySuggestion(suggestion: FilterSuggestion) {
    if (suggestion.drillField) {
      setDrillField(suggestion.drillField);
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
      return;
    }
    onChange(upsertClause(clauses, suggestion.clause));
    setQuery("");
    setDrillField(undefined);
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) => {
        const from = Math.min(current, suggestions.length - 1);
        return (from + 1) % suggestions.length;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setActiveIndex((current) => {
        const from = Math.min(current, suggestions.length - 1);
        return (from - 1 + suggestions.length) % suggestions.length;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestion) applySuggestion(activeSuggestion);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (drillField || query) {
        setDrillField(undefined);
        setQuery("");
        setActiveIndex(0);
        return;
      }
      close();
      return;
    }
    if (event.key === "Backspace" && !query && drillField) {
      event.preventDefault();
      setDrillField(undefined);
      setActiveIndex(0);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
      {clauses.length > 0 ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
          {clauses.map((clause) => (
            <FilterChip
              key={clauseKey(clause)}
              catalog={catalog}
              clause={clause}
              onCycle={() =>
                onChange(
                  replaceClause(
                    clauses,
                    clauseKey(clause),
                    cycleClauseOperator(clause),
                  ),
                )
              }
              onRemove={() =>
                onChange(removeClause(clauses, clauseKey(clause)))
              }
            />
          ))}
          <Button
            kind="ghost"
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
      ) : null}
      <div ref={rootRef} className="relative shrink-0">
        <Button
          aria-expanded={open}
          aria-haspopup="listbox"
          className={
            clauses.length > 0 || open
              ? "text-purple-300 hover:text-purple-200"
              : undefined
          }
          kind="ghost"
          size="xs"
          type="button"
          variant="secondary"
          onClick={() => {
            if (open) {
              close();
              return;
            }
            setActiveIndex(0);
            setOpen(true);
          }}
        >
          <span className="inline-flex items-center gap-1">
            <ListFilter aria-hidden size={14} />
            Filter
            {clauses.length > 0 ? (
              <span className="rounded-full bg-purple-500/20 px-1.5 text-[11px] font-medium text-purple-200 tabular-nums">
                {clauses.length}
              </span>
            ) : null}
          </span>
        </Button>
        {open ? (
          <div className={menuClassName}>
            <div className="border-b border-zinc-700 p-2">
              <Input
                ref={inputRef}
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={open}
                autoComplete="off"
                className="h-8 bg-zinc-900 py-1 text-sm"
                name="board-filter"
                placeholder={
                  drillField
                    ? `${fieldLabel(drillField)}…`
                    : "Assignee, priority, title…"
                }
                role="combobox"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
            <ul
              className="max-h-72 overflow-y-auto p-1"
              id={listId}
              role="listbox"
            >
              {suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">
                  {drillField === "title"
                    ? "Type at least 2 characters…"
                    : "No matching filters"}
                </li>
              ) : (
                suggestions.map((suggestion, index) => {
                  const selected = index === clampedIndex;
                  return (
                    <li key={suggestion.id} role="presentation">
                      <button
                        aria-selected={selected}
                        className={twMerge(
                          "flex w-full cursor-pointer flex-col items-start rounded-md px-3 py-1.5 text-left text-sm text-zinc-200",
                          selected
                            ? "bg-gradient-to-br from-violet-500/25 to-purple-600/20 text-white"
                            : "hover:bg-zinc-700/80",
                        )}
                        id={`${listId}-${suggestion.id}`}
                        role="option"
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <span>{suggestion.label}</span>
                        {suggestion.detail &&
                        suggestion.detail !== suggestion.label ? (
                          <span className="text-[11px] text-zinc-500">
                            {suggestion.detail}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {clauses.length > 0 ? (
        <span className="sr-only" aria-live="polite">
          {clauses.length === 1
            ? "1 filter applied"
            : `${clauses.length} filters applied`}
        </span>
      ) : null}
    </div>
  );
}

function FilterChip({
  catalog,
  clause,
  onCycle,
  onRemove,
}: {
  catalog: FilterCatalog;
  clause: FilterClause;
  onCycle: () => void;
  onRemove: () => void;
}) {
  const canCycle = clause.operator === "is" || clause.operator === "isNot";
  const values =
    clause.operator === "isEmpty"
      ? ""
      : clause.values
          .map((value) => displayValue(clause.field, value, catalog))
          .join(" or ");

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-zinc-800/80 py-0.5 pr-0.5 pl-2 text-xs text-zinc-200 ring-1 ring-white/8">
      <span className="flex min-w-0 items-center gap-1">
        <span className="shrink-0">{fieldLabel(clause.field)}</span>
        {canCycle ? (
          <button
            className="shrink-0 cursor-pointer rounded-sm text-zinc-400 hover:text-white focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
            type="button"
            onClick={onCycle}
          >
            {operatorLabel(clause.operator)}
          </button>
        ) : (
          <span className="shrink-0 text-zinc-400">
            {operatorLabel(clause.operator)}
          </span>
        )}
        {values ? <span className="min-w-0 truncate">{values}</span> : null}
      </span>
      <IconButton
        aria-label={`Remove ${clauseLabel(clause, catalog)}`}
        className="size-5 text-zinc-400"
        size="xs"
        type="button"
        variant="secondary"
        onClick={onRemove}
      >
        <X size={12} />
      </IconButton>
    </span>
  );
}
