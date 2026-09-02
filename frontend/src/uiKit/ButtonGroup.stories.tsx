import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ButtonGroup, { ButtonGroupItem } from "./ButtonGroup";

const meta = {
  title: "ButtonGroup",
  component: ButtonGroup,
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tabs: Story = {
  render: function TabsStory() {
    const [view, setView] = useState("board");
    return (
      <ButtonGroup aria-label="Board view" role="tablist">
        {["Board", "Flow"].map((label) => {
          const id = label.toLowerCase();
          return (
            <ButtonGroupItem
              key={id}
              grow={false}
              role="tab"
              selected={view === id}
              size="xs"
              onClick={() => setView(id)}
            >
              {label}
            </ButtonGroupItem>
          );
        })}
      </ButtonGroup>
    );
  },
};

export const Segmented: Story = {
  render: function SegmentedStory() {
    const [value, setValue] = useState("medium");
    return (
      <ButtonGroup size="sm">
        {["Low", "Med", "High", "Max"].map((label) => {
          const id = label.toLowerCase();
          return (
            <ButtonGroupItem
              key={id}
              selected={value === id}
              tone="primary"
              onClick={() => setValue(id)}
            >
              {label}
            </ButtonGroupItem>
          );
        })}
      </ButtonGroup>
    );
  },
};
