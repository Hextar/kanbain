import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import CollapsibleSlot from "./CollapsibleSlot";

const meta = {
  title: "CollapsibleSlot",
  component: CollapsibleSlot,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Toggle: Story = {
  render: function ToggleStory() {
    const [present, setPresent] = useState(true);
    return (
      <div className="w-64">
        <Button
          kind="outline"
          size="xs"
          type="button"
          variant="secondary"
          onClick={() => setPresent((current) => !current)}
        >
          {present ? "Collapse" : "Expand"}
        </Button>
        <CollapsibleSlot present={present}>
          <p className="pt-2 text-sm text-zinc-400">
            Nested cards sit in this slot.
          </p>
        </CollapsibleSlot>
      </div>
    );
  },
};
