import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
test("UX-PREMIUM-GRID-1 source contract",()=>{const css=fs.readFileSync("app/search/search-premium-grid.css","utf8"),page=fs.readFileSync("app/search/page.tsx","utf8");assert.match(page,/search-premium-grid\.css/);assert.match(css,/UX-PREMIUM-GRID-1/);assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/column-gap:10px!important/);assert.match(css,/row-gap:14px!important/);assert.match(css,/gap:16px!important/)});
