import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(
  resolve(__dirname, "../../../components/search/LightZillowSearchShell.tsx"),
  "utf8",
);

test("search UI treats the public cursor as opaque text", () => {
  assert.match(shell, /next_cursor\?: string \| null/);
  assert.match(shell, /useState<string \| null>\(null\)/);
  assert.doesNotMatch(shell, /next_cursor\?: number \| null/);
});

test("indexed pagination is owned by the Search Gateway", () => {
  assert.match(shell, /function buildGatewayUrl/);
  assert.match(shell, /return `\/api\/search\/gateway\?\$\{params\.toString\(\)\}`/);
  assert.match(shell, /fetch\(buildGatewayUrl\(filters, nextCursor\)/);
  assert.doesNotMatch(shell, /fetch\(buildSearchUrl\(filters, sortBy, nextCursor\)/);
});

test("gateway is enabled by default but retains an explicit kill switch", () => {
  assert.match(
    shell,
    /process\.env\.NEXT_PUBLIC_SEARCH_GATEWAY_ENABLED !== "false"/,
  );
});

test("first page and continuation expose the complete cursor contract", () => {
  assert.match(shell, /setNextCursor\(payload\.next_cursor \?\? null\)/);
  assert.match(
    shell,
    /setHasMoreIndexed\(payload\.has_more === true && payload\.next_cursor != null\)/,
  );
  assert.match(shell, /setIndexedTotalCount/);
});

test("continuation pages merge by canonical source URL before id fallback", () => {
  assert.match(
    shell,
    /result\.original_url \|\| result\.display_url \|\| result\.id/,
  );
  assert.match(shell, /if \(!merged\.has\(key\)\) merged\.set\(key, result\)/);
});

test("gateway receives price and surface filters from the public UI", () => {
  for (const param of ["min_price", "max_price", "min_surface"]) {
    assert.match(shell, new RegExp(`params\\.set\\("${param}"`));
  }
});
