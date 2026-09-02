import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Input from "./Input";

const meta = {
  title: "Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Task title", "aria-label": "Title" },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true, "aria-label": "Disabled" },
};
