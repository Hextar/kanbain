import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CanvasDots from "./CanvasDots";

const meta = {
  title: "CanvasDots",
  component: CanvasDots,
} satisfies Meta<typeof CanvasDots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <CanvasDots className="h-48 w-full rounded-xl">
      <p className="relative p-6 text-sm text-zinc-400">
        Move the pointer to light the canvas.
      </p>
    </CanvasDots>
  ),
};
