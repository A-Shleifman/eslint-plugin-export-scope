import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "dynamic",
          include: ["tests/**/*.test.ts"],
        },
      },
      "test-project",
      "test-project-eslint-v8",
    ],
  },
});
