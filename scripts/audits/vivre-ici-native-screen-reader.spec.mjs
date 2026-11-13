import { expect } from "@playwright/test";
import { nvdaTest, voiceOverTest } from "@guidepup/playwright";

const readerName = process.env.NATIVE_READER;
if (readerName !== "nvda" && readerName !== "voiceover") {
  throw new Error("Native screen-reader test requires NATIVE_READER=nvda|voiceover");
}
const test = readerName === "nvda" ? nvdaTest : voiceOverTest;
const normalise = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

test("real screen reader announces Maârif and activates Limites", async (fixtures, testInfo) => {
  const { page } = fixtures;
  const reader = readerName === "nvda" ? fixtures.nvda : fixtures.voiceOver;
  const response = await page.goto("/map?city=casablanca&district=maarif&layer=explore", { waitUntil: "domcontentloaded", timeout: 60_000 });
  expect(response?.status()).toBe(200);

  const root = page.locator('[data-maplibre-spike][data-l3-maarif-pilot="true"]');
  await expect(root).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Maârif", level: 1 })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);

  // Actual NVDA/VoiceOver fixture; no virtual reader or Playwright-only substitute.
  await page.bringToFront();
  await reader.navigateToWebContent();
  let announcedHeading = false;
  const announcements = [];
  for (let attempt = 0; attempt < 18; attempt += 1) {
    await reader.nextHeading();
    const spoken = await reader.lastSpokenPhrase();
    announcements.push(spoken);
    if (normalise(spoken).includes("maarif")) {
      announcedHeading = true;
      break;
    }
  }
  expect(announcedHeading, "NVDA/VoiceOver must speak the Maârif heading").toBe(true);

  const control = page.locator("[data-l3-go-admin]");
  await expect(control).toBeVisible();
  await control.focus();
  // Send Enter via the native reader rather than Playwright's synthetic click.
  await reader.press("Enter");
  const explanation = page.locator('[data-l3-admin-unavailable="true"]');
  await expect(explanation).toBeVisible();
  await expect(explanation.getByText("Limites non disponibles", { exact: true })).toBeVisible();
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await expect(control).toHaveAttribute("aria-expanded", "true");
  await expect(control).toHaveAttribute("aria-controls", "maarif-admin-boundary-explanation");
  await expect(page.locator('[data-l3-admin-preview="true"]')).toHaveCount(0);

  const spokenLog = await reader.spokenPhraseLog();
  await testInfo.attach("native-reader-announcements", {
    body: JSON.stringify({ reader: readerName, headingAnnounced: announcedHeading, headingNavigation: announcements, spokenLog }, null, 2),
    contentType: "application/json",
  });

  await explanation.locator("[data-l3-admin-return]").focus();
  await reader.press("Enter");
  await expect(root).toHaveAttribute("data-l3-maarif-view", "quartier");
  await expect(control).toHaveAttribute("aria-expanded", "false");
  await expect(control).not.toHaveAttribute("aria-controls", /./);
  await page.screenshot({ path: `artifacts/native-sr/${readerName}-quartier-after-reader.png`, animations: "disabled" });
});
