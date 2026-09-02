import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Avatar, { AvatarStack } from "./Avatar";

const meta = {
  title: "Avatar",
  component: Avatar,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Initials: Story = {
  args: {
    initials: "KA",
    className: "bg-violet-500/30 text-violet-100",
  },
};

export const Stack: Story = {
  render: () => (
    <AvatarStack extra={2}>
      <Avatar
        className="bg-sky-500/30 text-sky-100 ring-2 ring-[#181b24]"
        initials="AL"
      />
      <Avatar
        className="-ml-1.5 bg-amber-500/30 text-amber-100 ring-2 ring-[#181b24]"
        initials="BN"
      />
      <Avatar
        className="-ml-1.5 bg-rose-500/30 text-rose-100 ring-2 ring-[#181b24]"
        initials="CM"
      />
    </AvatarStack>
  ),
};
