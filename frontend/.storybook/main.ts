import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/uiKit/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/nextjs-vite",
  viteFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(dirname, "../src"),
      "@api": path.resolve(dirname, "../src/api"),
      "@libraries": path.resolve(dirname, "../src/libraries"),
      "@modules": path.resolve(dirname, "../src/modules"),
      "@uiKit": path.resolve(dirname, "../src/uiKit"),
    };
    return config;
  },
};

export default config;
