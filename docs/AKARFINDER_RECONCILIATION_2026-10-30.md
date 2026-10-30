# AKARFINDER — RÉCONCILIATION PR / PAGES / FONCTIONNALITÉS

**Date de gel d'audit : 2026-10-30.** Repo `hraaaaf/Akarfinder`; référence `main@c02d0b73ed18b0e136d478fab39e71df425173a7` (merge #1129).  
**Portée : décisions de gouvernance et feuille de revue, non pas certification actuelle de l'UI ou de la production.** Constat GitHub : 50 PR ouvertes avant nettoyage ; #1032 et #1097 fermées avec commentaire motivé ; 48 restantes au moment du premier tri. Un commit ultérieur exige de rafraîchir ce décompte.

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
| Geo/stades | #1053, #1057, #1058, #1059 | **REVIEW → archive probable** après transfert des preuves sourcées pertinentes au canonique geo, jamais merge des polygones implicites. |
| Geo assets | #487 | **REVIEW** ; fondation Rabat visuelle à vérifier pour droits et duplication. |
| Search produit | #1035 | **SPLIT** : récupérer delta utile sur Search courant, pas merge aveugle d'ancien P3. |
| Search identité visuelle | #1102 | **KEEP**, harmonisation filtres/cartes à certifier sur current main. |
| Search canonical data | #1029, #622 | **REVIEW**, contrats de représentation/règles d'affichage, vérifier chevauchement main. |
| Trust | #936 | **KEEP contrôle sémantique**, vérifier correction actuelle. |
| SEO | #938 | **KEEP intention**, comparer les métadonnées courantes avant de merger. |
| Prix/qualité | #1104 | **KEEP / P0**, PR très volumineuse (lecture API PR 422), audit en morceaux obligatoire. |
| Extraction source | #1134 | **BLOCK LIVE / KEEP OFFLINE DRAFT**, #1135 licence. |
| Mubawab legacy | #997 | **SPLIT puis fermeture recommandée**, ne pas merger 57 fichiers de collecte/écriture live. |
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
| CI ancienne | #991 | **SPLIT/REVIEW**, risque de duplication avec politique merged #1114 et suites #1115/#1116. |
| Nettoyage ancien | #1027 | **REVIEW**, suppression uniquement après preuve que les workflows ne sont plus nécessaires. |
| Pros | #644, #645, #653 | **KEEP pour comparaison/CONVERGE**, zones distinctes mais données communes ; une seule PR B2B finale. |
| Auth pro | #310 | **KEEP DRAFT / P0 sécurité**, rebase et validation RLS nécessaires. |

**Règle de clôture par PR** : identifier HEAD/base et chemins, mesurer déjà-présent-sur-main vs delta unique, vérifier dépendants/CI/conditions légales, copier preuve utile dans le canonique, commenter « superseded by », fermer **sans supprimer branche**. Les PR conservées en revue ne sont pas validées pour merge.

## 4. ORDRE DE MISSION EXÉCUTABLE

1. **T0 — Gouvernance** : rafraîchir le total des PR ; fermer les véhicules non-mergeables prouvés (#1032, #1097 déjà clos) ; garder ce document et la session synchronisés.
2. **T1 — Risque source et données** : isoler droits (#1135), stopper toute acquisition/pub non autorisée ; auditer #997/#1028/#1105 par chemin ; distinguer 253372 candidates historiques des offres fresh/unique/servables.
3. **T2 — Data/DB** : réconcilier #1082/#1087/#1101/#1104, déterminer le provider réellement exploité et les writers ; preuve read-only avant tout changement.
4. **T3 — Pages critiques** : Search (/search, /listings/[id]) et Map (/map) ; une branche chacune sur latest main, BEFORE/AFTER, arbitrage flat vs 3D, sécurité et accessibilité.
5. **T4 — Autres routes** : HOME, intentions SEO, B2B, owner, parcours, confiance et juridique ; documents de validation par famille, pas 20 PR qui se chevauchent.
6. **T5 — Closeout** : CI/scopes/AFTER + comparaison visuelle + validation humaine → merge autorisé seulement ensuite → post-merge → rafraîchir ROADMAP/SESSION/Notion, décider séparément déploiement Vercel.

## 5. LIMITES ET NEXT EXACT

- Cet audit repose sur les métadonnées PR et la structure du code connues au 30 octobre ; **pas de captures LIVE ni tests navigateur effectués dans ce lot documentaire**.
- #1104 et #454 : REST info renvoie 422 « too many files changed » ; à analyser par inventaire paginé/diff ciblé, pas à classer automatiquement comme redondants.
- **Next exact** : auditer la divergence source/cible et le delta unique de #997/#1028/#1105 ; établir pour chaque blocage licence un remplacement offline/first-party. Puis passer au faisceau Search + Vivre Ici avec preuves visuelles.
- **Aucune estimation de % d'avancement global** : pas de dénominateur fiable de lots certifiés.
