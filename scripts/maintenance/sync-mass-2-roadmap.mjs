import { readFileSync, writeFileSync } from 'node:fs';

const path = 'docs/ROADMAP.md';
const text = readFileSync(path, 'utf8');
const start = text.indexOf('### MASS-2 — Source Factory 🔴 NEXT');
const end = text.indexOf('### MASS-3 — Minimal Listing Index 🔵 PLANNED');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('MASS-2/MASS-3 roadmap anchors not found');
}

const block = `### MASS-2 — Source Factory 🔴 ACTIVE\n\nResponsabilité globale : convertir la queue MASS-1 de **101 domaines / 15 790 signaux immobilier Maroc probables** en décisions de source explicites, prouvées et fail-closed. Une décision se prend **par domaine**, jamais par URL. MASS-2 n'ingère aucune annonce et n'active aucune source dans Search.\n\n#### MASS-2A — Factory Engine 🟠 ACTIVE — 15 %\n\nConstruire le moteur déterministe de Source Factory : schéma de preuve, identité de domaine, rendement attendu, classification de surface, états de décision, raisons fail-closed, couverture Registry et contrat de sortie reproductible. **Aucun jugement juridique automatique et aucun Registry write.**\n\n#### MASS-2B — High-Yield Sources 🔵 PLANNED — 25 %\n\nAuditer en priorité les ~15–20 domaines portant le plus de volume potentiel. Pour chaque domaine : identité réelle, stock Maroc, robots.txt, CGU/permissions publiques disponibles, canaux observables, sitemap/structure, fraîcheur et proposition de mode. Toute absence ou ambiguïté de preuve reste fail-closed.\n\n#### MASS-2C — Mid-Yield Sources 🔵 PLANNED — 20 %\n\nAuditer le deuxième groupe d'environ 30 domaines selon le même contrat de preuve et de décision, sans abaisser les gates pour gagner du volume.\n\n#### MASS-2D — Long-Tail Sources 🔵 PLANNED — 20 %\n\nAuditer tout le reliquat jusqu'à **101/101 domaines couverts** et classer explicitement les domaines non exploitables, étrangers, annuaires, agrégateurs non admissibles ou sans preuve suffisante.\n\n#### MASS-2E — Policy Matrix & Registry Preview 🔵 PLANNED — 10 %\n\nConsolider la matrice finale \\`domain → evidence → channel → proposed policy → expected yield\\`, détecter conflits/expirations et produire un **Registry preview**. Aucun write production n'est permis sans preuve explicite et gate séparé ; par défaut le preview reste read-only.\n\n#### MASS-2F — Source Factory Certification 🔵 PLANNED — 10 %\n\nDouble-check indépendant de la couverture 101/101, revalidation des preuves temporelles, tests fail-closed, exact-head CI, rapport de volume potentiellement récupérable et score final. MASS-2 ne peut être CLOSED sous **9,0/10**.\n\nDécisions autorisées comme **sorties de revue**, jamais comme permission implicite : \\`POLICY_COMPATIBLE\\`, \\`CANONICAL_LINK_ONLY\\`, \\`INTERNAL_ONLY\\`, \\`PERMISSION_REQUIRED\\`, \\`PROHIBITED\\`, \\`HOLD\\`.\n\n**Ordre MASS-2 verrouillé : 2A → 2B → 2C → 2D → 2E → 2F.** Chaque sous-lot = une responsabilité, une branche/PR/certification ; le sous-lot suivant repart du nouveau \\`main\\`.\n\n`;

const next = text.slice(0, start) + block + text.slice(end);
writeFileSync(path, next);
console.log('MASS-2 roadmap block synchronized');
