import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/e2e",
  reporter: [
    ["junit", { outputFile: "test-results/playwright/junit.xml" }],
    ["html", { outputFolder: "pw-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});