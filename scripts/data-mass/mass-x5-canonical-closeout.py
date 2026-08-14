from pathlib import Path
import re

MERGE_SHA = "3f1724faf03fd3c93fdafc2f522d61465d377e5b"
HEAD_SHA = "f66c5578c433df52da37a00dc36d9a39010846ae"
RUN_ID = "31762998799"
ARTIFACT_ID = "9205427369"
DIGEST = "sha256:d3aeb0f481e985c8a7662553ee3e5e589148af724586ad1ed68122dc2f126d43"

proof = f"""- **MASS-X5 ✅ CLOSED — PR #609** — Exact Reconciliation Shadow v2 ; merge `{MERGE_SHA}` ; exact head certifié `{HEAD_SHA}` ; run `{RUN_ID}` SUCCESS ; artefact `{ARTIFACT_ID}`, digest `{DIGEST}` ; 51 169 candidats uniques, 36 732 overlaps exacts, 14 437 net-new exacts ; `candidate = overlap + net-new` vérifié ; invariants : 0 DB write, 0 Registry write, 0 Search activation, 0 source-page fetch, 0 WARC fetch, 0 permission inference ; `candidate_grants_authorization=false`.
- Preuve historique superseded #599/run `31759264360` conservée : 50 200 candidats, 35 764 overlaps, 14 436 net-new, digest `sha256:4986e891418b43aad6bceb2354bef25af61c28af1279212dd5b7c4584229415d`. #599 a été close après divergence ; #609 est la recertification canonique sur `main` courant."""

readme = Path("README.md")
s = readme.read_text()
block = """<!-- DATA-MASS-CURRENT-START -->
## DATA MASS — état courant

- **MASS-1 ✅ CLOSED / 9,5/10** — réservoir qualifié à 101 domaines.
- **MASS-2 ✅ CLOSED / 100 %** — 101/101 audités ; 43 `PERMISSION_REQUIRED`, 58 `HOLD`, 0 permission positive/activation inférée.
- **MASS-3 ✅ CLOSED — PR #566** — Minimal Listing Index fail-closed ; 35 Registry rows, 0 admissible, 0 canary, 0 mutation.
- **MASS-4 ✅ CLOSED — PR #568** — Mass Reclassification read-only ; 5 284 sources actives, 0 admissible ; `Quality ≠ Eligibility ≠ Permission`.
- **MASS-5 ✅ CLOSED — PR #569** — Discovery Expansion Shadow ; nouveaux domaines mesurés sans autorisation implicite.
- **MASS-6 ✅ CLOSED — PR #572** — National Mass Engine shadow ; pipeline national fail-closed bloqué à `POLICY`, 0 Registry admissible.
""" + proof + """

Doctrine : attribution ≠ permission ; robots/sitemap/capability ≠ permission ; candidate ≠ authorization ; Source Registry autoritaire ; no-bypass.

**PROGRAMME DATA MASS ✅ CLOSED. MASS-X5 clôt la série de mesure/réconciliation shadow. Aucune activation ni mutation production n'est autorisée par ces preuves ; tout write DB/Registry/Search reste soumis à un gate humain explicite séparé.**
<!-- DATA-MASS-CURRENT-END -->"""
s2, n = re.subn(r"<!-- DATA-MASS-CURRENT-START -->.*?<!-- DATA-MASS-CURRENT-END -->", block, s, flags=re.S)
assert n == 1, f"README DATA MASS block count={n}"
readme.write_text(s2)

roadmap = Path("docs/ROADMAP.md")
s = roadmap.read_text()
block = f"""<!-- DATA-MASS-PROGRAM-START -->
## DATA MASS — Programme national de volume

**Doctrine : `MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME`.**

### MASS-1 ✅ CLOSED
### MASS-2 ✅ CLOSED / 100 %
### MASS-3 ✅ CLOSED — PR #566
### MASS-4 ✅ CLOSED — PR #568
### MASS-5 ✅ CLOSED — PR #569
### MASS-6 ✅ CLOSED — PR #572
National Mass Engine shadow ; pipeline ordonné fail-closed, 0 source Registry admissible.

### MASS-X5 ✅ CLOSED — PR #609
Exact Reconciliation Shadow v2 ; merge `{MERGE_SHA}` ; exact head `{HEAD_SHA}` ; run `{RUN_ID}` SUCCESS ; artefact `{ARTIFACT_ID}`, digest `{DIGEST}` ; 51 169 candidats uniques = 36 732 overlap exact + 14 437 net-new exact ; invariants fail-closed tous à zéro ; aucune autorisation ou activation implicite.

#599/run `31759264360` reste une preuve historique superseded (50 200 / 35 764 / 14 436) mais n'est pas le closeout canonique à cause de la divergence de branche.

**Programme DATA MASS clôturé. Toute étape ultérieure d'activation, ingestion ou mutation production est un nouveau programme séparé avec gate humain explicite.**
<!-- DATA-MASS-PROGRAM-END -->"""
s2, n = re.subn(r"<!-- DATA-MASS-PROGRAM-START -->.*?<!-- DATA-MASS-PROGRAM-END -->", block, s, flags=re.S)
assert n == 1, f"ROADMAP DATA MASS block count={n}"
s2 = re.sub(r"\*\*Statut : .*?\*\*", "**Statut : DATA MASS ✅ CLOSED ; MASS-X5 ✅ CLOSED PR #609 ; lanes UI/Visual indépendantes.**", s2, count=1)
roadmap.write_text(s2)

session = Path("docs/SESSION.md")
s = session.read_text()
data_block = f"""### DATA MASS

- **MASS-1 → MASS-6 ✅ CLOSED** — programme national fail-closed déjà certifié.
- **MASS-X5 ✅ CLOSED — PR #609** — Exact Reconciliation Shadow v2 ; merge `{MERGE_SHA}` ; exact head `{HEAD_SHA}` ; run `{RUN_ID}` SUCCESS ; artefact `{ARTIFACT_ID}`, digest `{DIGEST}`.
- Résultat exact : **51 169 candidats uniques = 36 732 overlaps + 14 437 net-new**.
- Invariants : **0 DB write / 0 Registry write / 0 Search activation / 0 source-page fetch / 0 WARC / 0 permission inference** ; `candidate_grants_authorization=false`.
- #599/run `31759264360` est conservé comme preuve historique superseded ; #609 est la recertification canonique sur main courant.
- **DATA MASS est réellement CLOSED.** Toute activation ou mutation production est hors scope et exige un gate humain explicite.

### UX/Search"""
s2, n = re.subn(r"### DATA MASS\n.*?\n### UX/Search", data_block, s, flags=re.S)
assert n == 1, f"SESSION DATA MASS section count={n}"
s2 = re.sub(r"\*\*DATA MASS : MASS-1 → MASS-6 ✅ CLOSED\.\*\*.*?préalable\.", "**DATA MASS : programme CLOSED, MASS-X5 PR #609 certifié et mergé.** Aucune écriture DB/Registry/Search ni activation n’a été effectuée ; toute mutation production future exige un feu vert humain explicite préalable.", s2, count=1)
session.write_text(s2)

for p in (readme, roadmap, session):
    text = p.read_text()
    assert "MASS-X5 ✅ CLOSED" in text
    assert "14 437" in text
    assert MERGE_SHA in text

assert "UI-POLISH-SEARCH-V1-START" in session.read_text()
assert "UX-HEADER-10OF10-1-CLOSEOUT-START" in readme.read_text()
assert "UX-HEADER-10OF10-1-CLOSEOUT-START" in roadmap.read_text()
