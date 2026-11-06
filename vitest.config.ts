import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      include: [
        "src/domain/**/*.ts",
        "src/shared/validation.ts",
        "src/infrastructure/attachment-migration.ts",
      ],
    },
  },
});
