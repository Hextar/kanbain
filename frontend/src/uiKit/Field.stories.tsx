import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Field, { FormMessage } from "./Field";
import Input from "./Input";

const meta = {
  title: "Field",
  component: Field,
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {
    htmlFor: "field-title",
    label: "Title",
    children: <Input id="field-title" placeholder="KanbAIn" />,
  },
};

export const Message: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Field htmlFor="field-key" label="API key">
        <Input id="field-key" type="password" />
      </Field>
      <FormMessage>Could not save the key.</FormMessage>
    </div>
  ),
};
