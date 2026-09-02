import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";

const meta = {
  title: "Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {
  args: { children: "Save", variant: "primary", kind: "filled" },
};

export const Outline: Story = {
  args: { children: "Cancel", variant: "secondary", kind: "outline" },
};

export const Ghost: Story = {
  args: { children: "Skip", variant: "secondary", kind: "ghost" },
};

export const Danger: Story = {
  args: { children: "Delete", variant: "danger" },
};

export const Disabled: Story = {
  args: { children: "Saving…", disabled: true },
};
