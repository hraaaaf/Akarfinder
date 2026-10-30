# AKARFINDER — RÉCONCILIATION PR / PAGES / FONCTIONNALITÉS

**Date de gel d'audit : 2026-10-30.** Repo `hraaaaf/Akarfinder`; référence `main@c02d0b73ed18b0e136d478fab39e71df425173a7` (merge #1129).  
**Portée : décisions de gouvernance et feuille de revue, non pas certification actuelle de l'UI ou de la production.** Constat GitHub : 50 PR ouvertes avant nettoyage ; #1032, #1097, #997, #991, #1057, #1058 et #1059 fermées avec commentaires motivés ; **44 PR ouvertes après ouverture de #1137** (43 restantes du stock initial + #1137). Un commit ultérieur exige de rafraîchir ce décompte.

## GOAL / SUCCÈS / PREUVE

- **Goal** : une source d'instructions actuelle, sans faux merge, faux « actif », doublons de PR ni tâches qui s'annulent.
- **Succès** : chaque PR classée ; une PR produit canonique par filière à la fin de la convergence ; chaque famille de pages possède un contrat KEEP/CHANGE, tests et gate explicites ; Notion/README/ROADMAP/SESSION cohérents.
- **Preuves admissibles** : état Github live (PR/branche/HEAD), diff par fichier, CI exact-HEAD, comportement observé sur mêmes viewports, Notion relu. Une description de PR ou un historique de septembre ne prouve pas un comportement de production.
- **Règles** : aucun merge sans gate humain ; aucun Vercel sans autorisation explicite ; aucune écriture DB sans gate séparé ; aucun crawl/publication d'une source sans autorisation de réutilisation documentée ; ne jamais confondre robots, indexation et licence.

## 1. DECISIONS ACTUELLES / DÉCISIONS DÉPASSÉES

| Sujet | Décision à retenir | Remplacer / ne plus utiliser comme consigne |
|---|---|---|
| Objectif volume | `253 372` = ancien freeze **d'identités candidates L0/L1**, pas de biens uniques ni d'annonces fraîches ; objectif de 200k fraîches/uniques reste distinct et non prouvé. | « M200K atteint » employé comme proxy de 200k offres actuelles et publiables. |
| Origine / droits | Source Registry + preuve de licence/republication par source et par média ; choix sûr par défaut : données first-party et partenaires autorisés. | « robots autorise donc recopier annonces/photos », accès réseau impliquant droits, ou FeenWay comme transfert de droits. |
| Mubawab | #1134 : extraction **offline** et hardening expérimental DRAFT ; #1135 = autorisation contractuelle bloquante pour tout nouveau crawl commercial. | Pilotes live Mubawab automatiques de #997, #1028 ou #1105 sans validation des droits. Aucun flag d'environnement ne vaut licence. |
| Cartographie | Garder moteur national vérité-sourcée ; Maârif `Flat Living Map` en expérimentation #1108, alimentée par #1090 ; #1112 ne certifie que fallback / parcours, pas polygones. | Direction 3D lourde comme target figé de quartier sans comparaison visuelle ; frontières générées/inventées. |
| Données | Découpler représentation, bien physique, preuve de fraîcheur, qualité sémantique, droits d'utilisation et affichabilité. | Comparer librement des totaux Supabase, Neon, Thin, URLs et annonces visibles. |
| DB | Provider dans `lib/db/provider.ts` accepte sqlite/supabase/neon ; `DATABASE_PROVIDER` par défaut `sqlite`. Le fournisseur LIVE effectif n'est pas certifié ici. | « Supabase reste le primary » ou « Neon est déjà le primary de production » sans observation de configuration/runtime. |
| CI | Contrats rapides sur PR, lourds uniquement main/AFTER ; ne pas supprimer les garde-fous de sécurité. | Anciens gates lourds sur chaque PR et CI « verte » sans référencer le HEAD exact. |
| Branding | Identité existante intacte ; art Search harmonisé seulement après revue. | Changements de logo non autorisés. |

## 2. PAGE PAR PAGE — CONTRAT DE REVUE

Ce tableau porte sur les **familles de routes effectivement présentes sous `app/` sur `main`**, et non sur une validation visuelle de chaque écran. KEEP = intention produit conservée ; CHANGE = action à prouver / arbitrer avant livraison.

