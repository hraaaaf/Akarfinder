# SEARCH Price Extraction v4 — Audit strict résiduel

**Date :** 2026-08-15  
**Mode :** read-only audit avant toute écriture.

## Snapshot production vérifié

- Représentations publiques LISTING : **15 438**.
- Prix publics présents : **2 694 = 17,45 %**.
- DarAgadir : **1 660** prix publics.

## Réservoir sans prix par source

| Source | Sans prix | Décision v4 |
|---|---:|---|
| daragadir.com | 3 798 | HOLD résiduel : les derniers motifs URL montant+surface échouent correctement les garde-fous ratio/surface ou sont short-stay |
| agenz.ma | 3 233 | HOLD texte : snippets pouvant mélanger la fiche cible et des annonces voisines |
| promoimmomarrakech.com | 2 492 | HOLD : aucun signal suffisamment fiable |
| mubawab.ma | 1 219 | 4 candidats stricts |
| mouldar.com | 1 201 | 3 candidats stricts |
| masaken.ma | 645 | 2 candidats stricts |
| avito.ma | 94 | HOLD : HTTP 403, aucun bypass |
| marrakechrealty.com | 35 | HOLD : pas de règle strictement prouvée dans ce lot |
| 1immo.ma | 27 | HOLD résiduel : exemples restants dominés par prix/m² ou vente sous plancher |

## Cohorte v4 strictement admise

**9 lignes uniquement**, toutes actuellement `LISTING`, publiques, prix NULL, provider/freshness autorisés.

### Masaken — 2

- `9117e527-d5b1-4045-bca9-dedca09e4d21` → **200 000 DH** — titre structuré `Vente ... m² ... DH`, intention vente prouvée par URL/titre.
- `b5956d8d-e1b4-455d-953c-7fc0f9cc033a` → **13 800 000 DH** — même contrat.

Rejets : location courte durée, prix/m², montant sous plancher.

### Mouldar — 3

- `07083a42-b20f-477a-a461-c9184159fe6e` → **4 000 DH/mois**.
- `403914af-09da-4316-81fe-897ac1c09c27` → **5 000 DH/mois**.
- `d0e1ea38-8531-41f1-91d0-c0e0c5fb20ce` → **8 000 DH/mois**.

Admission uniquement sur URL détail à suffixe hexadécimal et formulations fortes `Ce bien est proposé au prix de` / `Le loyer est de`. Prix/m², short-stay et prix sur demande restent rejetés.

### Mubawab — 4

- `0cc33f96-316a-406a-9439-b4e6317ecac1` → **3 500 DH**.
- `71159421-6fcb-4b84-a532-a85771cdb8f3` → **27 000 DH**.
- `738fc88f-18e8-477f-83bf-6aca1af2821d` → **7 000 000 DH**.
- `4f926ed3-2830-46c9-927b-46b39d9e5bc2` → **9 000 000 DH**.

Admission uniquement sur URL détail `/fr|en|ar/a/<id>/`, snippet commençant exactement par le titre de la fiche, montant dans le segment initial, sans cadence courte durée ni prix/m².

## Garde-fous d’exécution

- `PRICE_V4_WRITE=false` par défaut.
- Écriture seulement via `workflow_dispatch` explicite.
- L’extracteur calcule **toute la cohorte avant la première écriture**.
- Plafond fail-closed : **25 matches maximum** ; dépassement = abort avant write.
- Update uniquement `WHERE normalized_price_mad IS NULL`.
- Aucun fetch tiers dans ce lot ; uniquement signaux déjà observés dans l’index.
- Aucun bypass anti-bot/login/captcha/API privée.

## Gain théorique borné

Si les 9 lignes restent éligibles et NULL au moment de l’application : **+9 prix maximum**. Le chiffre production final doit être mesuré après l’application, jamais extrapolé comme acquis.
