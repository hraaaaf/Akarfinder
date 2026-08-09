from pathlib import Path

readme=Path('README.md')
roadmap=Path('docs/ROADMAP.md')
session=Path('docs/SESSION.md')

r=readme.read_text()
old="La couche **Offre par quartier reste interdite** : **0,5765 %** de couverture ne justifie aucun choroplèthe national. La prochaine étape Carte poursuit la récupération géographique explicite et certifiable ; aucune couverture n’est fabriquée."
new="""### P1B.6 ✅ PR #424 — Geo Coverage Depth Audit

Audit production strictement read-only après P1B.5 : **15 438** listings Search éligibles, **605** rows reliées à `property_listings`, **89** résolues, **516** non résolues. Parmi elles, **71** ont un `district` explicite mais **0/71** ne possède actuellement d’alias quartier validé confiance 1 ; elles forment **31 couples ville/quartier**. Les **445** restantes n’exposent aucun champ quartier/district structuré dans les metadata autorisées. Provenance exacte double-checkée : `mouldar.com` **42**, `mubawab.ma` **21**, `marrakechrealty.com` **8**. Verdict certifié : `REGISTRY_GAP_IS_NEXT_BOUNDARY`. **0 write, 0 mutation Registry, 0 source-site request, 0 fuzzy, 0 parsing titre/snippet.** Exact-head **19/19 PASS**, Reviewer **9,6/10**, merge `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30`, push gate post-merge PASS.

La couche **Offre par quartier reste interdite** : couverture toujours **89 / 15 438 = 0,5765 %**. Prochain lot Carte : **P1B.7 — Geo Registry Gap Qualification**, read-only d’abord sur les 31 couples ; aucun alias ou quartier ne sera créé par simple intuition."""
assert old in r
readme.write_text(r.replace(old,new,1))

m=roadmap.read_text()
m=m.replace('**Statut : UX/Carte P1B.5 ✅ production certifiée ;','**Statut : UX/Carte P1B.6 ✅ Geo Coverage Depth Audit certifié ;',1)
old2="**Offre quartier reste OFF.** La prochaine lane Carte poursuit la récupération géographique explicite/certifiable ; aucun seuil artificiel ni choroplèthe fabriqué."
new2="""## P1B.6 — Geo Coverage Depth Audit ✅ CLOSED — PR #424

Audit live read-only après P1B.5 : **15 438** listings Search éligibles ; **605** rows avec coverage bridge ; **89** latest-resolved ; **516** non résolues. Sous-cohortes : **71** avec `district` explicite et **445** sans district. Les 71 explicites ont **0 alias quartier validé confidence=1** et forment **31 couples ville/quartier** ; distribution source certifiée après double-check SQL : `mouldar.com` **42**, `mubawab.ma` **21**, `marrakechrealty.com` **8**. Les 445 sans district ne contiennent **aucun champ neighborhood/district/quartier structuré** dans les metadata auditées ; titre/snippet restent interdits comme preuve automatique.

Contrat : read-only, **0 DB/Registry mutation, 0 source-site request, 0 alias/entity creation, 0 fuzzy, 0 title/snippet inference**. Exact-head `311b00bb5d0273f04b4405395e5eb5be13050045`, **19/19 workflows PASS**, specialized live gate PASS, Reviewer **9,6/10**, merge `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30`, post-merge gate PASS. Verdict : **`REGISTRY_GAP_IS_NEXT_BOUNDARY`**.

**Offre quartier reste OFF.** Prochain lot : **P1B.7 — Geo Registry Gap Qualification**, read-only sur les 31 couples avant toute création d’alias/entité. Aucun seuil artificiel ni choroplèthe fabriqué."""
assert old2 in m
roadmap.write_text(m.replace(old2,new2,1))

s=session.read_text()
s=s.replace('**Lane UX/Carte : P1B.5 ✅ Canonical Geo Normalization Recovery certifié en production — PR #419**','**Lane UX/Carte : P1B.6 ✅ Geo Coverage Depth Audit — PR #424 ; prochain LOT = P1B.7 Geo Registry Gap Qualification (read-only first)**',1)
s=s.replace('Main canonique après SEARCH-ACTION-HIERARCHY-1 : `0987b89286d262e7d01ec8e3a868b2424d85c4d5` — merge PR #418. Le LOT n\'introduit aucune migration ni write DATA ; preuve de release = exact-head `a7ddb7d023eac1418eee50e03258f1d056184b64`, **24/24 workflows verts**, Chromium 5 viewports, Benchmark **9,5/10**, Reviewer technique PASS, Release Certifier GO, présence du merge sur `main`.','Main canonique après P1B.6 : `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30` — merge PR #424. P1B.6 est strictement read-only ; exact-head `311b00bb5d0273f04b4405395e5eb5be13050045`, **19/19 workflows verts**, specialized live gate PASS, Reviewer **9,6/10**, post-merge gate PASS.',1)
needle='- P1B.5 ✅ PR #419 — Canonical Geo Normalization Recovery : preflight 20/14/6, write 20/20, 11 Guéliz + 6 Océan + 3 Route de l’Ourika, latest resolved 20/20, coverage Search quartier **89/15 438 = 0,5765 %**, rollback append-only disponible, metric layers OFF ;'
assert needle in s
s=s.replace(needle,needle+'\n- P1B.6 ✅ PR #424 — Geo Coverage Depth Audit read-only : 15 438 Search, 605 bridged, 89 resolved, 516 unresolved = 71 district explicite + 445 sans district ; 0/71 alias quartier confidence-1, 31 couples, sources corrigées/double-checkées = mouldar 42 / mubawab 21 / marrakechrealty 8 ; verdict `REGISTRY_GAP_IS_NEXT_BOUNDARY` ;',1)
session.write_text(s)
print('P1B.6 docs closeout prepared')
