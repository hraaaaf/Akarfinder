import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const header = readFileSync(join(root, "components/layout/SiteHeader.tsx"), "utf8");
const bottomNav = readFileSync(join(root, "components/layout/MobileBottomNav.tsx"), "utf8");
const alerts = readFileSync(join(root, "app/alerts/page.tsx"), "utf8");
const workspace = readFileSync(join(root, "components/account/UserContinuityWorkspace.tsx"), "utf8");
const searchShell = readFileSync(join(root, "components/search/LightZillowSearchShell.tsx"), "utf8");
const onboarding = readFileSync(join(root, "app/onboarding/page.tsx"), "utf8");
const legacyProfile = readFileSync(join(root, "app/profil-recherche/page.tsx"), "utf8");
const legacyCompanion = readFileSync(join(root, "app/compagnon/page.tsx"), "utf8");

test("global navigation exposes Mon Projet as the single product name", () => {
  assert.match(header, /href:\s*["']\/mon-projet["'],\s*text:\s*["']Mon Projet["']/);
  assert.doesNotMatch(header, /href:\s*["']\/compagnon["']/);
  assert.doesNotMatch(header, /text:\s*["']Conseils["']/);
  assert.doesNotMatch(header, /text:\s*["']Compagnon["']/);
  assert.doesNotMatch(header, /aria-label=["']Mon compte["']/);
});

test("mobile bottom nav names the destination Mon Projet instead of Compte", () => {
  assert.match(bottomNav, /href:\s*["']\/mon-projet["'][\s\S]{0,100}?label:\s*["']Mon Projet["']/);
  assert.doesNotMatch(bottomNav, /label:\s*["']Compte["']/);
});

test("alerts links directly to Mon Projet with canonical product wording", () => {
  assert.match(alerts, /href=["']\/mon-projet["']/);
  assert.match(alerts, /Configurer Mon Projet/);
  assert.doesNotMatch(alerts, /href=["']\/profil-recherche["']/);
});

test("active Search and workspace entries use Mon Projet directly", () => {
  assert.match(searchShell, /href=["']\/mon-projet["']/);
  assert.doesNotMatch(searchShell, /href=["']\/compagnon["']/);
  assert.match(workspace, /href=["']\/mon-projet["']/);
  assert.doesNotMatch(workspace, /href=["']\/compagnon["']/);
  assert.doesNotMatch(workspace, /Structurer avec le Compagnon|Le Compagnon construit|Nouveau projet avec le Compagnon/);
});

test("legacy onboarding converges directly on Mon Projet", () => {
  assert.match(onboarding, /redirect\(`\/mon-projet\?\$\{params\.toString\(\)\}`\)/);
  assert.doesNotMatch(onboarding, /redirect\(`\/compagnon\?/);
  assert.doesNotMatch(onboarding, /Compagnon AkarFinder/);
});

test("legacy aliases converge directly on Mon Projet", () => {
  assert.match(legacyProfile, /canonical:\s*["']\/mon-projet["']/);
  assert.match(legacyProfile, /redirect\(["']\/mon-projet["']\)/);
  assert.match(legacyCompanion, /permanentRedirect\(["']\/mon-projet["']\)/);
});
