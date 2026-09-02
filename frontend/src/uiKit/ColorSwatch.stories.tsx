import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ColorSwatch from "./ColorSwatch";

const SWATCHES = [
  { id: "violet", label: "Violet", className: "bg-violet-400" },
  { id: "sky", label: "Sky", className: "bg-sky-400" },
  { id: "amber", label: "Amber", className: "bg-amber-400" },
  { id: "rose", label: "Rose", className: "bg-rose-400" },
  { id: "emerald", label: "Emerald", className: "bg-emerald-400" },
];

const meta = {
  title: "ColorSwatch",
  component: ColorSwatch,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Grid: Story = {
  render: function GridStory() {
    const [selected, setSelected] = useState("violet");
    return (
      <div className="grid w-40 grid-cols-5 gap-1.5" role="listbox">
        {SWATCHES.map((swatch) => (
          <ColorSwatch
            key={swatch.id}
            colorClassName={swatch.className}
            label={swatch.label}
            selected={selected === swatch.id}
            onClick={() => setSelected(swatch.id)}
          />
        ))}
      </div>
    );
  },
};
