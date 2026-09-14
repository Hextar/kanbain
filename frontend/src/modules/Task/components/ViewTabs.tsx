"use client";

import Link from "next/link";
import { ChartColumn, Columns3 } from "lucide-react";
import { useT } from "@/i18n";
import ButtonGroup, { buttonGroupItemClassName } from "@uiKit/ButtonGroup";
import type { BoardView } from "../helpers/boardView";

const VIEWS = [
  { id: "board" as const, labelKey: "view.board" as const, icon: Columns3 },
  { id: "flow" as const, labelKey: "view.flow" as const, icon: ChartColumn },
];

type ViewTabsProps = {
  view: BoardView;
  hrefFor: (view: BoardView) => string;
  className?: string;
};

export default function ViewTabs({ view, hrefFor, className }: ViewTabsProps) {
  const t = useT();
  return (
    <ButtonGroup
      aria-label={t("view.boardView")}
      className={className}
      role="tablist"
    >
      {VIEWS.map((item) => {
        const selected = item.id === view;
        const Icon = item.icon;
        const label = t(item.labelKey);
        return (
          <Link
            key={item.id}
            aria-controls={`view-panel-${item.id}`}
            aria-label={label}
            aria-selected={selected}
            className={buttonGroupItemClassName({ selected })}
            href={hrefFor(item.id)}
            id={`view-tab-${item.id}`}
            role="tab"
            scroll={false}
            tabIndex={selected ? 0 : -1}
          >
            <Icon aria-hidden className="sm:hidden" size={14} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </ButtonGroup>
  );
}
