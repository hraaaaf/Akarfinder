import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(path, "utf8");

test("ANN-L12 preserves explicit project_id from search into internal listing detail", async () => {
  const [searchPage, shell, card, detailPage] = await Promise.all([
    read("app/search/page.tsx"),
    read("components/search/LightZillowSearchShell.tsx"),
    read("components/search/SearchListingCardDark.tsx"),
    read("app/listings/[id]/page.tsx"),
  ]);
  assert.match(searchPage, /projectId=\{requestedProjectId\}/);
  assert.match(shell, /projectId\?: string/);
  assert.match(shell, /SearchListingCardDark[^>]*projectId=\{projectId\}/);
  assert.match(card, /project_id=\$\{encodeURIComponent\(projectId\)\}/);
  assert.match(detailPage, /validProjectId\(resolvedSearchParams\.project_id\)/);
});

test("ANN-L12 never appends project_id to observed external source URLs", async () => {
  const card = await read("components/search/SearchListingCardDark.tsx");
  assert.match(card, /observedExternal && listing\.listing_url \? listing\.listing_url : internalHref/);
});

test("ANN-L12 project reader is owner scoped", async () => {
  const reader = await read("lib/user-continuity/project-reader.ts");
  const api = await read("app/api/me/project-routes/route.ts");
  assert.match(reader, /\.eq\("id", projectId\)/);
  assert.match(reader, /\.eq\("user_id", userId\)/);
  assert.match(api, /authenticateConsumerRequest\(request\)/);
  assert.match(api, /readOwnedProject\(identity\.user_id, projectId\)/);
});
