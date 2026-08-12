import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const headerPath = new URL("../../../components/layout/SiteHeader.tsx", import.meta.url);
const searchPagePath = new URL("../../../app/search/page.tsx", import.meta.url);

test("UX-PREMIUM-HEADER-1 keeps Search on the dedicated header mode", async () => {
  const searchPage = await readFile(searchPagePath, "utf8");
  assert.match(searchPage, /<SiteHeader\s+searchMode\s*\/>/);
});

test("UX-PREMIUM-HEADER-1 encodes the exact premium geometry", async () => {
  const source = await readFile(headerPath, "utf8");
  assert.match(source, /data-premium-search-header="ux-premium-header-1"/);
  assert.match(source, /h-\[67px\]/);
  assert.match(source, /lg:h-\[63px\]/);
  assert.match(source, /grid-cols-\[44px_1fr_44px\]/);
  assert.match(source, /h-\[29px\] w-auto/);
  assert.match(source, /h-\[31px\] w-auto/);
  assert.match(source, /<Menu size=\{23\} strokeWidth=\{1\.8\}/);
  assert.match(source, /<UserRound size=\{23\} strokeWidth=\{1\.8\}/);
});

test("UX-PREMIUM-HEADER-1 preserves the white and blue Search identity", async () => {
  const source = await readFile(headerPath, "utf8");
  const searchBranch = source.slice(source.indexOf("if (searchMode)"), source.indexOf("const transparentActive"));
  assert.match(searchBranch, /bg-white/);
  assert.match(searchBranch, /#0B2545/);
  assert.match(searchBranch, /#0B63CE/);
  assert.doesNotMatch(searchBranch, /orange|amber|bronze/i);
});