| Route ou famille de routes | KEEP | CHANGE / VALIDATION OBLIGATOIRE | Filière |
|---|---|---|---|
| `/` Home | Hero de recherche épuré, liens Vivre Ici, navigation et confiance sourcée. | Revoir lisibilité 390/430/768/1280 et preuves de valeurs affichées ; ne pas « appliquer » la PR destructrice #1032. | HOME / UI |
| `/search` | Recherche canonique, options carte/liste/split, tri, filtres, vrai prix et provenance ; continuité session. | Revoir #1035, #1102, #1029, #622, #936 ; uniformiser visuels types, photos/cards, comportement de zoom, zéro résultat, perf ; BEFORE→AFTER + tests. | SEARCH |
| `/map` | National → ville → quartier → rue → Search ; MapLibre avec précision sourcée et fallback honnête. | Composer #1090 + #1108 après inspection AFTER ; territoire lisible, bâtiments discrets, POI sourcés ; n'extrapoler aucun polygone ; #1112 pour régression, pas comme validation finale. | VIVRE ICI |
| `/listings/[id]` | Provenance, photos autorisées, informations du bien, contexte, confiance, CTA source. | Distinguer prix actuel/ancien, location/vente, inconnus, photo manquante, liens morts ; exécuter audits de vérité et test affichage. | DÉTAIL |
| `/acheter`, `/louer`, `/neuf` | Entrées intent et navigation vers Search. | Canoniques SEO, filtres déterministes, compteurs sourcés, aucun contenu inventé. | SEO / SEARCH |
| `/investir`, `/credit`, `/mre` | Guides dédiés et parcours immobilier. | Séparer pédagogie, estimation hypothétique et données de marché vérifiées ; disclaimers appropriés. | ÉDITORIAL |
| `/immobilier`, `/quartiers` | Pages de découverte villes/quartiers. | Contrats de géographie et SEO sans frontière fictive, liens et libellés cohérents. | TERRITOIRE |
| `/compare`, `/favorites`, `/alerts` | Parcours de décision, favoris et alertes. | Réviser persistance, session, consentement, états vides, erreurs réseau, non-régression mobile. | PARCOURS |
| `/mon-projet`, `/profil-recherche`, `/compagnon` | Personnalisation et continuité projet. | Pas d'assertions non sourcées ; données minimales, respect confidentialité et reprise contrôlée. | PERSONALISATION |
| `/vendre`, `/onboarding` | Dépôt vendeur, dossier, consentement. | Auth, droits sur images, validation champs, anti-spam, accès, état de publication ; test compte réel avant déverrouillage. | OWNER |
| `/pro`, `/professionnels`, `/promoteurs`, `/projets` | Profils pros et catalogues séparés par type de partenaire. | Réconcilier #644/#645/#653, identité, parité, RLS, données prouvées, CTA sans fausse activité ; #310 contrôle de sécurité. | B2B |
| `/a-propos`, `/accompagnement`, `/comment-ca-marche`, `/faq`, `/demo`, `/contact` | Contenus de confiance, contact, information. | Liens morts, cohérence des engagements, formulaires, a11y et mobile. | TRUST |
| `/conditions-utilisation`, `/politique-confidentialite`, `/demande-retrait` | Transparence et canal de retrait. | Revue juridique, conservation des données, droits sur photos, procédure takedown et mentions actuelles. | LEGAL |
| `/visual-qa`, `/api` | Outils internes et API de support. | Interdire indexation/exposition non voulue et vérifier les autorisations ; ce ne sont pas des pages marketing. | SEC / QA |

**Pour chaque route modifiée visuellement** : BEFORE (même HEAD/env) → Goal écrit → TARGET/mockup → AFTER à 390/430/768/1280 → test navigation, accessibilité, responsive → scoring indépendant + gate humain. Aucun score nouveau n'est revendiqué ici.

## 3. INVENTAIRE DES 50 PR INITIALLEMENT OUVERTES

Statut : **CLOSE** = action exécutée ; **KEEP** = valeur à préserver, pas autorisation de merge ; **SPLIT** = extraire diff utile avant retrait de vieille branche ; **REVIEW** = décision de fermeture insuffisamment prouvée ; **BLOCK** = ne pas activer.

