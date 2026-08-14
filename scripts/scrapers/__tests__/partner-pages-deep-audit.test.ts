import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicProfileRepository = readFileSync("lib/professional/public-profile.ts", "utf8");
const publicProfilePage = readFileSync("app/professionnels/[slug]/page.tsx", "utf8");
const promoterShell = readFileSync("components/promoters/PromoterPageShell.tsx", "utf8");
const demoRequestButton = readFileSync("components/demo/DemoRequestButton.tsx", "utf8");
const demoData = readFileSync("lib/demo/partner-pages-demo-data.ts", "utf8");

test("public professional profile stays validated, public and truth-bounded", () => {
  assert.match(publicProfileRepository, /validation_status[\s\S]*validated/);
  assert.match(publicProfileRepository, /public_visibility[\s\S]*public/);
  assert.match(publicProfileRepository, /professional_listing_ownership[\s\S]*status[\s\S]*verified/);
  assert.match(publicProfileRepository, /professional_projects[\s\S]*status[\s\S]*published/);
  assert.match(publicProfileRepository, /public_email/);
  assert.match(publicProfileRepository, /public_phone/);
  assert.doesNotMatch(publicProfileRepository, /scrap/i);
});

test("public professional page exposes only explicit public contact and useful SEO", () => {
  assert.match(publicProfilePage, /generateMetadata/);
  assert.match(publicProfilePage, /logo_url/);
  assert.match(publicProfilePage, /mailto:\$\{profile\.public_email\}/);
  assert.match(publicProfilePage, /tel:\$\{profile\.public_phone/);
  assert.match(publicProfilePage, /ownerships vérifiés/);
  assert.match(publicProfilePage, /ne modifie pas la pertinence organique/);
  assert.match(publicProfilePage, /AkarFinder n’affiche pas de contact déduit/);
});

test("public promoter page labels the professional correctly and uses all supplied contact modes", () => {
  assert.match(promoterShell, /Promoteur partenaire/);
  assert.doesNotMatch(promoterShell, />\s*Projet partenaire\s*</);
  assert.match(promoterShell, /promoter\.source_note/);
  assert.match(promoterShell, /contact_whatsapp/);
  assert.match(promoterShell, /contact_email/);
  assert.match(promoterShell, /mailto:\$\{promoter\.contact_email\}/);
  assert.doesNotMatch(promoterShell, /Reporting projet/);
  assert.doesNotMatch(promoterShell, /BarChart2/);
});

test("partner demonstrations remain explicitly fictional and fail-honest", () => {
  assert.match(demoData, /All entries are fictional/);
  assert.match(demoData, /non-contractual/);
  assert.match(demoRequestButton, /no backend call, no lead storage/);
  assert.match(demoRequestButton, /aucune demande réelle envoyée/);
});
