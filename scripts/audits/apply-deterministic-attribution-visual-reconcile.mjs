import fs from "node:fs";

const path = "scripts/audits/unified-listing-card-1-visual.mjs";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one match for ${before}, got ${count}`);
  source = source.replace(before, after);
}

replaceOnce('source_id: "fixture-source",\n    source_name: "Source Démo",', 'source_id: "agenz",\n    source_name: "RAW LABEL MUST NOT RENDER",');
replaceOnce('source_id: "fixture-source-2",\n    source_name: "Index Public",', 'source_id: "mubawab_serper",\n    source_name: "RAW SECOND LABEL MUST NOT RENDER",');
replaceOnce('source_id: "fixture-source-3",\n    source_name: "Source Locale",', 'source_id: "logic-immo",\n    source_name: "RAW THIRD LABEL MUST NOT RENDER",');
replaceOnce('source_id: "fixture-source-4",\n    source_name: "Source Maroc",', 'source_id: "agenz",\n    source_name: "RAW FOURTH LABEL MUST NOT RENDER",');
replaceOnce('const provenanceIndex = childTexts.findIndex((value) => value.includes("Source externe"));', 'const provenanceIndex = childTexts.findIndex((value) => value.includes("Source publique indexée"));');
replaceOnce('const actionIndex = childTexts.findIndex((value) => value.includes("Voir sur le site d’origine"));', 'const actionIndex = childTexts.findIndex((value) => value.includes("Voir sur Agenz"));');
replaceOnce('if (!metrics.unknownText.includes("Source externe")) throw new Error(`${viewport.name}: external provenance is not visible`);', 'if (!metrics.unknownText.includes("Résultat web externe") || !metrics.unknownText.includes("Mubawab")) throw new Error(`${viewport.name}: deterministic external provenance is not visible`);');
replaceOnce('if (!metrics.firstText.includes("Rabat") || !metrics.firstText.includes("112 m²")) throw new Error(`${viewport.name}: normalized location/facts are not visible`);', 'if (!metrics.firstText.includes("Rabat") || !metrics.firstText.includes("112 m²")) throw new Error(`${viewport.name}: normalized location/facts are not visible`);\n      if (!metrics.firstText.includes("Source publique indexée") || !metrics.firstText.includes("Agenz")) throw new Error(`${viewport.name}: deterministic indexed attribution is not visible`);\n      if (metrics.firstText.includes("RAW LABEL MUST NOT RENDER")) throw new Error(`${viewport.name}: raw source_name leaked into public attribution`);');

fs.writeFileSync(path, source, "utf8");
console.log("DETERMINISTIC-ATTRIBUTION-1 predecessor visual reconcile PASS");