| Filière | PR | Décision de tri |
|---|---|---|
| Gouvernance test | #1032 | **CLOSE effectué** : test volontairement cassant, preuve archivée. |
| Audit visuel | #1097 | **CLOSE effectué** : outil de capture historique à ne pas merger. |
| Carte produit | #1090 | **KEEP comme source de base**, revoir delta exact sur current main ; ne pas merger indépendamment du pivot V0. |
| Carte pivot | #1108 | **KEEP / prioritaire pour une seule convergence carte** ; V0 flat pilote, children #1112. |
| Carte canary | #1112 | **KEEP comme preuve read-only** puis intégrer uniquement les tests pertinents ; ne pas déclarer UI 9.5. |
| Cartographie données | #1111 | **KEEP source-only** ; revue des identités et centres avant publication nationale. |
| Geo/stades | #1053 | **REVIEW** : intégration ancienne de registre, pas de merge direct. |
| Audits stades | #1057, #1058, #1059 | **CLOSE effectué** : preuves territoriales négatives archivées dans les commentaires/PR, aucun quartier présumé. |
| Geo assets | #487 | **REVIEW** ; fondation Rabat visuelle à vérifier pour droits et duplication. |
| Search produit | #1035 | **SPLIT** : récupérer delta utile sur Search courant, pas merge aveugle d'ancien P3. |
| Search identité visuelle | #1102 | **KEEP**, harmonisation filtres/cartes à certifier sur current main. |
| Search canonical data | #1029, #622 | **REVIEW**, contrats de représentation/règles d'affichage, vérifier chevauchement main. |
| Trust | #936 | **KEEP contrôle sémantique**, vérifier correction actuelle. |
| SEO | #938 | **KEEP intention**, comparer les métadonnées courantes avant de merger. |
| Prix/qualité | #1104 | **KEEP / P0**, PR très volumineuse (lecture API PR 422), audit en morceaux obligatoire. |
| Extraction source | #1134 | **BLOCK LIVE / KEEP OFFLINE DRAFT**, #1135 licence. |
| Mubawab legacy | #997 | **CLOSE effectué** : branche 78 ahead / 637 behind main, 57 fichiers dont workflows live/apply ; droits #1135 ouverts. Réutiliser exclusivement tests offline après audit, jamais merger en bloc. |
| Prix Agenz/Mubawab | #1028 | **SPLIT** : composant Agenz autorisé uniquement après gate source ; Mubawab live bloqué. |
| Parser large | #1105 | **SPLIT / BLOCK LIVE**, 200 fichiers, rebase et audit par source, ne pas merger en bloc. |
| Annonces fraîches | #1113 | **KEEP en DRAFT** : 1 168 conformes annoncées dans la PR, distinctes par URL, non prouvées physiques uniques ni réutilisables. |
| Acquisition contrat | #996, #1016 | **REVIEW** : schéma et dédup ID à isoler de l'ancienne chaîne ; aucun writer auto. |
| Discovery recovery | #1092 → #1093 → #1094 | **KEEP offline/REVIEW** : chaîne de PR base→enfant ; ne pas fermer parent sans portage de l'enfant ; données candidat uniquement. |
| Autres pipeline legacy | #956, #454 | **REVIEW** : contrats d'écriture/Source Registry, blocage de taille pour #454 ; pas de merge aveugle. |
| Legacy data 7 PR | #110 → #115 → #118 → #121 → #124 → #125 → #126 | **REVIEW comme chaîne historique** ; vérifier migrations, licences et sécurité avant clôture groupée. |
| DB migr. | #1082 | **KEEP DRAFT**, preuve DB cible/runtime/rollback requise. |
| HA | #1087, #1101 | **SPLIT** : ne conserver que single-writer fail-closed indépendant du provider ; architecture primaire/standby dépend de la cible réellement opérée. |
| Data clean | #1083, #1081 | **KEEP les invariants**, vérifier si les anciens writers sont encore actifs sur main avant fusion. |
| CI sécu | #1133 | **KEEP / P0** : isoler les 5 workflows privilégiés, contrôle exact-HEAD. |
| CI documentation | #1132 | **KEEP comme closeout** ; ne pas prétendre globalement certifiés les 549+ workflows. |
| CI ancienne | #991 | **CLOSE effectué** : 8 workflows divergents vs main (8 ahead / 670 behind) ; politique CI actuelle #1114/#1115/#1116 prévaut, anciens changements ne doivent pas revenir en bloc. |
| Nettoyage ancien | #1027 | **REVIEW**, suppression uniquement après preuve que les workflows ne sont plus nécessaires. |
| Pros | #644, #645, #653 | **KEEP pour comparaison/CONVERGE**, zones distinctes mais données communes ; une seule PR B2B finale. |
| Auth pro | #310 | **KEEP DRAFT / P0 sécurité**, rebase et validation RLS nécessaires. |

