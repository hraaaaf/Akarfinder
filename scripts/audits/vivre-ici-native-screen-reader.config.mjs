import { withGuidepup } from "@guidepup/playwright";

const reader = process.env.NATIVE_READER;
if (!["nvda", "voiceover"].includes(reader)) {
  throw new Error("NATIVE_READER must be nvda or voiceover");
}

export default withGuidepup({
  testDir: ".",
  testMatch: /vivre-ici-native-screen-reader\.spec\.mjs$/,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/native-sr/playwright-report.json" }],
  ],
  outputDir: "artifacts/native-sr/results",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3205",
    browserName: reader === "nvda" ? "chromium" : "webkit",
    headless: false,
    trace: "retain-on-failure",
    screenshot: "on",
    viewport: { width: 1280, height: 900 },
  },
});
