import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const replaceMarked = (text, start, end, body) => {
  const a = text.indexOf(start); const b = text.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`markers missing: ${start}`);
  return text.slice(0,a) + body + text.slice(b + end.length);
};

const mass6 = '- **MASS-6 ✅ CLOSED — PR #572** — National Mass Engine shadow ; merge `471e792f0ea14b6a0bf54ef7fad09eff0d341030` ; exact head `b50e6275393043b736f35c783415b393b86751f9` ; run `31731327963` SUCCESS ; artefact `9196734887`, digest `sha256:48c0a4cdf3bf83dc9f8f4f1d9a7a37c48dc4ad636412a0a3b83817e49e0bc9e0` ; pipeline `DISCOVER → CLASSIFY → POLICY → INDEX → FRESHNESS → DEDUP → RANK` fail-closed, bloqué à `POLICY` ; 209 109 discovery rows, 109 domaines Source Factory, 8 nouveaux domaines post-baseline, 0 Registry admissible ; preuves MASS-1/4/5 read-only vérifiées ; 0 write/fetch/activation/permission inférée.';

let r = read('README.md');
r = replaceMarked(r,'<!-- DATA-MASS-CURRENT-START -->','<!-- DATA-MASS-CURRENT-END -->',`<!-- DATA-MASS-CURRENT-START -->\n## DATA MASS — état courant\n\n- **MASS-1 ✅ CLOSED / 9,5/10** — réservoir qualifié à 101 domaines.\n- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 \`PERMISSION_REQUIRED\`, 58 \`HOLD\`, 0 permission positive/activation inférée.\n- **MASS-3 ✅ CLOSED — PR #566** — Minimal Listing Index fail-closed ; 35 Registry rows, 0 admissible, 0 canary, 0 mutation.\n- **MASS-4 ✅ CLOSED — PR #568** — Mass Reclassification read-only ; 5 284 sources actives, 0 admissible ; \`Quality ≠ Eligibility ≠ Permission\`.\n- **MASS-5 ✅ CLOSED — PR #569** — Discovery Expansion Shadow ; 109 domaines live au run final MASS-6, les ajouts restent non autorisés/non activables.\n${mass6}\n\nDoctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.\n\n**PROGRAMME MASS-1 → MASS-6 ✅ CLOSED. Aucun MASS-7 canonique n’est défini. Toute mutation/activation production reste soumise à un gate humain explicite séparé.**\n<!-- DATA-MASS-CURRENT-END -->`);
write('README.md',r);

let m = read('docs/ROADMAP.md');
m = m.replace(/\*\*Statut :[^\n]*\*\*/,'**Statut : MASS-1 ✅ CLOSED ; MASS-2 ✅ CLOSED / 100 % ; MASS-3 ✅ CLOSED ; MASS-4 ✅ CLOSED PR #568 ; MASS-5 ✅ CLOSED PR #569 ; MASS-6 ✅ CLOSED PR #572.**');
m = replaceMarked(m,'<!-- DATA-MASS-PROGRAM-START -->','<!-- DATA-MASS-PROGRAM-END -->',`<!-- DATA-MASS-PROGRAM-START -->\n## DATA MASS — Programme national de volume\n\n**Doctrine : \`MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME\`.**\n\n### MASS-1 ✅ CLOSED\n### MASS-2 ✅ CLOSED / 100 %\n### MASS-3 ✅ CLOSED — PR #566\n### MASS-4 ✅ CLOSED — PR #568\nReclassification live read-only ; \`Quality ≠ Eligibility ≠ Permission\` confirmé.\n\n### MASS-5 ✅ CLOSED — PR #569\nDiscovery Expansion Shadow ; nouveaux domaines mesurés sans autorisation implicite.\n\n### MASS-6 ✅ CLOSED — PR #572\nNational Mass Engine shadow ; exact head \`b50e6275393043b736f35c783415b393b86751f9\` ; run \`31731327963\` SUCCESS ; artefact \`9196734887\`, digest \`sha256:48c0a4cdf3bf83dc9f8f4f1d9a7a37c48dc4ad636412a0a3b83817e49e0bc9e0\`. Le pipeline national ordonné est fail-closed et s’arrête à \`POLICY\` avec 0 source Registry admissible ; 209 109 discovery rows, 109 domaines Source Factory, 8 ajouts post-baseline ; 0 mutation/fetch/activation/permission inférée.\n\n**Ordre verrouillé et terminé : MASS-1 → MASS-2 → MASS-3 → MASS-4 → MASS-5 → MASS-6. Aucun MASS-7 n’est défini dans la roadmap.**\n<!-- DATA-MASS-PROGRAM-END -->`);
write('docs/ROADMAP.md',m);

let s = read('docs/SESSION.md');
s = s.replace('- **MASS-6 🔄 NEXT — National Mass Engine read-only**.', mass6);
s = s.replace(/\*\*DATA MASS-6\*\*[^\n]*(?:\n(?!\n)[^\n]*)*/,'**DATA MASS : MASS-1 → MASS-6 ✅ CLOSED.** Aucun MASS-7 canonique n’est défini. Le National Mass Engine reste shadow/read-only et fail-closed à POLICY tant que le Source Registry ne contient aucune autorisation positive. Toute écriture DB/Registry/Search ou activation exige un feu vert humain explicite préalable.');
write('docs/SESSION.md',s);
