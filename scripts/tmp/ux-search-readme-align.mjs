import { readFile, writeFile } from "node:fs/promises";

const path = "README.md";
let source = await readFile(path, "utf8");
const marker = "<!-- UX-SEARCH-CONVERGENCE-CURRENT-START -->";
const anchor = "Première mission : `BENCHMARK-SERP-1`, rapport dans `docs/BENCHMARK_SERP_1_REPORT.md`.\n";
const block = [
  "<!-- UX-SEARCH-CONVERGENCE-CURRENT-START -->",
  "### Convergence Search actuelle — UX-SEARCH-1 + UX-SEARCH-2 ✅",
  "",
  "- **UX-SEARCH-1 — Density First ✅ PR #479** : mobile 2 colonnes conservé, tablette 2, desktop intermédiaire 3, large desktop 4 ; cartes liste desktop compactées ; densité certifiée **9,3/10**.",
  "- **UX-SEARCH-2 — Compact Search & Filters ✅ PR #480** : recherche + filtres ramenés à une ligne primaire compacte ; première annonce à **240 px** sur 360/390, **252 px** sur 768 et **250 px** sur 1024/1280/1440 ; touch targets mobiles critiques **48 px** ; 0 overflow ; Product Design Reviewer + Independent Release Certifier PASS ; audit visuel **9,5/10**.",
  "- Les deux lots préservent ranking, DATA, Source Registry, dédup, ordre commercial, prix, Map et informations de confiance/source.",
  "- **Prochain LOT UX/Search : UX-SEARCH-3 — Card Architecture** : hiérarchie `IMAGE → PRIX → TITRE → LOCALISATION → FACTS → PROVENANCE`, avec densité et transparence AkarFinder préservées ; gate UX ≥9/10.",
  "<!-- UX-SEARCH-CONVERGENCE-CURRENT-END -->",
].join("\n");

if (!source.includes(marker)) {
  if (!source.includes(anchor)) throw new Error("README UX/Search anchor missing");
  source = source.replace(anchor, `${anchor}\n${block}\n`);
  await writeFile(path, source, "utf8");
}
console.log("README UX/Search alignment complete");