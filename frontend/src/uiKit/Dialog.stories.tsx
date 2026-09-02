import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import Dialog, { DialogPanel } from "./Dialog";

const meta = {
  title: "Dialog",
  component: Dialog,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Open: Story = {
  render: function OpenStory() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          eyebrow="Workspace"
          footer={
            <div className="flex justify-end">
              <Button size="sm" type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          }
          open={open}
          title="Settings"
          onClose={() => setOpen(false)}
        >
          <DialogPanel title="API key">
            <p className="text-sm text-zinc-400">
              The key is encrypted on the server and never shown in full.
            </p>
          </DialogPanel>
        </Dialog>
      </>
    );
  },
};
