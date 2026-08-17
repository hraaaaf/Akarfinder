from pathlib import Path

p = Path('docs/ANNOUNCEMENT_PAGE_ULTRA_PREMIUM_ROADMAP.md')
s = p.read_text()

old_status = '**Statut : ANN-L0 ✅ CLOSED ; ANN-L1 ✅ CLOSED ; ANN-L2 ✅ CLOSED ; ANN-L3 ✅ CLOSED ; ANN-L4 ✅ CLOSED ; ANN-L5 ✅ CLOSED ; ANN-L6 ✅ CLOSED ; ANN-L7 ✅ CLOSED ; ANN-L8 ✅ CLOSED ; ANN-L9 ✅ CLOSED ; ANN-L10 ✅ CLOSED ; ANN-L11 ✅ CLOSED ; ANN-L12 ✅ CLOSED ; ANN-L13 NEXT**'
new_status = '**Statut : ANN-L0 ✅ CLOSED ; ANN-L1 ✅ CLOSED ; ANN-L2 ✅ CLOSED ; ANN-L3 ✅ CLOSED ; ANN-L4 ✅ CLOSED ; ANN-L5 ✅ CLOSED ; ANN-L6 ✅ CLOSED ; ANN-L7 ✅ CLOSED ; ANN-L8 ✅ CLOSED ; ANN-L9 ✅ CLOSED ; ANN-L10 ✅ CLOSED ; ANN-L11 ✅ CLOSED ; ANN-L12 ✅ CLOSED ; ANN-L13 ✅ CLOSED**'
assert old_status in s
s = s.replace(old_status, new_status, 1)
assert '**Progression stricte : 94 / 100 %.**' in s
s = s.replace('**Progression stricte : 94 / 100 %.**', '**Progression stricte : 100 / 100 %.**', 1)

start_marker = '### ANN-L13 — Certification 10/10 — 6 % — NEXT'
end_marker = '## 9. Ordre du chemin critique'
assert start_marker in s and end_marker in s
start = s.index(start_marker)
end = s.index(end_marker, start)
new_l13 = '''### ANN-L13 — Certification 10/10 — 6 % — ✅ CLOSED

Référence visuelle normative : `docs/ANNOUNCEMENT_PAGE_CANONICAL_VISUAL_TARGET.md`. Convergence globale certifiée baseline / target / après, avec rail desktop final `Pro / conversion → Mon Projet → Marché & comparables`, adaptation mobile cohérente et aucune donnée marché synthétique.

Gate CLOSED : exact head `64b3ed6798b978b58f8386f5daa215079c487ed3`, run `32061681062` SUCCESS ; `UI All Pages Certification` run `32061680991` SUCCESS ; artefact L13 `9298022291`, digest `sha256:dbb95df120b3d1678e32d3ba80af8307d82cb47a745c91cbf2f6a67b7cee3a06`, **6/6 captures + 0 finding**. Revue humaine after : **9,4/10 mobile**, **9,6/10 desktop**, **9,5/10 global**. Runtime mergé via PR #805, squash `4b13fd56eecface6d31635fe3358e21f5ef708a5`. Détails : `docs/ANNOUNCEMENT_PAGE_L13_CLOSEOUT.md`.

**Crédit officiel ANN-L13 : +6 %. Progression cumulée : 100 %. Programme `ANNOUNCEMENT-PAGE-ULTRA-PREMIUM` fermé.**

'''
s = s[:start] + new_l13 + s[end:]

assert '| ANN-L13 | 6 % | NEXT | 0 % |' in s
s = s.replace('| ANN-L13 | 6 % | NEXT | 0 % |', '| ANN-L13 | 6 % | ✅ CLOSED | 6 % |', 1)
assert '**Progression officielle actuelle : 94 / 100 %.**' in s
s = s.replace('**Progression officielle actuelle : 94 / 100 %.**', '**Progression officielle actuelle : 100 / 100 %.**', 1)
p.write_text(s)
