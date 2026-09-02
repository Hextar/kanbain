import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Skeleton from "./Skeleton";

const meta = {
  title: "Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lines: Story = {
  render: () => (
    <div className="flex w-56 flex-col gap-2">
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
