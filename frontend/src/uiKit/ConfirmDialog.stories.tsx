import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";

const meta = {
  title: "ConfirmDialog",
  component: ConfirmDialog,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Danger: Story = {
  render: function DangerStory() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          Delete
        </Button>
        <ConfirmDialog
          confirmLabel="Delete card"
          description="This will permanently delete this card and any nested cards."
          open={open}
          title="Delete “Ship filters”?"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};
