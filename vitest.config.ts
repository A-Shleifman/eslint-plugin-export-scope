import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { projects: ["test-project", "test-project-eslint-v8"] },
});
