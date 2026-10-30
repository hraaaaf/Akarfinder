# AkarFinder — Onboarding décisionnel / matrice PR → page & feature

**Date de l'audit structurel : 2026-10-30** · **Repo :** `hraaaaf/Akarfinder` · **Référence code main observée :** `c02d0b73ed18b0e136d478fab39e71df425173a7`. Ce fichier reste sur la branche **DRAFT #1137**, sans décision de merge.

## Goal, succès et preuve

**Goal :** après audit technique, discuter ensemble les pages et parcours, en rassemblant toutes les PR utiles, sans double-merger ni reprendre des décisions dépassées. L'assistant fait un choix par défaut et expose les contre-arguments.

**Succès :** toutes les 43 PR ouvertes à ce snapshot ont une famille principale (43/43, aucune omise ni doublon), les cross-features et dépendances critiques sont signalées ; le lancement de l'onboarding est distinct de sa préparation.

**Preuve structurelle obtenue :** GitHub `search_prs`, métadonnées `get_pr_info` et fichiers changés `list_pr_changed_filenames` des 43 PR, ainsi qu'une comparaison de contenu de `QuickFilters.tsx`, `MapLibreNeighborhood3D.tsx`, de pages B2B et des descriptions produits. **Ce n'est pas une certification fonctionnelle, visuelle, sécurité live ou droits source.** Les PR peuvent bouger en parallèle : revalider HEAD et fichiers avant arbitrage.

**État :** AUDIT DE STRUCTURE 43/43 ; **audit technique/probatoire encore OUVERT**. Aucun merge, aucun déploiement Vercel, aucune mutation DB. Les propositions de produit restent à décider avec le commanditaire.

## Inventaire principal des 43 PR : 7 familles (chaque PR exactement une fois)

| Groupe | Nombre | PR (source GitHub) | Pages/feature |
|---|---:|---|---|
| G0 — Sécurité, CI, provider et dette technique | 7 | #1139, #1138, #1133, #1132, #1101, #1082, #1027 | transversal : `/api`, ingestion, `lib/db`, workflows |
| G1 — Données, source, annonces et vérité | 21 | #1140, #1134, #1113, #1105, #1104, #1094, #1093, #1092, #1083, #1016, #996, #956, #454, #126, #125, #124, #121, #118, #115, #110, #1029 | moteur annonces ; influence `/search`, `/listings/[id]`, `/map`, comptes et SEO |
| G2 — Search et résultats | 4 | #1102, #1035, #622, #936 | `/search`, liste/carte/split, filtres, cartes annonces |
| G3 — Vivre Ici, ville, quartier et géographie | 5 | #1090, #1108, #1112, #1111, #487 | `/map`, navigation Maroc → ville → quartier, POI, relief bâtiments, limites, rail quartier |
| G4 — Accueil, landing et SEO de navigation | 1 | #938 | `/`, `/acheter`, `/louer`, `/neuf`, `/immobilier`, `/quartiers` et layout `/map`, `/pro`, `/promoteurs`, `/vendre` |
| G5 — Professionnels, agences, promoteurs, vendeur | 4 | #653, #645, #644, #310 | `/pro`, `/pro/agences`, `/professionnels/[slug]`, `/promoteurs`, `/promoteurs/[slug]`, `/vendre`, `/onboarding` |
| G6 — Gouvernance, canonique et onboarding | 1 | #1137 | docs, roadmap, décisions et matrice par page |

**Lien PR :** `https://github.com/hraaaaf/Akarfinder/pull/<num>` ; l'affectation principale n'empêche pas des **dépendances transversales** répertoriées ci-dessous.

## Fiches d'arbitrage à préparer (propositions, NON VALIDÉES)

### G0 — Sécurité, CI, provider et dette technique

**Routes/feature :** transversal : `/api`, ingestion, `lib/db`, workflows.

