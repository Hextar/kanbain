import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Select from "./Select";

const meta = {
  title: "Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Milestone",
    children: (
      <>
        <option value="">None</option>
        <option value="m1">M1 Launch</option>
        <option value="m2">M2 Polish</option>
      </>
    ),
  },
};
