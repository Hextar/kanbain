import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LightOrb from "./LightOrb";

const meta = {
  title: "LightOrb",
  component: LightOrb,
} satisfies Meta<typeof LightOrb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-40 w-64 overflow-hidden rounded-xl border border-white/8 bg-[#181b24]">
      <LightOrb />
    </div>
  ),
};
