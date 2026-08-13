import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-QUICKFILTERS-1 source contract",()=>{const q=fs.readFileSync("components/search/QuickFilters.tsx","utf8");const css=fs.readFileSync("app/search/search-controls-10of10.css","utf8");assert.match(q,/data-premium-quickfilters="ux-premium-quickfilters-1"/);for(const key of ["all","buy","rent","price","filters"])assert.match(q,new RegExp(`data-quickfilter="${key}"`));assert.match(q,/>Tous</);assert.match(q,/>À vendre</);assert.match(q,/>À louer</);assert.match(q,/>Prix</);assert.match(q,/>Filtres</);assert.match(q,/setTransaction\("all"\)/);assert.match(q,/setTransaction\("buy"\)/);assert.match(q,/setTransaction\("rent"\)/);assert.match(q,/setShowFilters\(true\)/);assert.match(css,/premium-quickfilter-chip/);assert.match(css,/min-height:44px/);assert.match(css,/aria-pressed/);});
