import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import PopoverPanel, { Popover } from "./PopoverPanel";

const meta = {
  title: "PopoverPanel",
  component: PopoverPanel,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: function DefaultStory() {
    const [open, setOpen] = useState(true);
    return (
      <div className="flex h-48 justify-end">
        <Popover open={open} onClose={() => setOpen(false)}>
          <Button
            kind="outline"
            size="xs"
            type="button"
            variant="secondary"
            onClick={() => setOpen((current) => !current)}
          >
            Filter
          </Button>
          {open ? (
            <PopoverPanel className="w-64 p-3" role="dialog">
              <p className="relative text-sm text-zinc-300">
                Assignee, priority, title…
              </p>
            </PopoverPanel>
          ) : null}
        </Popover>
      </div>
    );
  },
};
