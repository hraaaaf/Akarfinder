from pathlib import Path
import re


def replace_marked(path: str, start: str, end: str, body: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    pattern = re.escape(start) + r".*?" + re.escape(end)
    replacement = start + "\n" + body.strip() + "\n" + end
    updated, count = re.subn(pattern, replacement, text, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one marked block, got {count}")
    file.write_text(updated, encoding="utf-8")


README_BODY = """## DATA MASS — état courant

La priorité DATA actuelle est **la masse nationale policy-safe**. Le programme canonique reste `MASS-1 → MASS-6` avec la doctrine **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME**.

- **MASS-1 — Reservoir Qualification ✅ CLOSED / 9,5/10** : handoff Source Factory figé à **101 domaines**.
- **MASS-2A — Factory Engine ✅ CLOSED / 9,5/10** : PR #519, merge `6cd7625b2ba8e7179ce556841f6306225ba1a3fa`; cohorte immuable **20 high-yield / 30 mid-yield / 51 long-tail**, décisions initiales fail-closed, zéro permission/activation.
- **MASS-2B — High-Yield Sources ✅ CLOSED / 9,4/10** : PR #523, merge `97bb8c6a9596553d7e8794b5f3b06a71cd845d2f`; **20/20** audités = **17 `PERMISSION_REQUIRED` / 3 `HOLD`**, **17** candidats `CANONICAL_LINK_ONLY_CANDIDATE`, **0 approuvé**, Registry **0/20**, zéro write/fetch/activation.
- **MASS-2C — Mid-Yield Sources ✅ CERTIFIED / 9,4/10 — PR #524** : **30/30** rangs 21→50 audités = **17 `PERMISSION_REQUIRED` / 13 `HOLD`**, **17** candidats canonical-link, **0 approuvé**. Rendement figé du cohort : **3 026 URL-représentations / 1 758 signaux immobilier Maroc / 967 structures détail**. Run exact-head `31644744613` SUCCESS; artefact `9160596350`, digest `sha256:53f83d11f9c0ca01da99eba88e3db2d69c277efc4bce8888a17202898823ad63`; Registry **0/30**, drift **0**, zéro DB/DDL/Registry/policy write, zéro source/detail fetch, zéro ingestion/Search activation, zéro permission inférée.

Doctrine MASS-2 : **acquisition directe** et **index minimal attribué** sont deux axes séparés. `Source : X` + lien canonique est obligatoire pour toute future représentation tierce, mais l’attribution ne remplace jamais une permission. `CANONICAL_LINK_ONLY_CANDIDATE` reste non activable tant qu’une baseline transversale ou une permission explicite ne l’autorise pas. Photos et descriptions complètes ne sont jamais réutilisées par défaut; robots/sitemap/capacité ne confèrent aucun droit.

**Prochain sous-lot : MASS-2D — Long-Tail Sources**, rangs 51→101, après landing de #524. Ensuite MASS-2E Policy Matrix puis MASS-2F Certification."""

SESSION_BODY = """## DATA MASS — handover prioritaire

- **MASS-1 ✅ CLOSED / 9,5/10** — cohorte Source Factory certifiée : **101 domaines**.
- **MASS-2A ✅ CLOSED / 9,5/10** — PR #519, merge `6cd7625b2ba8e7179ce556841f6306225ba1a3fa`; moteur déterministe/fail-closed, split **20/30/51**.
- **MASS-2B ✅ CLOSED / 9,4/10** — PR #523, merge `97bb8c6a9596553d7e8794b5f3b06a71cd845d2f`; **20/20 = 17 PERMISSION_REQUIRED / 3 HOLD**, 17 canonical-link candidates, 0 approved.
- **MASS-2C ✅ CERTIFIED / 9,4/10 — PR #524** — **30/30 = 17 PERMISSION_REQUIRED / 13 HOLD**, 17 canonical-link candidates, 0 approved; rendements **3 026 / 1 758 / 967**. Exact-head behavior proof `217d6240a877d0aab96b1d2c5f6c33479e00d2da`, run `31644744613` SUCCESS, artefact `9160596350`, digest `sha256:53f83d11f9c0ca01da99eba88e3db2d69c277efc4bce8888a17202898823ad63`; Registry **0/30**, drift 0.
- Limites MASS-2B/C : **0 direct acquisition authorized, 0 source photo/full-description reuse, 0 DB/DDL/Registry/policy write, 0 source/detail fetch by CI, 0 ingestion, 0 Search/public activation, 0 permission inferred**.
- Doctrine produit : AkarFinder = **attributed minimal index**; attribution ≠ permission; acquisition directe ≠ canonical-link indexing; canonical-link candidates remain non-activable until the transversal baseline or explicit permission exists.
- **NEXT : MASS-2D — Long-Tail Sources**, certified ranks **51→101**, after #524 lands. Do not start MASS-2E before 2D is certified/merged."""

ROADMAP_BODY = """### MASS-2 — Source Factory 🔴 ACTIVE — 60 % certifié à l’issue de 2C

Responsabilité globale : convertir les **101 domaines** issus de MASS-1 en décisions de source explicites, prouvées et fail-closed. Une décision se prend par domaine. MASS-2 n’ingère aucune annonce et n’active aucune source dans Search.

Doctrine produit verrouillée : AkarFinder vise un **index minimal attribué** (`Source : X` + lien canonique), pas une republication. L’attribution ne remplace pas la permission; acquisition directe et indexation canonical-link sont évaluées séparément; photos/descriptions complètes ne sont pas réutilisables par défaut; robots/sitemap/capacité ne confèrent aucun droit.

#### MASS-2A — Factory Engine ✅ CLOSED — 15 %

PR #519, merge `6cd7625b2ba8e7179ce556841f6306225ba1a3fa`, score **9,5/10**. Cohorte certifiée immuable **101 = 20 HIGH_YIELD / 30 MID_YIELD / 51 LONG_TAIL**; moteur déterministe, schéma de preuve et décisions fail-closed; 0 write/fetch/activation/permission inférée.

#### MASS-2B — High-Yield Sources ✅ CLOSED — 25 %

PR #523, merge `97bb8c6a9596553d7e8794b5f3b06a71cd845d2f`, score **9,4/10**. **20/20** : **17 `PERMISSION_REQUIRED` / 3 `HOLD`**; **17** `CANONICAL_LINK_ONLY_CANDIDATE`, **0 approuvé**; Registry 0/20 et zéro mutation/activation.

#### MASS-2C — Mid-Yield Sources ✅ CERTIFIED — 20 %

PR #524. **30/30 rangs 21→50** : **17 `PERMISSION_REQUIRED` / 13 `HOLD`**; **17** canonical-link candidates, **0 approuvé**. Rendement certifié conservé : **3 026 URL-représentations / 1 758 signaux immobilier Maroc / 967 structures détail**. Run `31644744613` SUCCESS; artefact `9160596350`, digest `sha256:53f83d11f9c0ca01da99eba88e3db2d69c277efc4bce8888a17202898823ad63`; Registry **0/30**, drift 0; 0 DB/DDL/Registry/policy write, source/detail fetch, ingestion, Search activation ou permission inférée.

#### MASS-2D — Long-Tail Sources 🔵 NEXT — 20 %

Auditer les **51 domaines rangs 51→101** avec exactement le même contrat : identité, preuves officielles actuelles, séparation acquisition directe / index minimal attribué, `HOLD` par défaut en cas d’absence/ambiguïté. Aucun Registry write, ingestion ou Search activation.

#### MASS-2E — Policy Matrix & Registry Preview 🔵 PLANNED — 10 %

Consolider 2B/2C/2D en matrice de policy et preview Registry, détecter contradictions/expirations, sans mutation automatique. La baseline transversale `CANONICAL_LINK_ONLY` doit être résolue ici ou avant toute activation.

#### MASS-2F — Certification 🔵 PLANNED — 10 %

Certification complète des 101 domaines : couverture, preuves datées, décisions, conflits, expirations, zero-bypass et cohérence Registry/Search. Aucun domaine ne devient activable par volume ou attribution seule."""

replace_marked("README.md", "<!-- DATA-MASS-CURRENT-START -->", "<!-- DATA-MASS-CURRENT-END -->", README_BODY)
replace_marked("docs/SESSION.md", "<!-- DATA-MASS-HANDOVER-START -->", "<!-- DATA-MASS-HANDOVER-END -->", SESSION_BODY)

roadmap = Path("docs/ROADMAP.md")
text = roadmap.read_text(encoding="utf-8")
updated, count = re.subn(
    r"### MASS-2 — Source Factory[^\n]*\n.*?(?=\n### MASS-3\b)",
    ROADMAP_BODY.strip(),
    text,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f"docs/ROADMAP.md: expected exactly one MASS-2 section, got {count}")
roadmap.write_text(updated, encoding="utf-8")
