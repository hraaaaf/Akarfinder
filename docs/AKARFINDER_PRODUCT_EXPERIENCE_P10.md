# AkarFinder — Product Experience P10 Pages secondaires

Statut : **IMPLEMENTED — AWAITING CERTIFICATION**

## Goal

Réconcilier les pages secondaires publiques autour d’un shell AkarFinder commun, sans transformer des pages d’aide ou légales en mini landing pages concurrentes.

Périmètre :
- `/a-propos`
- `/comment-ca-marche`
- `/faq`
- `/contact`
- `/demande-retrait`
- `/conditions-utilisation`
- `/politique-confidentialite`

## Success

- 7/7 routes utilisent `SecondaryPageShell` ;
- header exact-white et logo canonique ;
- footer et bottom-nav mobile communs ;
- contenu légal de la politique de confidentialité conservé ;
- 28/28 captures AFTER sur 390×844 / 430×932 / 768×900 / 1280×900 ;
- `findingCount = 0` ;
- aucun overflow horizontal ;
- aucun changement backend, DB, ranking, sources ou permissions ;
- aucun Vercel ;
- human visual gate avant merge.

## BEFORE exact-main

- Base : `main@10420b4c0e0622122aa86608e7f257080e6b3c44`
- Branche preuve : `agent/product-experience-p10-secondary-before`
- PR preuve : `#846` — CLOSED, merged=false
- HEAD preuve : `d5ef8bb8194bc805f589691c69fc65058aeed5c5`
- Run : `32534424065` — SUCCESS
- Artifact : `9464989657`
- Digest : `sha256:44545a5277656e0122ac1d9c4816c984eaa431aa602351c69b8ad74d5024c9a0`
- 28/28 captures ; HTTP 200 ; 1 H1 ; 1 main ; logo canonique ; exact-white header ; 0 overflow.

Observation vérifiée : 6/7 routes utilisent déjà `SecondaryPageShell`. `/politique-confidentialite` est l’unique outlier structurel sur les 4 viewports.

## Référence visuelle

Référence commune : `SecondaryPageShell` actuel, `/faq` comme surface témoin, complété par le wireframe P10 validé dans le chantier.

Principes :
- fond clair AkarFinder ;
- header exact-white ;
- eyebrow bleu ;
- titre navy ;
- introduction courte ;
- une surface premium principale ;
- footer sombre ;
- bottom-nav mobile canonique ;
- pas de dashboard, KPI ou décor artificiel sur les pages légales.

## Implémentation

- migration de `/politique-confidentialite` vers `SecondaryPageShell` ;
- contenu légal conservé ;
- `maxWidth="3xl"` pour la lecture longue ;
- ajout d’un hook générique `data-secondary-page-shell="akarfinder-v1"` tout en conservant le hook historique ;
- audit dédié 7 routes × 4 viewports ;
- test de convergence + conservation du contenu légal ;
- aucun autre redesign des 6 pages déjà conformes.

## Certification attendue

- contrat P10 vert ;
- audit syntax vert ;
- TypeScript vert ;
- build production vert ;
- 28/28 AFTER ;
- `findingCount = 0` ;
- inspection BEFORE → référence → AFTER ;
- score visuel ;
- human gate ;
- squash merge seulement après preuve suffisante.