**Règle de clôture par PR** : identifier HEAD/base et chemins, mesurer déjà-présent-sur-main vs delta unique, vérifier dépendants/CI/conditions légales, copier preuve utile dans le canonique, commenter « superseded by », fermer **sans supprimer branche**. Les PR conservées en revue ne sont pas validées pour merge.

## 4. ORDRE DE MISSION EXÉCUTABLE

1. **T0 — Gouvernance** : compte après nettoyage **44 PR ouvertes dont #1137** ; 7 PR historiques fermées sans merge (#1032, #1097, #997, #991, #1057, #1058, #1059). Garder ce document et la session synchronisés.
2. **T1 — Risque source et données** : isoler droits (#1135), stopper toute acquisition/pub non autorisée ; auditer #997/#1028/#1105 par chemin ; distinguer 253372 candidates historiques des offres fresh/unique/servables.
3. **T2 — Data/DB** : réconcilier #1082/#1087/#1101/#1104, déterminer le provider réellement exploité et les writers ; preuve read-only avant tout changement.
4. **T3 — Pages critiques** : Search (/search, /listings/[id]) et Map (/map) ; une branche chacune sur latest main, BEFORE/AFTER, arbitrage flat vs 3D, sécurité et accessibilité.
5. **T4 — Autres routes** : HOME, intentions SEO, B2B, owner, parcours, confiance et juridique ; documents de validation par famille, pas 20 PR qui se chevauchent.
6. **T5 — Closeout** : CI/scopes/AFTER + comparaison visuelle + validation humaine → merge autorisé seulement ensuite → post-merge → rafraîchir ROADMAP/SESSION/Notion, décider séparément déploiement Vercel.

## 5. LIMITES ET NEXT EXACT

- Cet audit repose sur les métadonnées PR et la structure du code connues au 30 octobre ; **pas de captures LIVE ni tests navigateur effectués dans ce lot documentaire**.
- #1104 et #454 : REST info renvoie 422 « too many files changed » ; à analyser par inventaire paginé/diff ciblé, pas à classer automatiquement comme redondants.
- **Next exact** : auditer le delta utile de la branche archivée #997 et les PR actives #1028/#1105 ; établir pour chaque blocage licence un remplacement offline/first-party. Continuer audit #1087/#1101 et convergences Search/Map. Puis passer au faisceau Search + Vivre Ici avec preuves visuelles.
- **Aucune estimation de % d'avancement global** : pas de dénominateur fiable de lots certifiés.


## 6. LOT P0 — AUDIT ACTUALISÉ DU 30/10 (POST-SNAPSHOT INITIAL)

### État réel des PR et preuve de nettoyage

- Snapshot d'origine : 50 PR ouvertes. **10 PR historiques fermées sans merge ni suppression de branche** : #1032, #1097, #997, #991, #1053, #1057, #1058, #1059, **#1081, #1087**.
- Nouvelles PR en revue : #1137 (ces documents), #1138 (isolation Souissi), **#1139 (gel des writers)**, **#1140 (snapshot Mubawab expérimental)**. **44 PR ouvertes lors du dernier contrôle**, soit 50 - 10 + 4 ; revalider avant toute nouvelle conclusion.
- `main` de référence reste `c02d0b73ed18b0e136d478fab39e71df425173a7`. Les branches DRAFT et leurs CI vertes ne changent pas ce HEAD.

### P0 — Contrôle des writers réels : #1081 archivée au profit de #1139

**FAIT vérifié sur le code `main` :** `.github/workflows/commoncrawl-mass-seed-harvest.yml` possède `schedule: 17 2 * * *` et `push: main`, et résout `CC_APPLY=1` pour ces deux déclencheurs. Les autres flags/protections peuvent arrêter une écriture réelle : **on ne revendique aucune écriture observée**. Mais l'activation automatisée du chemin est prouvée et incompatible avec le gel demandé.

- #1081 historique : 5 commits ahead / 183 behind, quatre fichiers modifiés ; le workflow OpenSERP de cette branche réintroduisait `*/10` malgré la suppression du schedule sur `main`. Aucun enfant ouvert, **fermée avec commentaire, non mergée**.
- **#1139** : nouvelle branche exactement issue de `main`, 6 commits ahead / 0 behind, **5 fichiers**. Common Crawl passe à PR tests hors réseau et `workflow_dispatch` main-only read-only, `CC_APPLY=0`, sans `--apply`, sans schedule/push ; OpenSERP passe en dry-run main manuel, sans cron/apply. Les credentials de l'audit P0.1 ne sont plus exposés aux jobs de PR ; l'audit live reste limité à `push main`. Les gardes sont testés hors réseau.
- **PREUVE CI exact-HEAD `440e7a328085833147ad0de2a7960956e9f65d48` : 5/5 SUCCESS** : [Common Crawl 41074056512](https://github.com/hraaaaf/Akarfinder/actions/runs/41074056512), [Policy 41074056514](https://github.com/hraaaaf/Akarfinder/actions/runs/41074056514), [OpenSERP 41074056505](https://github.com/hraaaaf/Akarfinder/actions/runs/41074056505), [P0.1 41074056471](https://github.com/hraaaaf/Akarfinder/actions/runs/41074056471), [Compile 41074056419](https://github.com/hraaaaf/Akarfinder/actions/runs/41074056419). Le premier essai avait échoué sur un read live Supabase (`fetch failed`), isolé/corrigé dans la PR.
- **GATE HUMAIN IMPORTANT** : #1139 reste **DRAFT, NON MERGÉE**. Ainsi, le chemin automatique existe **toujours sur main**. Après décision explicite de merge, vérifier gates et post-merge/AFTER ; aucune écriture DB, aucun déploiement Vercel par cette PR.

### PR #1028 — Extraction prix : conserver parser hors réseau, refuser collecte implicite

- **Topologie** : #1028 = 47 commits ahead, 313 behind main ; 18 chemins dont 17 dans `scripts/price-recovery/` et un workflow.
- **KEEP comme source d'algorithmes/tests, pas comme branche à merger** : `extract-detail-price.ts` et ses tests distinguent prix courant/ancien, MAD/m², mois/nuit/vente et statut non divulgué. Faire un benchmark sur HTML légalement détenu, en comparant au parser actuel avant toute réutilisation.
- **BLOCK / REWORK** : `run-detail-price-recovery.ts`, `run-mubawab-price-recovery-safe.ts` et le workflow `detail-price-recovery-dry-run.yml` effectuent des `fetch()` de pages sources. La mention « read-only, databaseWrites=0 » ne vaut ni droit de collecte ni couverture fiable. `trace-agenz-client-api.ts` nécessite aussi une revue d'autorisation des APIs consultées. Aucun live Mubawab sans #1135.
- **Next exact** : comparer un corpus de fixtures autorisées avec le parser plus récent et extraire uniquement le code déterministe utile dans une branche propre de `main`; aucune fermeture de #1028 avant traçabilité de ce transfert.

### PR #1105 — Parser 200k : conserver preuves offline, séparer exploration des droits

- **Topologie** : branche enfant `data/200k-fresh-parser-v2` issue de `data/neon-price-recovery-audit`, **301 commits ahead**, 200 chemins modifiés (42 workflows, 101 chemins `scripts/data`, 17 `scripts/acquisition`, 36 `docs/data`), non assimilable à une PR unique sûre à merger.
- **KEEP** : outils purement offline de rapprochement de manifestes URL, hashes, provenance, distinctions `URL != property`, tests, feuilles de source. `feenway-n01-reconcile-evidence.mjs` est un exemple de rapprocheur qui ne fait pas de requête HTTP.
- **Historique déclaré par son canonique** `docs/handovers/parserNovembre.md` : FeenWay N01 a rapporté 750/1720 pages de navigation examinées, instantané 63 364 URL découvertes, cumul historique 64 786 URL, et 0 DB write pendant les lots mentionnés. Ces comptes **ne prouvent ni annonces actives ni droit de réutilisation**, et ne sont pas une certification renouvelée par cette réconciliation.
- **BLOCK** : tout crawler / mise à jour live / photographie / diffusion de données de FeenWay et des sources tierces tant que les droits de réutilisation, accès et retention ne sont pas prouvés pour chaque source et média ; FeenWay agrège d'autres fournisseurs, ce qui ne transfère pas les droits des sources initiales.
- **42/42 YAML relus individuellement et classification provisoire publiée** : `docs/handovers/AKARFINDER_PARSER_V2_WORKFLOW_TRIAGE_2026-10-30.md`. Résultat : 27 `BLOCK_LIVE`, 4 `KEEP_OFFLINE_TESTS`, 2 `KEEP_OFFLINE_CANDIDATE`, 8 `REVIEW`, 1 `REVIEW_AND_BLOCK_LIVE`. Tous les 42 contiennent un déclencheur `push`; cela ne démontre pas un accès HTTP ou une mutation dans les scripts. **Aucune exécution live déclenchée pour cet audit.**
- **Next exact** : auditer les scripts dépendants des 42 workflows et leurs sources/conditions, puis isoler les tests purs hors réseau dans une PR basée sur main ; ne pas fusionner #1105 en bloc.

### HA/DR — #1087 fermée ; #1101 conserve le noyau conditionnel

- #1087 : 80 chemins, dont **35 partagés avec #1101**. `lib/db/ha-writer-state.ts` et `lib/db/ha-write-policy.ts` ont chacun le **même blob SHA exact** entre les deux branches (`1652add331a5809362869f9e9f61b6488d6ddd72` ; `c7bd2d6e5bd1e885061eea8e7f02d172f9119f44`). Aucun enfant ouvert. **#1087 fermée sans merger**.
- Les **45 chemins uniques #1087** sont surtout preuves/test/rehearsals/provider-specific + migration SQL ; **archivés et non détruits**. Leur ancien état n'est pas une preuve de HA production.
- **KEEP sous revue** : #1101 et son single-writer/fencing compatible avec la recovery ; pas de merge automatique sur `main` sans audit.
- **Point critique à corriger avant intégration :** `getHaWriterState()` dans `ha-write-policy.ts` renvoie `SUPABASE_PRIMARY` par défaut en absence de `HA_WRITER_STATE`. Cela **n'est pas fail-closed** par défaut pour les écritures Supabase. Exiger une valeur explicite et des tests de configuration manquante, avant toute activation ; valider le véritable provider live et un rollback.

### Nouveau #1140 — snapshot Mubawab expérimental : corriger le « Next »

- #1140 DRAFT (créée en parallèle de ce nettoyage) rapporte une tentative live interrompue par DNS : **0 pages fraîches, 0 annonce fraîche et 0 photo**. Les **129 anciennes références / 530 URLs photo** restent historiques et ne constituent pas de nouvelles annonces.
- Un commentaire de sécurité a été ajouté : ne pas « réessayer dès que DNS fonctionne » sans **autorisation contractuelle #1135** (périmètre des champs, conservation, photos et republication). Offline fixtures et comparaison historique seulement.
- **Aucune preuve de droit de nouvelle collecte live** ne découle de la création de cette PR.

### Priorité suivante

1. Décider explicitement si le correctif P0 #1139 peut être mergé (humain) ; jusqu'à ce gate, ne pas déclarer les writes gelés sur main.
2. Comparer #1028 pure parser aux corrections plus récentes, matrice des 42 workflows #1105, et bloquer toute acquisition sans droits.
3. Corriger/porter le noyau #1101 avec configuration writer **fail-closed**, tests et preuve provider effective.
4. Ensuite seulement, convergence Search + Carte avec captures BEFORE/AFTER et revue humaine.

**Statut** : actions documentaires et fermetures prouvées, CI ciblée #1139 verte ; aucun merge/deploy/write initié par cette réconciliation.
