import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pencil, Trash2 } from "lucide-react";
import Button from "./Button";
import ContextMenu from "./ContextMenu";

const meta = {
  title: "ContextMenu",
  component: ContextMenu,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ContextMenu
      items={[
        {
          id: "rename",
          label: "Rename",
          icon: <Pencil aria-hidden className="size-3.5 text-zinc-500" />,
        },
        { type: "separator" },
        {
          id: "delete",
          label: "Delete",
          danger: true,
          icon: <Trash2 aria-hidden className="size-3.5" />,
        },
      ]}
      label="Card actions"
    >
      <Button kind="outline" type="button" variant="secondary">
        Right-click me
      </Button>
    </ContextMenu>
  ),
};
