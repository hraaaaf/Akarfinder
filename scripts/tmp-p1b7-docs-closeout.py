from pathlib import Path

README = Path('README.md')
ROADMAP = Path('docs/ROADMAP.md')
SESSION = Path('docs/SESSION.md')

readme = README.read_text()
roadmap = ROADMAP.read_text()
session = SESSION.read_text()

p1b7_readme = '''### P1B.7 ✅ PR #426 — Geo Registry Gap Qualification

Qualification production strictement read-only du gap Registry certifié par P1B.6. Baseline inchangé : **15 438** listings Search éligibles / **605** bridged / **89** resolved / **516** unresolved / **71** avec district explicite / **31** couples ville-quartier. Classification certifiée : **10 couples / 31 rows `PRIORITY_EXTERNAL_VALIDATION`**, **9 / 26 `SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY`**, **10 / 10 `SINGLETON_NEEDS_AUTHORITY`**, `Tanger — Centre-ville` = **1 / 2 `PARENT_MISMATCH_REVIEW`**, `Marrakech — Autres Marrakech` = **1 / 2 `REJECT_PROVIDER_BUCKET`**. La récurrence commerciale sert uniquement à prioriser une validation indépendante ; elle ne constitue jamais une vérité géographique.

Contrat : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 source-site request, 0 fuzzy, 0 title/snippet inference**. Exact-head final après réalignement `d76eeda4de755faf08ec90afdaa0989cd4e8f2de`, **19/19 workflows PASS**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier GO, merge `77bd6ffad41443efbf543cd25caf7539ca593579`, post-merge specialized gate PASS. Verdict : **`EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE`**.

Prochaine étape Carte : **P1B.8 — Geo Authority Evidence Review**, read-only d’abord, en commençant par les 10 couples multi-source prioritaires. Aucun write Geo Registry n’est autorisé par P1B.7.

'''
if '### P1B.7 ✅ PR #426 — Geo Registry Gap Qualification' not in readme:
    anchor = 'La couche **Offre par quartier reste interdite**'
    assert anchor in readme, 'README P1B.6 boundary anchor missing'
    readme = readme.replace(anchor, p1b7_readme + anchor, 1)
README.write_text(readme)

roadmap = roadmap.replace('**Statut : UX/Carte P1B.6 ✅ Geo Coverage Depth Audit certifié ;', '**Statut : UX/Carte P1B.7 ✅ Geo Registry Gap Qualification certifié ;', 1)
p1b7_roadmap = '''## P1B.7 — Geo Registry Gap Qualification ✅ CLOSED — PR #426

Responsabilité unique : **qualifier sans write les 31 couples ville/quartier du gap Registry P1B.6 afin de séparer priorité de validation, preuve insuffisante, mismatch parent et faux bucket fournisseur**.

Preuve production live, reproduite avant et après réalignement sur le `main` courant : baseline **15 438 / 605 / 89 / 516 / 71 / 31** inchangé. Décisions :

- **10 couples / 31 rows `PRIORITY_EXTERNAL_VALIDATION`** — récurrence multi-source, utile uniquement pour prioriser une autorité indépendante ;
- **9 / 26 `SINGLE_SOURCE_REPEAT_NEEDS_AUTHORITY`** ;
- **10 / 10 `SINGLETON_NEEDS_AUTHORITY`** ;
- **Tanger — Centre-ville : 1 couple / 2 rows `PARENT_MISMATCH_REVIEW`** — un nom canonique exact existe ailleurs dans le Registry mais pas sous Tanger ;
- **Marrakech — Autres Marrakech : 1 / 2 `REJECT_PROVIDER_BUCKET`** — bucket fournisseur, pas entité Geo.

Invariants : la récurrence commerciale **n’est pas** une vérité géographique ; aucun alias/entité n’est créé par intuition. Contrat read-only : **0 DB/Registry mutation, 0 alias/entity creation, 0 geo-resolution write, 0 source-site request, 0 fuzzy, 0 title/snippet inference**.

Certification : head initial `85e5cecb439da3c2dfcff8e78222a343d065d027` puis réalignement concurrency-safe sur Search au head final `d76eeda4de755faf08ec90afdaa0989cd4e8f2de` ; **19/19 workflows exact-head PASS**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier **GO**, merge `77bd6ffad41443efbf543cd25caf7539ca593579`, specialized push gate post-merge PASS. Verdict : **`EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE`**.

**Offre quartier reste OFF.** Prochain lot : **P1B.8 — Geo Authority Evidence Review**, read-only d’abord sur les 10 couples multi-source prioritaires, puis élargissement uniquement si la méthode d’autorité indépendante est certifiée. P1B.7 n’autorise aucun write Registry.

'''
if '## P1B.7 — Geo Registry Gap Qualification ✅ CLOSED — PR #426' not in roadmap:
    anchor = '# 5. Fondation DATA acquise'
    assert anchor in roadmap, 'ROADMAP section 5 anchor missing'
    roadmap = roadmap.replace(anchor, p1b7_roadmap + anchor, 1)
ROADMAP.write_text(roadmap)

session = session.replace('**Lane UX/Carte : P1B.6 ✅ Geo Coverage Depth Audit — PR #424 ; prochain LOT = P1B.7 Geo Registry Gap Qualification (read-only first)**', '**Lane UX/Carte : P1B.7 ✅ Geo Registry Gap Qualification — PR #426 ; prochain LOT = P1B.8 Geo Authority Evidence Review (read-only first)**', 1)
old_main = 'Main canonique après P1B.6 : `304726a83e1ef4df5ddacb8ecba925ad2e1c1b30` — merge PR #424. P1B.6 est strictement read-only ; exact-head `311b00bb5d0273f04b4405395e5eb5be13050045`, **19/19 workflows verts**, specialized live gate PASS, Reviewer **9,6/10**, post-merge gate PASS.'
new_main = 'Main canonique après P1B.7 : `77bd6ffad41443efbf543cd25caf7539ca593579` — merge PR #426, incluant le `main` Search `6bcf402158539c547061a6a92d1b408df1da8d22`. P1B.7 est strictement read-only ; exact-head final `d76eeda4de755faf08ec90afdaa0989cd4e8f2de`, **19/19 workflows verts**, specialized live gate PASS, Reviewer **9,6/10**, Release Certifier GO, post-merge gate PASS.'
assert old_main in session, 'SESSION main canonical anchor missing'
session = session.replace(old_main, new_main, 1)
needle = '- P1B.6 ✅ PR #424 — Geo Coverage Depth Audit read-only : 15 438 Search, 605 bridged, 89 resolved, 516 unresolved = 71 district explicite + 445 sans district ; 0/71 alias quartier confidence-1, 31 couples, sources corrigées/double-checkées = mouldar 42 / mubawab 21 / marrakechrealty 8 ; verdict `REGISTRY_GAP_IS_NEXT_BOUNDARY` ;'
assert needle in session, 'SESSION P1B.6 acquired anchor missing'
addition = needle + '\n- P1B.7 ✅ PR #426 — Geo Registry Gap Qualification read-only : 31 couples / 71 rows classés en 10/31 multi-source prioritaires pour validation externe, 9/26 répétitions mono-source, 10/10 singletons, Tanger Centre-ville 1/2 parent-mismatch, Autres Marrakech 1/2 rejet bucket ; verdict `EXTERNAL_AUTHORITY_REQUIRED_BEFORE_REGISTRY_WRITE` ; aucun write Registry autorisé ;'
session = session.replace(needle, addition, 1)
SESSION.write_text(session)

print('P1B.7 canonical docs prepared')
