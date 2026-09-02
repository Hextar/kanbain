import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AppHeader, { HeaderProvider, HeaderSlot } from "./AppHeader";
import Button from "./Button";

const meta = {
  title: "AppHeader",
  component: AppHeader,
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Project: Story = {
  render: () => (
    <HeaderProvider>
      <div className="w-full min-w-[40rem]">
        <AppHeader projectName="KanbAIn">
          <Button kind="ghost" size="xs" type="button" variant="secondary">
            Settings
          </Button>
        </AppHeader>
        <HeaderSlot
          center={<span className="text-xs text-zinc-400">Board / Flow</span>}
        >
          <span className="text-xs text-zinc-500">3/12 completed</span>
        </HeaderSlot>
      </div>
    </HeaderProvider>
  ),
};
