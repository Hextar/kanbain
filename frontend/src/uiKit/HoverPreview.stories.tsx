import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Card from "./Card";
import HoverPreview from "./HoverPreview";

const meta = {
  title: "HoverPreview",
  component: HoverPreview,
} satisfies Meta<typeof HoverPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: (
      <Card className="w-56" size="sm">
        <p className="text-sm font-semibold text-white">Ship filters</p>
        <p className="mt-1 text-xs text-zinc-400">
          Preview of the nested card.
        </p>
      </Card>
    ),
    children: (
      <span className="text-sm text-zinc-300 underline decoration-zinc-600">
        Hover for preview
      </span>
    ),
  },
};
