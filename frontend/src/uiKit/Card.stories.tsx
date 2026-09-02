import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "./Card";

const meta = {
  title: "Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: {
    size: "sm",
    className: "w-64",
    children: (
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-zinc-500">KBN-12</p>
        <p className="text-sm font-semibold text-white">
          Ship the board filters
        </p>
      </div>
    ),
  },
};

export const Medium: Story = {
  args: {
    size: "md",
    className: "w-80",
    children: (
      <div>
        <p className="text-lg font-semibold text-white">KanbAIn</p>
        <p className="mt-1 text-sm text-zinc-400">Plan and track the board.</p>
      </div>
    ),
  },
};
