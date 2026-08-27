import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const rootLayout = readFileSync(join(root, "app/layout.tsx"), "utf8");
const homePage = readFileSync(join(root, "app/page.tsx"), "utf8");
const searchPage = readFileSync(join(root, "app/search/page.tsx"), "utf8");

test("root metadata never injects the homepage canonical into child routes", () => {
  assert.doesNotMatch(
    rootLayout,
    /alternates\s*:\s*\{[\s\S]{0,160}?canonical\s*:\s*["']\/["']/,
  );
});

test("homepage keeps an explicit self canonical", () => {
  assert.match(
    homePage,
    /alternates\s*:\s*\{[\s\S]{0,160}?canonical\s*:\s*["']\/["']/,
  );
});

test("search keeps its dedicated canonical instead of inheriting root metadata", () => {
  assert.match(
    searchPage,
    /alternates\s*:\s*\{[\s\S]{0,160}?canonical\s*:\s*["']\/search["']/,
  );
});
