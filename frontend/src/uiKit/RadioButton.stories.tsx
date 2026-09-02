import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RadioButton from "./RadioButton";

const meta = {
  title: "RadioButton",
  component: RadioButton,
} satisfies Meta<typeof RadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  render: function GroupStory() {
    const [value, setValue] = useState("board");
    return (
      <div className="flex gap-2">
        <RadioButton
          name="view"
          selected={value === "board"}
          onChange={() => setValue("board")}
        >
          Board
        </RadioButton>
        <RadioButton
          kind="outline"
          name="view"
          selected={value === "flow"}
          onChange={() => setValue("flow")}
        >
          Flow
        </RadioButton>
      </div>
    );
  },
};
