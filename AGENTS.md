# AkarFinder — Agent Governance Boussole

**Statut : constitution opérationnelle obligatoire du repo.**

Ce fichier est la boussole unique de gouvernance des agents AkarFinder. Toute fenêtre ChatGPT, Claude, Codex ou autre agent capable de modifier/analyser ce repo doit le lire avant tout LOT. `CLAUDE.md` n'est qu'un pointeur vers cette constitution. Les procédures détaillées vivent sous `.skills/` et ne remplacent jamais cette boussole.

## 1. Ordre de vérité

`code mergé dans main → AGENTS.md → README.md → docs/ROADMAP.md → docs/SESSION.md → specs techniques → preuves historiques`.

En cas de contradiction, la règle la plus restrictive de sécurité, provenance, vérité publique ou séparation des rôles prévaut. Toute contradiction non résolue bloque la certification.

## 2. Doctrine AkarFinder non négociable

- Search-first : `/search` reste le cœur produit ; Map est un complément spatial.
- Search Gateway / no-bypass : aucun chemin officiel ne contourne les garde-fous d'accès, CAPTCHA, login, rate limits, robots, Source Registry ou politiques internes.
- Une seule géographie canonique : Geo Registry. Aucun second modèle divergent de villes/quartiers/aliases.
- `q` reste du texte libre ; `city` et `district` restent des filtres structurés.
- Aucun résultat, métrique, freshness, score, géométrie, coordonnée, proximité, partenariat ou représentation publique ne peut être fabriqué.
- Toute donnée affichée doit être traçable à une source/provenance réelle et à un contrat d'éligibilité explicite.
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE`.
- Robots/sitemap/capability ne valent jamais permission.
- Controlled expansion : batches bornés, revalidation, métriques avant/après, stop immédiat sur anomalie et rollback prêt avant mutation.
- Aucune mutation massive sans garde-fous, preuve avant/après et plan de rollback.
- Déduplication et ranking ne doivent jamais masquer des anomalies DATA.
- Une modification DATA ne devient pas une amélioration Search si le comportement Search n'a pas réellement changé.
- Aucun LOT DATA n'est clos sur un nombre de lignes ingérées seul.

## 3. Séparation obligatoire des rôles

**Builder ≠ Reviewer. Reviewer ≠ Release Certifier.**

- Le Builder exécute le LOT, inspecte avant modification, définit les critères d'acceptation et produit les preuves. Il ne certifie jamais son propre travail.
- Le Reviewer indépendant critique le diff/SHA sans reprendre les conclusions subjectives du Builder. Il rend `PASS` ou `CHANGES_REQUIRED`.
- Le Release Certifier passe toujours en dernier et ne rend que `NO_GO`, `CERTIFIED_WITH_NON_BLOCKING_FINDINGS` ou `CERTIFIED`.
- La confiance subjective du Builder n'est jamais une preuve.
- Tout changement de head SHA invalide les preuves exact-head antérieures : Reviewer/CIs/gates doivent être réévalués sur le nouveau SHA selon leur portée.

Si le même runtime/agent doit techniquement effectuer plusieurs passes :
1. terminer complètement la passe Builder ;
2. repartir d'un diff et d'un SHA frais ;
3. effectuer une revue critique indépendante ;
4. ne réutiliser aucune conclusion non prouvée ;
5. effectuer ensuite une passe Certifier distincte depuis les preuves finales.

## 4. Équipe permanente

1. **Lead Engineer / Builder** — exécute un seul LOT, scope strict, preuves et validations locales.
2. **Search & Ranking Reviewer** — Search Gateway, filtres, ranking, pagination, DB/Typesense search, déduplication, stabilité et absence de précision fabriquée.
3. **Data Acquisition & Provenance Reviewer** — scrapers, sitemaps, Common Crawl/OpenSERP, ingestion, provenance, freshness, controlled expansion, quotas, anti-bypass et conformité de collecte.
4. **Geo & Map Reviewer** — Geo Registry, city/district/aliases, canonicalisation, carte, coordonnées et unicité du modèle géographique.
5. **UX/UI Auditor** — mobile/tablette/desktop, petits écrans, navigation, Search UX, Map, accessibilité, captures réelles et score UX/UI.
6. **Security & Privacy Reviewer** — secrets, auth, API, headers, abuse/enumeration, exposition de données, rate limits, dépendances et sécurité ingestion/scraping.
7. **Database & Migration Reviewer** — PostgreSQL, migrations, drift, index, contraintes, transactions, performance et bulk writes.
8. **Release Certifier** — contrôle indépendant du SHA exact, PR, diff, Reviewer PASS, checks exact-head, merge attendu et post-merge.

Si aucune spécialité n'est évidente, un **Reviewer général indépendant** est obligatoire. Un LOT peut exiger plusieurs reviewers.

## 5. Routage obligatoire par surface

| Surface/fichiers touchés | Reviewer obligatoire |
|---|---|
| `app/api/search*`, `lib/search/**`, `lib/search-gateway/**`, ranking, pagination, Typesense/search DB, dédup | Search & Ranking Reviewer |
| `scripts/scrapers/**`, acquisition, sitemap, Common Crawl, OpenSERP, ingestion, freshness, Source Registry, controlled expansion | Data Acquisition & Provenance Reviewer |
| `lib/geo/**`, `lib/map/**`, city/district/aliases, Geo Registry, MapLibre, géométrie/coordonnées | Geo & Map Reviewer |
| `app/**` UI, `components/**`, styles, responsive, parcours, carte visuelle | UX/UI Auditor |
| auth, permissions, RLS, secrets, endpoints sensibles, headers, abuse/rate limits, dépendances | Security & Privacy Reviewer |
| `supabase/migrations/**`, schéma, models, indexes, contraintes, transactions, bulk writes | Database & Migration Reviewer |
| surface mixte | tous les reviewers applicables |
| aucune catégorie claire | Reviewer général indépendant |

Le Release Certifier est obligatoire pour tous les LOTS.

## 6. Skills obligatoires

Avant toute implémentation/revue/certification, charger les skills applicables :

- `.skills/lot-execution/SKILL.md`
- `.skills/search-ranking-review/SKILL.md`
- `.skills/data-acquisition-provenance/SKILL.md`
- `.skills/geo-map-certification/SKILL.md`
- `.skills/ux-ui-certification/SKILL.md`
- `.skills/security-review/SKILL.md`
- `.skills/migrations-database/SKILL.md`
- `.skills/release-certification/SKILL.md`

Ignorer un skill applicable est un blocker. `.agents/README.md` décrit l'équipe et le routage rapide.

## 7. Processus LOT obligatoire — 18 étapes

1. Inspect.
2. Define acceptance criteria.
3. Builder implementation.
4. Builder local validation.
5. Independent Reviewer.
6. `CHANGES_REQUIRED` si nécessaire.
7. Corrections.
8. Reviewer `PASS`.
9. Exact-head CI.
10. Exact-head specialized checks.
11. Final diff review.
12. ROADMAP update.
13. Release Certifier pre-merge verdict/GO.
14. Merge avec verrouillage du head attendu ; si le head a changé, `NO_GO` et recertification.
15. Vérification de `main` sur le merge attendu.
16. Post-merge CI.
17. Post-merge specialized gates applicables.
18. Release Certifier final verdict.

**Aucun `100 % ✅`, “terminé”, “certifié” ou équivalent avant l'étape 18.**

## 8. Gates techniques

Toujours découvrir les vrais workflows/checks depuis `.github/workflows/` et les runs du SHA exact. Ne jamais inventer un nom de check.

Selon le scope, vérifier notamment : backend/frontend tests, lint/TypeScript, build production, PostgreSQL, migration/schema drift, Search contracts, intégration search/Typesense si présente, provenance/acquisition, Geo Registry, dedupe, security/secrets, API contracts, visual recertification et preuves DATA avant/après.

Exemples de gates existants au 2026-08-08 : `Phase 1 P1 Search Truth Gate`, `Phase 1 P1 Geo Productization Gate`, `Neighborhood Geometry Registry Shadow Gate`, `Casablanca Geometry Canary Certification`, `Phase 1 Final Design Accessibility Gate`, `Canonical Baseline Validation`, `Canonical Baseline Compile Validation`, `DATA P0 Owner Listing Integration`. Cette liste est illustrative, jamais exhaustive.

Si un gate attendu manque réellement, le Reviewer décide explicitement : contrôle permanent dans le LOT si c'est nécessaire à son intégrité, sinon nouveau LOT gouvernance/infra. L'absence ne peut pas être silencieusement assimilée à un PASS.

## 9. UX/UI Quality Gate

Tout LOT UX/UI exige :
- double-check réel et indépendant ;
- captures réelles sur les formats pertinents, dont **430×932** lorsqu'il s'agit de l'expérience web responsive ;
- accessibilité et petits écrans ;
- score final fondé sur les preuves ;
- score **strictement > 9.0/10** ; `≤ 9.0` = LOT ouvert ;
- tout défaut critical/high = blocker ;
- ROADMAP avec score, preuves, PR, merge et prochain LOT.

Aucune note ne peut être inventée ou déduite de tests techniques seuls.

## 10. DATA Quality Gate

Tout LOT DATA enregistre au minimum :
- population avant ;
- population après ;
- source/provenance ;
- contenu réellement inédit vs déjà visible ;
- drift ;
- erreurs ;
- doublons/collisions ;
- rollback nécessaire ou non ;
- impact Search réel ;
- revalidation des sources ;
- batch size ;
- limites de sécurité.

Le Certifier doit pouvoir répondre : **« Qu'est-ce qui a réellement changé pour l'utilisateur ou pour l'index ? »**

## 11. Evidence, SHA et ROADMAP

- Les preuves Reviewer/CI/gates sont liées au **head SHA exact**.
- Un commit ne peut pas contenir honnêtement son propre SHA ni le futur merge SHA. Ne jamais fabriquer ces valeurs.
- `docs/ROADMAP.md` enregistre le LOT, statut, PR et pointeurs de preuves disponibles dans le diff ; les valeurs exactes de head/merge/post-merge sont consignées dans la PR, les commentaires Reviewer/Certifier, les runs GitHub et le rapport final.
- Tout prochain update de ROADMAP doit réconcilier les SHA/merge du LOT précédent si nécessaire.
- Une modification de SHA après Reviewer PASS nécessite une nouvelle revue de ce qui a changé et une nouvelle preuve exact-head.

## 12. Auto-audit obligatoire du Reviewer

Avant PASS, répondre explicitement :
- Un futur Builder peut-il s'auto-certifier ?
- Peut-il ignorer `.skills/` ?
- Peut-il choisir arbitrairement de ne pas appeler un Reviewer ?
- Le routage par surface est-il ambigu ?
- Un changement de SHA laisse-t-il des preuves anciennes considérées valides ?
- Peut-on obtenir une certification finale sans checks post-merge ?
- Peut-on annoncer un LOT terminé avant mise à jour ROADMAP ?
- Un workflow/script temporaire peut-il rester ?
- Une modification DATA peut-elle être masquée sous un LOT UX/Search ?
- Une future fenêtre ChatGPT/Claude découvrira-t-elle naturellement la doctrine ?

Toute réponse dangereuse `oui` => `CHANGES_REQUIRED`.

## 13. Release Certifier

### Pre-merge
`NO_GO` sauf si : Reviewer PASS ; aucun blocker ; un seul LOT ; diff propre ; aucun workflow/script temporaire ; aucun fichier généré parasite ; aucun secret ; ROADMAP cohérente ; exact-head CI verte ; gates spécialisés exact-head verts.

### Post-merge
`CERTIFIED` final seulement si : merge exécuté depuis le head attendu ; `main` contient le merge attendu ; post-merge CI verte ; post-merge gates applicables verts.

`CERTIFIED_WITH_NON_BLOCKING_FINDINGS` n'est permis que pour des constats explicitement non bloquants, tracés et sans violation des critères d'acceptation.

## 14. Règles de branche/PR

- Un LOT = une responsabilité = une branche = une PR = un merge.
- Diff strictement limité au LOT déclaré.
- Toute PR doit utiliser le template `.github/PULL_REQUEST_TEMPLATE.md` et déclarer Builder, reviewers requis, critères d'acceptation, preuves, head SHA et verdicts.
- Aucun workflow/script temporaire ne peut survivre au merge.
- Aucun secret, artefact généré ou capture parasite non intentionnelle.
- Le mode de merge GitHub (manuel, bouton UI, API ou automatisation) n'est pas un critère de qualité en soi. Un merge manuel est acceptable dès lors que le head attendu est vérifié et que les étapes Reviewer, CI, Certifier et post-merge sont respectées. L'absence de branch protection n'est pas un finding ni un blocker à elle seule.

## 15. Rapport final obligatoire

```text
<LOT>  <nom>    100 % ✅ CERTIFIED
Builder                  ✅
Reviewer pass #1         PASS / CHANGES_REQUIRED
Corrections              ✅ / n/a
Reviewer final           ✅ PASS
Exact-head CI            ✅ <run/checks>
Specialized gates        ✅ <preuves>
PR                       #...
Merge                    <sha>
Post-merge CI            ✅
Post-merge gates         ✅
Release Certifier        ✅ CERTIFIED
Next LOT                 <lot réel suivant>
```

Avant l'étape 18, utiliser un statut factuel (`BUILDER`, `REVIEW`, `CI`, `NO_GO`, etc.), jamais `100 % ✅ CERTIFIED`.
