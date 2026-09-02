import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import Tooltip from "./Tooltip";

const meta = {
  title: "Tooltip",
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "Priority: High",
    children: (
      <Button kind="ghost" size="xs" type="button" variant="secondary">
        Hover
      </Button>
    ),
  },
};
