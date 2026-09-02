import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Columns3 } from "lucide-react";
import Button from "./Button";
import EmptyState from "./EmptyState";

const meta = {
  title: "EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Page: Story = {
  args: {
    size: "page",
    glow: true,
    title: "No projects yet",
    body: "Add a title and a short description.",
    icon: <Columns3 aria-hidden size={28} />,
    action: (
      <Button type="button" size="sm">
        New project
      </Button>
    ),
  },
};

export const Compact: Story = {
  args: {
    size: "compact",
    title: "Could not load projects",
    body: "The API may be down.",
    action: (
      <Button type="button" size="sm">
        Try again
      </Button>
    ),
  },
};
