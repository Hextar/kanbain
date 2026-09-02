import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
import "./preview.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dark: { name: "dark", value: "#12141c" },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ["Overview", "*"],
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "dark" },
  },
  tags: ["autodocs"],
};

export default preview;
