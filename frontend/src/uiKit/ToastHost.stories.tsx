import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";
import ToastHost from "./ToastHost";
import { showToast } from "@libraries/toast";

const meta = {
  title: "ToastHost",
  component: ToastHost,
} satisfies Meta<typeof ToastHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <Button
        type="button"
        onClick={() => showToast("Couldn't retry planning.")}
      >
        Show toast
      </Button>
      <ToastHost />
    </>
  ),
};
