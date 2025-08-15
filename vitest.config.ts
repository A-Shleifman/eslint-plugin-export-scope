import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "local",
          include: ["tests/**/*.test.ts"],
        },
      },
      "test-project",
      "test-project-eslint-v8",
    ],
  },
});
