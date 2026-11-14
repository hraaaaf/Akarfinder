import { expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { nvdaTest, voiceOverTest } from "@guidepup/playwright";

const readerName = process.env.NATIVE_READER;
if (readerName !== "nvda" && readerName !== "voiceover") {
  throw new Error("Native screen-reader test requires NATIVE_READER=nvda|voiceover");
}
const test = readerName === "nvda" ? nvdaTest : voiceOverTest;
const normalise = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function exercise({ page, reader }, testInfo) {
  const response = await page.goto("/map?city=casablanca&district=maarif&layer=explore", { waitUntil: "domcontentloaded", timeout: 60_000 });
  expect(response?.status()).toBe(200);

  const root = page.locator('[data-maplibre-spike][data-l3-maarif-pilot="true"]');
  await expect(root).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Maârif", level: 1 })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);

  // Actual NVDA/VoiceOver fixture; no virtual reader or Playwright-only substitute.
  await page.bringToFront();
  let announcedHeading = false;
  const announcements = [];
  const saveSpoken = async (stage) => {
    const dir = resolve("artifacts/native-sr");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${readerName}-speech.json`), JSON.stringify({
      reader: readerName, stage, headingAnnounced: announcedHeading,
      headingNavigation: announcements,
      spokenLog: await reader.spokenPhraseLog(),
    }, null, 2));
  };
  // Retry the real native heading rotor once; preserve evidence even on FAIL.
  for (let pass = 0; pass < 2 && !announcedHeading; pass += 1) {
    await page.bringToFront();
    await reader.navigateToWebContent();
    for (let attempt = 0; attempt < 18; attempt += 1) {
      await reader.nextHeading();
      const spoken = await reader.lastSpokenPhrase();
      announcements.push({ pass: pass + 1, attempt: attempt + 1, spoken });
      if (normalise(spoken).includes("maarif")) {
        announcedHeading = true;
        break;
      }
    }
    await saveSpoken(announcedHeading ? "heading-confirmed" : `heading-pass-${pass + 1}-not-found`);
  }
  expect(announcedHeading, "NVDA/VoiceOver must speak the Maârif heading").toBe(true);

  // VoiceOver's cursor is distinct from browser DOM focus. On macOS, locate
  // the control in its *native reader cursor* and perform its default action.
  const activateViaVoiceOver = async (label, maxSteps = 45) => {
    await reader.navigateToWebContent();
    const visited = [];
    for (let step = 0; step < maxSteps; step += 1) {
      await reader.perform(reader.keyboardCommands.findNextControl);
      const text = String(await reader.itemText());
      const phrase = String(await reader.lastSpokenPhrase());
      visited.push({ text, phrase });
      if (normalise(text + " " + phrase).includes(normalise(label))) {
        await reader.act();
        return;
      }
    }
    await saveSpoken("control-not-found");
    throw new Error("VoiceOver could not navigate to control " + label + "; visited: " + JSON.stringify(visited.slice(-12)));
  };

  const control = page.locator("[data-l3-go-admin]");
  await expect(control).toBeVisible();
  if (readerName === "voiceover") {
    await activateViaVoiceOver("Limites");
  } else {
    await control.focus();
    await reader.press("Enter");
  }
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

  await saveSpoken("limites-open");
  if (readerName === "voiceover") {
    await activateViaVoiceOver("Retour au quartier");
  } else {
    await explanation.locator("[data-l3-admin-return]").focus();
    await reader.press("Enter");
  }
  await expect(root).toHaveAttribute("data-l3-maarif-view", "quartier");
  await expect(control).toHaveAttribute("aria-expanded", "false");
  await expect(control).not.toHaveAttribute("aria-controls", /./);
  await saveSpoken("complete");
  await page.screenshot({ path: `artifacts/native-sr/${readerName}-quartier-after-reader.png`, animations: "disabled" });
}

if (readerName === "nvda") {
  test("NVDA announces Maârif and activates Limites", async ({ page, nvda }, testInfo) => {
    await exercise({ page, reader: nvda }, testInfo);
  });
} else {
  test("VoiceOver announces Maârif and activates Limites", async ({ page, voiceOver }, testInfo) => {
    await exercise({ page, reader: voiceOver }, testInfo);
  });
}
