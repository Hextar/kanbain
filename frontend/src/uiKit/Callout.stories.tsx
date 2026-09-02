import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheckCircle2, CircleAlert } from "lucide-react";
import Callout from "./Callout";

const meta = {
  title: "Callout",
  component: Callout,
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ok: Story = {
  args: {
    tone: "ok",
    title: "An API key is already saved",
    body: "This key ends in 9f2a. Remove it, or paste a new key to replace it.",
    icon: <CheckCircle2 size={16} />,
  },
};

export const Warn: Story = {
  args: {
    tone: "warn",
    title: "An OpenAI API key is required",
    body: "Paste a key below to generate a board.",
    icon: <CircleAlert size={16} />,
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    children: "Could not load settings from the server.",
  },
};
