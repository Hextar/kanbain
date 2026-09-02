import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProgressRing from "./ProgressRing";

const meta = {
  title: "ProgressRing",
  component: ProgressRing,
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Partial: Story = {
  args: { completed: 3, total: 12 },
};

export const Complete: Story = {
  args: { completed: 8, total: 8 },
};
