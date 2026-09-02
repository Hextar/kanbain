import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Badge from "./Badge";

const meta = {
  title: "Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "high",
    className: "bg-rose-500/15 text-rose-300 uppercase",
  },
};

export const Muted: Story = {
  args: { children: "Kanban", tone: "muted" },
};

export const Danger: Story = {
  args: { children: "Failed", tone: "danger" },
};

export const Count: Story = {
  args: {
    children: "12",
    className: "bg-zinc-800 text-zinc-300",
    tone: "count",
  },
};
