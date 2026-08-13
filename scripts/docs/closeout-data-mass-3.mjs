import fs from "node:fs";

function replaceBlock(path,start,end,replacement){const src=fs.readFileSync(path,"utf8");const a=src.indexOf(start),b=src.indexOf(end);if(a<0||b<0||b<a)throw new Error(`markers missing: ${path}`);fs.writeFileSync(path,src.slice(0,a)+replacement.trimEnd()+"\n"+src.slice(b+end.length));}

replaceBlock("README.md","<!-- DATA-MASS-CURRENT-START -->","<!-- DATA-MASS-CURRENT-END -->",`<!-- DATA-MASS-CURRENT-START -->
## DATA MASS — état courant

- **MASS-1 ✅ CLOSED / 9,5/10** — réservoir qualifié à 101 domaines.
- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 \`PERMISSION_REQUIRED\`, 58 \`HOLD\`, 0 permission positive/activation inférée.
- **MASS-3 ✅ CLOSED — PR #566** — Minimal Listing Index certifié fail-closed. Merge \`604306a82e646596fd320fed88b4256f5caca49f\`; 35 Registry rows, 0 policy-admissible, 0 canary, 0 write/activation/fetch/permission inférée ; artefact \`9188304851\`, digest \`sha256:40007b378620da7869c5e819f029e483b6d04d0d1422e2a0e818716a0506d63f\`.

Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.

**NEXT : MASS-4 — Mass Reclassification, strictement read-only.**
<!-- DATA-MASS-CURRENT-END -->`);

replaceBlock("docs/ROADMAP.md","<!-- DATA-MASS-PROGRAM-START -->","<!-- DATA-MASS-PROGRAM-END -->",`<!-- DATA-MASS-PROGRAM-START -->
## DATA MASS — Programme national de volume

**Doctrine : \`MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME\`.**

### MASS-1 ✅ CLOSED
### MASS-2 ✅ CLOSED / 100 %
### MASS-3 ✅ CLOSED — PR #566
3A contrat shadow/read-only ; 3B projection live read-only ; 3C Canary Readiness fail-closed. État final : 35 Registry rows, 0 admissible, 0 canary, 0 mutation.

### MASS-4 🔄 NEXT — Mass Reclassification
Réévaluer le stock historique sous \`Quality ≠ Eligibility\`, strictement read-only, sans transformer qualité/crawlabilité/attribution en permission.

### MASS-5 🔵 PLANNED — Discovery Expansion
### MASS-6 🔵 PLANNED — National Mass Engine

**Ordre verrouillé : MASS-1 → MASS-2 → MASS-3 → MASS-4 → MASS-5 → MASS-6.**
<!-- DATA-MASS-PROGRAM-END -->`);

let r=fs.readFileSync("docs/ROADMAP.md","utf8");r=r.replace(/^\*\*Statut :.*\*\*$/m,"**Statut : MASS-1 ✅ CLOSED ; MASS-2 ✅ CLOSED / 100 % ; MASS-3 ✅ CLOSED PR #566 ; MASS-4 🔄 NEXT — Mass Reclassification read-only.**");fs.writeFileSync("docs/ROADMAP.md",r);

let s=fs.readFileSync("docs/SESSION.md","utf8");s=s.replace(/- \*\*MASS-3A[\s\S]*?- Doctrine : attribution ≠ permission ; robots\/sitemap\/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass\./,`- **MASS-3 ✅ CLOSED — PR #566** — merge \`604306a82e646596fd320fed88b4256f5caca49f\`; 35 Registry rows, 0 policy-admissible, 0 canary, 0 write/activation/fetch/permission inférée ; artefact \`9188304851\`, digest \`sha256:40007b378620da7869c5e819f029e483b6d04d0d1422e2a0e818716a0506d63f\`.\n- **MASS-4 🔄 NEXT — Mass Reclassification read-only**.\n- Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.`);s=s.replace(/\*\*DATA MASS-3C\*\*[\s\S]*?feu vert humain explicite séparé\./,`**DATA MASS-4** : figer le contrat Mass Reclassification read-only → classifier le stock historique sans mutation → distinguer qualité, éligibilité et permission → preuve/artefact → closeout. Zéro écriture DB/Registry/Search.`);fs.writeFileSync("docs/SESSION.md",s);
