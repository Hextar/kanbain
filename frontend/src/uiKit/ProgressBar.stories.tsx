import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ProgressBar from "./ProgressBar";

const meta = {
  title: "ProgressBar",
  component: ProgressBar,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Bar: Story = {
  args: { label: "Planning progress", percent: 42 },
};

export const Flush: Story = {
  render: () => (
    <div className="relative h-24 overflow-hidden rounded-xl border border-white/8 bg-[#181b24]">
      <ProgressBar
        label="Tasks completed"
        percent={70}
        trackClassName="bg-purple-950"
        variant="flush"
      />
    </div>
  ),
};
