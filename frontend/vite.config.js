import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setupTests.js",
    include: ["src/**/*.test.{js,jsx}"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "v-test/vitest/junit.xml",
    }
  }
});