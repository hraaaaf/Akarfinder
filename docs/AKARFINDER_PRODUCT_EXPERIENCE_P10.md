# AkarFinder — Product Experience P10 Pages secondaires

Statut : **CERTIFIED — MERGED**

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

## Success validé

- 7/7 routes utilisent `SecondaryPageShell` ;
- header exact-white et logo canonique ;
- footer et bottom-nav mobile communs ;
- contenu légal de la politique de confidentialité conservé ;
- 28/28 captures AFTER sur 390×844 / 430×932 / 768×900 / 1280×900 ;
- `findingCount = 0` ;
- aucun overflow horizontal ;
- aucun changement backend, DB, ranking, sources ou permissions ;
- aucun Vercel.

## BEFORE exact-main

- Base : `main@10420b4c0e0622122aa86608e7f257080e6b3c44`
- Branche preuve : `agent/product-experience-p10-secondary-before`
- PR preuve : `#846` — CLOSED, merged=false
- HEAD preuve : `d5ef8bb8194bc805f589691c69fc65058aeed5c5`
- Run : `32534424065` — SUCCESS
- Artifact : `9464989657`
- Digest : `sha256:44545a5277656e0122ac1d9c4816c984eaa431aa602351c69b8ad74d5024c9a0`
- 28/28 captures ; HTTP 200 ; 1 H1 ; 1 main ; logo canonique ; exact-white header ; 0 overflow.

Observation vérifiée : 6/7 routes utilisaient déjà `SecondaryPageShell`. `/politique-confidentialite` était l’unique outlier structurel sur les 4 viewports.

## Référence visuelle

Référence commune : `SecondaryPageShell`, `/faq` comme surface témoin, complétée par la référence P10 du chantier.

Principes : fond clair AkarFinder, header exact-white, eyebrow bleu, titre navy, introduction courte, une surface premium principale, footer sombre, bottom-nav mobile canonique et aucun décor artificiel sur les pages légales.

## Implémentation

- migration de `/politique-confidentialite` vers `SecondaryPageShell` ;
- contenu légal conservé ;
- `maxWidth="3xl"` pour la lecture longue ;
- hook générique `data-secondary-page-shell="akarfinder-v1"` tout en conservant le hook historique ;
- audit dédié 7 routes × 4 viewports ;
- test de convergence + conservation du contenu légal ;
- aucun redesign gratuit des 6 pages déjà conformes.

## AFTER certifié

- Head certifié : `6024c47e3c81bafb45bc8d8161c448d45810ef00`
- Run dédié : `32534826797` — SUCCESS
- Artifact : `9465109006`
- Digest : `sha256:66de7a5ffe25e302eff86d359c1bde4ef705825125829870a93dbf2b3b5721ea`
- 28/28 captures AFTER
- `findingCount = 0`
- 7/7 shell commun
- headers exact-white 28/28
- logo canonique, footer et bottom-nav détectés
- aucun overflow horizontal
- compile / accessibility / Secondary Certification / P0 / P1 / P2 : SUCCESS

## Validation visuelle

- inspection BEFORE → référence → AFTER : validée
- score visuel : **9,4/10**
- human visual gate : **APPROVED — 2026-08-22**
- réserve mineure : les pages légales restent naturellement plus denses que FAQ/Contact ; aucune régression de lisibilité observée.

## Merge

- PR : `#847`
- méthode : squash
- merge commit : `81cf54b5f86b839de8336acfa399321e378c602f`
- `main` vérifié sur ce commit après merge.

## Invariants

- aucun backend, DB, permissions, ranking, sources ou API modifié ;
- contenu légal conservé ;
- aucun déploiement Vercel.
