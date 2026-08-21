# AkarFinder — Product Experience P11 Global QA

Statut : **PREPARED — AWAITING CERTIFICATION**

## Goal

Certifier transversalement le chantier Product Experience après fermeture de P3→P10, sans redesign supplémentaire sauf défaut réellement prouvé.

## Base exacte

- `main@16336328a6bbe2054e95ee9457294eea17280be1`
- P0→P10 : 11/12 lots CLOSED = 91,7 %.

## Success

- contrats Product Experience existants P3→P10 verts ;
- contrat accessibilité structurelle vert ;
- TypeScript vert ;
- build production vert ;
- inventaire App Router exhaustif ;
- all-pages certification : toutes les pages rendables × 390×844 / 430×932 / 768×900 / 1280×900, `findingCount = 0` ;
- certification représentative Product Experience : 16 surfaces P3→P10 × 4 viewports = 64 captures, `findingCount = 0` ;
- HTTP, H1, main, overflow horizontal, logo canonique, erreurs réseau/console inattendues et comportement bottom-nav vérifiés ;
- blocages de fixtures conservés explicitement fail-closed ;
- inspection visuelle finale multi-lots ;
- score visuel final ;
- human visual gate final avant merge/closeout ;
- aucun Vercel.

## Inventaire de référence vérifié

Dernière certification all-pages verte avant P11 : run `32534826644`, artifact `9465173733`, digest `sha256:7126681f22c2e05da6bbdbde19524a0865f525e064eea3bc3186e8c464eb48f6`.

Inventaire observé :
- 79 pages App Router ;
- 67 pages rendables ;
- 12 pages bloquées explicitement par fixture ;
- 268/268 captures ;
- 0 finding.

Les blockers ne sont pas masqués : `/listings/[id]` et `/professionnels/[slug]` nécessitent des fixtures DB déterministes ; dix routes visual-QA quartier exigent des assets certifiés non matérialisés dans cette lane.

## Surfaces Product Experience représentatives

- P3 Accueil : `/`
- P4 Search + Carte : `/search`, `/map?city=rabat&layer=explore`
- P5 Listing : `/visual-qa/announcement-page-pro-conversion` (fixture Listing certifiée ; la route dynamique réelle reste data-fixture-required)
- P6 Ville / Quartier : `/immobilier/rabat`, `/immobilier/rabat/agdal`
- P7 Mon Projet : `/mon-projet`
- P8 Publication : `/vendre/dossier`
- P9 Professionnels : `/pro`
- P10 Pages secondaires : `/a-propos`, `/comment-ca-marche`, `/faq`, `/contact`, `/demande-retrait`, `/conditions-utilisation`, `/politique-confidentialite`

Total : 16 surfaces × 4 viewports = 64 captures.

## Performance

Le repo ne possède actuellement **aucun budget Lighthouse ou bundle-size canonique** retrouvé. P11 ne fabrique donc pas un seuil arbitraire. La preuve performance disponible dans ce lot est limitée au build production réussi et à l’absence d’erreurs runtime réseau/console inattendues sur la matrice certifiée. Toute future certification chiffrée nécessitera d’abord un budget canonique explicite.

## Stratégie

Réutiliser les audits exhaustifs existants `ui-all-pages-inventory`, `ui-all-pages-baseline` et `ui-all-pages-certify`, puis ajouter uniquement une couche P11 représentant les surfaces Product Experience et les contrats cross-lot.

Aucun code UI/DB/API/ranking/source n’est modifié par la préparation P11.
