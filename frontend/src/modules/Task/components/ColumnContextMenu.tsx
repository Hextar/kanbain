"use client";

import type { ReactElement } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import ColorSwatch from "@uiKit/ColorSwatch";
import ContextMenu, { type ContextMenuEntry } from "@uiKit/ContextMenu";
import {
  COLUMN_COLOR_OPTIONS,
  type ColumnColorId,
} from "../helpers/columnAccent";

type ColumnContextMenuProps = {
  columnTitle: string;
  color: ColumnColorId;
  disabled?: boolean;
  children: ReactElement;
  onAddCard: () => void;
  onRename: () => void;
  onChangeColor: (color: ColumnColorId) => void;
  onDelete: () => void;
};

function ColorSwatches({
  selected,
  onChange,
}: {
  selected: ColumnColorId;
  onChange: (color: ColumnColorId) => void;
}) {
  return (
    <div
      aria-label="Column color"
      className="grid w-40 grid-cols-5 gap-1.5 p-1.5"
      role="listbox"
    >
      {COLUMN_COLOR_OPTIONS.map((option) => (
        <ColorSwatch
          key={option.id}
          colorClassName={option.dot}
          label={option.label}
          selected={option.id === selected}
          onClick={() => onChange(option.id)}
        />
      ))}
    </div>
  );
}

export default function ColumnContextMenu({
  columnTitle,
  color,
  disabled = false,
  children,
  onAddCard,
  onRename,
  onChangeColor,
  onDelete,
}: ColumnContextMenuProps) {
  return (
    <ContextMenu
      disabled={disabled}
      items={(close): ContextMenuEntry[] => [
        {
          id: "add",
          label: "Add card",
          icon: <Plus aria-hidden className="size-3.5 text-zinc-500" />,
          onSelect: onAddCard,
        },
        {
          id: "rename",
          label: "Rename",
          icon: <Pencil aria-hidden className="size-3.5 text-zinc-500" />,
          onSelect: onRename,
        },
        {
          id: "color",
          label: "Color",
          content: (
            <ColorSwatches
              selected={color}
              onChange={(next) => {
                onChangeColor(next);
                close();
              }}
            />
          ),
        },
        { type: "separator" },
        {
          id: "delete",
          label: "Delete",
          icon: <Trash2 aria-hidden className="size-3.5" />,
          danger: true,
          onSelect: onDelete,
        },
      ]}
      label={`${columnTitle} actions`}
    >
      {children}
    </ContextMenu>
  );
}
