import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // G1-275-01 (Story 1.20, Checkpoint 276): cap the
    // parallel workers; the default oversubscribed
    // this machine and timed out first page tests.
    maxWorkers: 8,
  },
});