**PR principales :** [#1139](https://github.com/hraaaaf/Akarfinder/pull/1139), [#1138](https://github.com/hraaaaf/Akarfinder/pull/1138), [#1133](https://github.com/hraaaaf/Akarfinder/pull/1133), [#1132](https://github.com/hraaaaf/Akarfinder/pull/1132), [#1101](https://github.com/hraaaaf/Akarfinder/pull/1101), [#1082](https://github.com/hraaaaf/Akarfinder/pull/1082), [#1027](https://github.com/hraaaaf/Akarfinder/pull/1027).

**Mon avis provisoire / risques :** Garder les protections utiles, éviter de confondre CI verte et sécurité active en production. #1139 a 5 CI vertes mais est DRAFT : son gel n'est pas actif sur main. #1101 dépend d'une recovery branch, HA_WRITER_STATE par défaut = SUPABASE_PRIMARY, à rendre fail-closed ; #1082 migrations Neon 52 fichiers à isoler de l'onboarding UI. #1138 isoler Souissi, #1133/#1132 politiques CI. #1027 nettoyage isolé après preuve.

**Gate et preuve à obtenir :** Configuration provider live attestée, DB read-only, secrets hors PR, tests et human merge gate.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G1 — Données, source, annonces et vérité

**Routes/feature :** moteur annonces ; influence `/search`, `/listings/[id]`, `/map`, comptes et SEO.

**PR principales :** [#1140](https://github.com/hraaaaf/Akarfinder/pull/1140), [#1134](https://github.com/hraaaaf/Akarfinder/pull/1134), [#1113](https://github.com/hraaaaf/Akarfinder/pull/1113), [#1105](https://github.com/hraaaaf/Akarfinder/pull/1105), [#1104](https://github.com/hraaaaf/Akarfinder/pull/1104), [#1094](https://github.com/hraaaaf/Akarfinder/pull/1094), [#1093](https://github.com/hraaaaf/Akarfinder/pull/1093), [#1092](https://github.com/hraaaaf/Akarfinder/pull/1092), [#1083](https://github.com/hraaaaf/Akarfinder/pull/1083), [#1016](https://github.com/hraaaaf/Akarfinder/pull/1016), [#996](https://github.com/hraaaaf/Akarfinder/pull/996), [#956](https://github.com/hraaaaf/Akarfinder/pull/956), [#454](https://github.com/hraaaaf/Akarfinder/pull/454), [#126](https://github.com/hraaaaf/Akarfinder/pull/126), [#125](https://github.com/hraaaaf/Akarfinder/pull/125), [#124](https://github.com/hraaaaf/Akarfinder/pull/124), [#121](https://github.com/hraaaaf/Akarfinder/pull/121), [#118](https://github.com/hraaaaf/Akarfinder/pull/118), [#115](https://github.com/hraaaaf/Akarfinder/pull/115), [#110](https://github.com/hraaaaf/Akarfinder/pull/110), [#1029](https://github.com/hraaaaf/Akarfinder/pull/1029).

**Mon avis provisoire / risques :** Garder le modèle de provenance/indice/prix/fraîcheur, les parsers et rapprocheurs offline prouvés. Ne pas fusionner 206 fichiers Parser V2 ni 181 fichiers vieux adaptateurs d'un bloc. #1113 revendique 1 168 annonces conformes sur 30 jours (preuve propre à sa PR, pas certification live) ; #1104 vise zéro mésinterprétation, 35 fichiers, métriques anciennes à recalculer ; #1092→#1093→#1094 branchement en chaîne : aucun compte candidate ne certifie un stock actif. #454 source policy = gate, #622 cross Search. #126→#125→#124→#121→#118→#115→#110 historiques en pile ; vérifier ce qui existe déjà dans main. #1105 a dérivé de 42 à 43 workflows, dont un probe navigateur FeenWay automatiquement déclenché sur push. Le droit d'accès/réutilisation de chaque portail reste indépendant des tests ou robots.

**Gate et preuve à obtenir :** Source rights écrits, registre, permission images, retrait, old vs fresh, unique physical properties, provider, zéro writer illégitime.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G2 — Search et résultats

**Routes/feature :** `/search`, liste/carte/split, filtres, cartes annonces.

**PR principales :** [#1102](https://github.com/hraaaaf/Akarfinder/pull/1102), [#1035](https://github.com/hraaaaf/Akarfinder/pull/1035), [#622](https://github.com/hraaaaf/Akarfinder/pull/622), [#936](https://github.com/hraaaaf/Akarfinder/pull/936).

**Mon avis provisoire / risques :** #1035 apporte les interactions et la densité Search P3 ; #1102 harmonise le rendu visuel des types. **Conflit de fichier exact** : QuickFilters.tsx modifié par les deux. Ne merger ni l'un ni l'autre sans composition ciblée depuis main, capturer BEFORE/AFTER 390/430/768/1280 et tester focus, clavier, reset, état des filtres et 0 résultat. #622 protège l'index public : fail-closed sur source policy ; #936 protège la vérité quartier, à porter avant publication. L'expérience Search prévaut sur le nombre de PR.

**Gate et preuve à obtenir :** Tests présence/absence vraie annonce, filtres, photos éligibles, régression mobile, visuel ≥ target décidé humainement.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G3 — Vivre Ici, ville, quartier et géographie

**Routes/feature :** `/map`, navigation Maroc → ville → quartier, POI, relief bâtiments, limites, rail quartier.

**PR principales :** [#1090](https://github.com/hraaaaf/Akarfinder/pull/1090), [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108), [#1112](https://github.com/hraaaaf/Akarfinder/pull/1112), [#1111](https://github.com/hraaaaf/Akarfinder/pull/1111), [#487](https://github.com/hraaaaf/Akarfinder/pull/487).

**Mon avis provisoire / risques :** #1090 = parent produit, #1108 = enfant Flat Living Map ; ils modifient **10 mêmes fichiers** sur des branches empilées. #1112 est enfant de #1108 (deux fichiers) ; #1111 audit centres sourcés, pas preuve de polygones ; #487 migration Rabat ancienne à confronter à main. Recommandation provisoire : garder carte **flat premium**, bâtiments discrets, limites quartiers fortement lisibles, POI sourcés et rail cohérent ; rejeter de faux polygones ou l'effet 3D décoratif gras. Le souhait utilisateur de qualité de Maârif reste non certifié par une AFTER actuelle.

**Gate et preuve à obtenir :** BEFORE/TARGET/AFTER Maârif + villes tests, 390/430/768/1280, score indépendant, géo sourcée, human gate.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G4 — Accueil, landing et SEO de navigation

**Routes/feature :** `/`, `/acheter`, `/louer`, `/neuf`, `/immobilier`, `/quartiers` et layout `/map`, `/pro`, `/promoteurs`, `/vendre`.

**PR principales :** [#938](https://github.com/hraaaaf/Akarfinder/pull/938).

**Mon avis provisoire / risques :** #938 porte des canonical metadata par route ; son `app/layout.tsx` recoupe #1090, donc arbitrer la gestion des layouts de manière transversale. Ne pas déduire la qualité visuelle de cette PR SEO. Le design de Home est sur main : aucun PR UI d'accueil autonome dans le stock ouvert. Éviter d'inventer une refonte sans audit navigateur.

**Gate et preuve à obtenir :** Indexation, noindex des démos, génération metadata/OG, canonicals uniques, pas de redirection cassée.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G5 — Professionnels, agences, promoteurs, vendeur

**Routes/feature :** `/pro`, `/pro/agences`, `/professionnels/[slug]`, `/promoteurs`, `/promoteurs/[slug]`, `/vendre`, `/onboarding`.

**PR principales :** [#653](https://github.com/hraaaaf/Akarfinder/pull/653), [#645](https://github.com/hraaaaf/Akarfinder/pull/645), [#644](https://github.com/hraaaaf/Akarfinder/pull/644), [#310](https://github.com/hraaaaf/Akarfinder/pull/310).

**Mon avis provisoire / risques :** #644 corrige profil public professionnel, #645 les pages d'acquisition partenaires, **0 fichier produit partagé** entre #644/#645 ; #653 modifie le chemin `/promoteurs/[slug]` pour rediriger les fiches réelles vers `/professionnels/[slug]` ; unique test partagé avec #645. Recommandation : **une seule fiche publique source de vérité** et conserver landing agence/promoteur séparées. #310 RLS/auth à vérifier et reprendre après provider. Parcours vendeur présent dans main mais **aucune PR UI dédiée** ; les routes API d'owner sont aussi impactées par #1101.

**Gate et preuve à obtenir :** Profils validés/publics, noindex démos, aucun faux compteur, téléphone API vérifié, RLS multi-tenant, tests CTA.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**

### G6 — Gouvernance, canonique et onboarding

**Routes/feature :** docs, roadmap, décisions et matrice par page.

**PR principales :** [#1137](https://github.com/hraaaaf/Akarfinder/pull/1137).

**Mon avis provisoire / risques :** #1137 DRAFT rassemble l'audit et les décisions, section 7 fixe l'onboarding collaboratif. Mettre à jour uniquement ce qui est prouvé ; conserver historique SUPERSEDED. L'arbitrage est **par page/feature**, pas 43 votes PR.

**Gate et preuve à obtenir :** Traçabilité, cohérence repo/HEAD/CI, validation humaine de chaque décision majeure.

**Décision utilisateur : EN ATTENTE ; code à merger : AUCUN.**
## Dépendances croisées : ne pas confondre familles et merges

- **G0 → G1 → G2/G3/G5** : politiques sources, writer single-owner, provider réel et droits médias conditionnent tous les résultats publics ; CI verte sur DRAFT ne vaut pas production.
- **G2 × G3 × G4** : SEO #938 touche `app/layout.tsx` aussi modifié par #1090 ; #936 touche `lib/neighborhood-context/read-model.ts` également modifié par #1090. Décider les gardes truth/SEO indépendamment de la direction visuelle.
- **G1 × G2** : #1029 (unification source) et #622 (Search fail-closed) sont couplées par le contrat d'annonce ; #1104 (vérité sémantique prix / type) influence Search et fiches annonces.
- **G0 × G5** : #1101 ajoute le fencing writer sur `app/api/alerts`, leads et drafts vendeurs, et sur la couche professionnelle. #310 RLS/auth implique des preuves tenant/provider avant activation.
- **G3** : dépendance Git #1090 → #1108 → #1112. Ne pas choisir une capture ou un score de #1112 comme preuve d'intégration de ses ancêtres dans main.
- **G5** : #653 supprime la double vérité promoteur ; conserver l'identité publique canonique et les garde-fous visibility/status avant la démo.

## Étapes d'onboarding utilisateur, à lancer seulement après audit probatoire

1. **Socle P0 sans débat esthétique** : l'assistant préconise garde-fous et séparation source, arbitre les vrais risques techniques ; merge seulement avec gate humain. L'utilisateur ne doit pas recevoir 21 questions sur les pipelines.
2. **Écran Search** : présenter BEFORE + cible, un choix recommandé intégrant #1035 et #1102, et 2–3 corrections principales.
3. **Fiche annonce** : traiter vérité et photos même si aucune PR strictement dédiée ; coupler G1/G2 sans confondre données et style.
4. **Vivre Ici** : montrer côte à côte l'approche #1090 et le pivot flat #1108 à viewports identiques ; décider limites de quartier, POI, rail et bâtiments.
5. **Accueil + SEO** : coupler navigation et promesse produit (G4), pas un vote sur #938 seul.
6. **Pro / vendre / onboarding** : arbitrer les accès, B2B, source de vérité et parcours de conversion (G5).
7. **Acheteur, fidélisation, éditorial et confiance** : auditer les pages déjà sur main sans PR UI ouverte directement liée ; ne pas inventer une PR absente.
8. **Closeout transverse** : roadmap, HEAD, PR, CI, AFTER, score visuel, décision humaine et synchronisation Notion ; aucune autorisation implicite de déploiement.

Chaque écran fournit : `Goal | route | PR rattachées (prioritaires + transverses) | BEFORE | TARGET | KEEP / MODIFY / DROP | ma recommandation + objections | décision humaine | preuve tests/CI/AFTER | Next exact`.

## Limites explicites et Next exact

- **#1105 est vivant** : l'inventaire historique 42/42 workflows correspond à un ancien HEAD. L'état consulté ici porte **43 workflows et 206 fichiers**, avec ajout d'un `feenway-n02-hydration-probe.yml` qui utilise Playwright et se déclenche sur **push** de la branche. Ce point nouveau doit être audité comme *réseau réel*, sans requalifier les 42 anciens comme autorisés.
- **#1104** rapporte des métriques d'une base Neon historique, non certifiées au 30/10.
- **#1113** rapporte 1 168 annonces conformes sur 30 jours selon son propre corpus, à confronter aux critères Source Policy avant toute affirmation live.
- **#1140** a signalé zéro nouvelle page Mubawab après échec DNS ; le gate contractuel #1135 demeure.
- **Aucune capture BEFORE/AFTER nouvelle** produite par cette matrice ; score visuel actuel non certifié.

**Next exact** : auditer la chaîne FeenWay N02 récemment ajoutée, les scripts live de #1105 et le corpus #1113, puis les blocks RLS/provider de #1101/#1082, avant de déclarer l'audit complet. Préparer fiche écran Search **provisoire**, puis l'onboarding avec arbitrage utilisateur, sans anticiper de merge.
