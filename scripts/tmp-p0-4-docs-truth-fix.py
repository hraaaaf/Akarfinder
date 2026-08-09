from pathlib import Path

p = Path('README.md')
s = p.read_text()
s = s.replace(
    'Prochain lot mass-index : **P0.4 — Registry Pattern Review Shadow** sur les **5 strong uniquement**. Il doit convertir les signatures en propositions de patterns avec contrôles positifs/négatifs et shadow replay ; aucune activation automatique. Les 6 reviewable restent hors activation et les 7 insufficient restent bloqués.',
    'Étape mass-index suivante après P0.4 : **revue Registry/canary bornée uniquement aux 2 candidats `SHADOW_ACCEPTABLE`**, dans un LOT séparé avec revalidation policy/autorisation et rollback avant toute mutation. Les 3 candidats rejetés restent bloqués.'
)
p.write_text(s)

p = Path('docs/ROADMAP.md')
s = p.read_text()
old = '**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; prochain lot UX Search = PRICE-COVERAGE-RECOVERY-1 ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 Common Crawl Discovery Coverage ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**'
new = '**Statut : UX/Carte P1B.4 ✅ production certifiée ; BENCHMARK-SERP-1 ✅ ; SEARCH-UX-FAST-1 ✅ PR #390 ; SEARCH-WORDING-PURITY-1 ✅ PR #391 ; SEARCH-CONTINUOUS-FLOW-1 ✅ PR #393 ; SEARCH-MOBILE-CARD-GRID-1 ✅ PR #394 ; prochain lot UX Search = PRICE-COVERAGE-RECOVERY-1 ; couche Offre quartier OFF ; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**'
if old not in s:
    raise SystemExit('ROADMAP status anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

Path('.github/workflows/p0-4-docs-truth-fix-temp.yml').unlink(missing_ok=True)
Path('scripts/tmp-p0-4-docs-truth-fix.py').unlink(missing_ok=True)
