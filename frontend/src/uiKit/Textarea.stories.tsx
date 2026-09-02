import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Textarea from "./Textarea";

const meta = {
  title: "Textarea",
  component: Textarea,
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "What are you building?",
    "aria-label": "Description",
    defaultValue: "A short project description.",
  },
};

export const AutoGrow: Story = {
  render: function AutoGrowStory() {
    const [value, setValue] = useState("Add a description…");
    return (
      <Textarea
        aria-label="Description"
        autoGrow
        className="min-h-5"
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    );
  },
};
