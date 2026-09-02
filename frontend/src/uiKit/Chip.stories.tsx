import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Chip from "./Chip";

const meta = {
  title: "Chip",
  component: Chip,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Dismissible: Story = {
  render: function DismissibleStory() {
    const [visible, setVisible] = useState(true);
    if (!visible)
      return (
        <button type="button" onClick={() => setVisible(true)}>
          Restore
        </button>
      );
    return (
      <Chip
        removeLabel="Remove assignee filter"
        onRemove={() => setVisible(false)}
      >
        <span>Assignee</span>
        <span className="text-zinc-400">is</span>
        <span>Ada</span>
      </Chip>
    );
  },
};
