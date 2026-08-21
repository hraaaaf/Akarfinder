# AkarFinder — Product Experience P9 Professionnels

Statut : **IMPLEMENTED — AWAITING CERTIFICATION**

## Goal

Réconcilier `/pro` avec la cible canonique P1-B1 :

`AkarFinder Pro → proposition de valeur → aperçu dashboard → 3 piliers → parcours métier → standards data/trust → activation`

Le hub doit ressembler à un produit professionnel premium sans présenter de KPI, partenaire, badge ou résultat comme réel tant que les données correspondantes n’existent pas.

## Success

- hero canonique : `Vos annonces, votre identité, notre intelligence territoriale.` ;
- aperçu dashboard visible mais explicitement non chiffré tant qu’aucun compte actif ne fournit de métriques ;
- trois piliers : Identité pro / Publication structurée / Intelligence marché ;
- parcours Agences et Promoteurs conservés ;
- activation `#contact` conservée ;
- contrat data-for-value conservé : déclaré / calculé / déduit / non renseigné ;
- règles trust et sponsoring conservées ;
- aucune modification DB, permissions, ranking, source ou API d’activation ;
- responsive 390 / 430 / 768 / 1280 sans overflow ;
- 4/4 captures AFTER ;
- `findingCount = 0` ;
- human visual gate avant merge ;
- aucun Vercel.

## BEFORE exact-main

- Base produit : `main@037a69da46ca48ed0eb4e8598ad9765dc4ff6a5b`
- Branche preuve : `agent/product-experience-p9-professionnels-before`
- PR preuve : `#844` — CLOSED, merged=false
- HEAD preuve : `25121bae72e655c50dc5eff56df0d9d5105778c7`
- Run : `32520736637`
- Artifact : `9460500727`
- Digest : `sha256:c73eb4e7971c226f46753fc92b88de092815a6b2eb2072b11348080f48476362`
- 4/4 captures : 390×844 / 430×932 / 768×900 / 1280×900
- HTTP 200 sur les 4 viewports
- 1 H1, 1 main, logo canonique, aucun overflow horizontal

Le run BEFORE est rouge uniquement parce que son audit exigeait à tort un header exact-white. Le baseline observé est `rgba(7, 27, 51, 0.97)` sur les quatre viewports. Ce point est documenté comme état BEFORE et n’invalide pas les captures.

## Référence visuelle

Cible P1-B1 : artifact canonique `9420359227`, target `professionnels`.

Principes retenus :
- surface navy profonde ;
- header intégré à la hero ;
- hero en deux colonnes desktop ;
- dashboard partenaire comme preuve visuelle ;
- trois piliers compacts immédiatement après la hero ;
- bleu / navy / blanc ;
- pas de KPI fictif présenté comme réel.

La maquette canonique utilise `42 annonces / 18 leads / 91% complétude`. Ces chiffres ne sont pas repris dans `/pro` produit : l’aperçu reste non chiffré tant qu’aucune donnée réelle ne l’alimente.

## Implémentation

- `SiteHeader variant="transparent"` sur la hero sombre ;
- proposition de valeur canonique ;
- aperçu dashboard non chiffré ;
- trois piliers canoniques ;
- routes `/pro/agences` et `/promoteurs` préservées ;
- contrat data-for-value et règles de confiance conservés ;
- `ProActivationForm` conservé fonctionnellement, harmonisé bleu/navy ;
- aucun changement de `app/api/leads`, DB, migrations, permissions ou business logic.

## Certification attendue

- P9 contracts + contrat B2B historique verts ;
- audit syntax vert ;
- TypeScript vert ;
- build production vert ;
- 4/4 AFTER ;
- `findingCount = 0` ;
- inspection BEFORE → P1-B1 → AFTER ;
- score visuel ;
- human gate ;
- squash merge seulement après preuve suffisante.
