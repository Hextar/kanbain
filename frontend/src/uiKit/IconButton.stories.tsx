import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import IconButton from "./IconButton";

const meta = {
  title: "IconButton",
  component: IconButton,
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {
  args: {
    children: <Plus size={16} />,
    "aria-label": "Add",
    variant: "secondary",
  },
};

export const Filled: Story = {
  args: {
    children: <Plus size={16} />,
    "aria-label": "Add",
    kind: "filled",
    variant: "primary",
  },
};
