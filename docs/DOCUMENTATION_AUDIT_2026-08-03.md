# Audit de la documentation Markdown — 2026-08-03

## 1. Périmètre

Inventaire produit depuis l’archive source GitHub Actions du dépôt AkarFinder, puis comparaison avec `main` jusqu’au commit `fa983a3`.

Le disque local du propriétaire n’est pas directement accessible. Cet audit couvre la copie synchronisée dans GitHub. Toute modification uniquement présente sur le PC doit être commitée, poussée ou envoyée séparément pour être comparée.

## 2. Inventaire

| Zone | Fichiers Markdown |
|---|---:|
| Total | 181 |
| Racine | 1 |
| `docs/` | 164 |
| `data/audits/` | 16 |
| `docs/` directement | 125 |
| `docs/data/` | 23 |
| `docs/odm/` | 3 |
| `docs/ux-ui-agents/` | 7 |

Fichiers les plus volumineux :

- `docs/SESSION.md` — environ 590 Ko ;
- `docs/DECISIONS.md` — environ 171 Ko ;
- `docs/THEME_AUDIT_INVENTORY.md` — environ 36 Ko ;
- `docs/UX_UI_MASTER_PROGRAM.md` — environ 27 Ko.

## 3. Constats principaux

### Critique

- `docs/START.md` déclarait encore que l’application n’était pas construite.
- `docs/ROADMAP.md` s’arrêtait au 28 juillet et présentait des LOTS depuis dépassés comme prochaines priorités.
- `docs/ARCHITECTURE.md` décrivait une architecture recommandée de MVP, pas l’architecture réelle.
- `docs/PRODUCT.md` contenait un état technique de juin et des positions de source devenues incompatibles avec le Source Registry.
- `docs/SCRAPING.md` ne séparait pas assez discovery, droit de fetch, stockage, réutilisation et affichage.
- `docs/DEPLOYMENT.md` utilisait des compteurs de tests historiques et supposait un auto-deploy Git fiable.
- `docs/VISUAL_SYSTEM.md` interdisait tout doré, en contradiction avec la famille Option A explicitement approuvée et livrée.
- plusieurs documents Canary affirmaient encore « 1 % non activé » alors que le code actuel autorise un cap de 10 % et que la page/API ont évolué.
- `ODM-09E` conservait une certification 40K historique rendue non canonique par la quarantaine verticale puis le gate listing-only.

### Structurel

Le dépôt mélange :

1. documents canoniques ;
2. spécifications de LOT ;
3. preuves d’activation ;
4. audits DATA ;
5. rapports UX/UI ;
6. journaux append-only ;
7. runbooks historiques.

Sans hiérarchie explicite, un agent peut sélectionner un ancien document précis mais faux au lieu de l’état actuel.

## 4. Hiérarchie retenue

### Sources de vérité actives

- `README.md` ;
- `docs/START.md` ;
- `docs/ROADMAP.md` ;
- `docs/PRODUCT.md` ;
- `docs/ARCHITECTURE.md` ;
- `docs/SCRAPING.md` ;
- `docs/DEPLOYMENT.md` ;
- `docs/VISUAL_SYSTEM.md`.

### Gouvernance et historique

- `docs/DECISIONS.md` : journal de décisions ;
- `docs/SESSION.md` : journal d’exécution ;
- documents de LOT/audit/activation : preuve historique ;
- rapports UX/UI : recommandations et certifications datées.

En cas de conflit :

1. code et migrations mergés ;
2. preuve connectée actuelle ;
3. `START.md` et `ROADMAP.md` ;
4. politique Source Registry ;
5. document de LOT le plus récent ;
6. historique.

## 5. Fichiers mis à jour dans ce LOT

- `README.md` ;
- `docs/START.md` ;
- `docs/PRODUCT.md` ;
- `docs/ROADMAP.md` ;
- `docs/ARCHITECTURE.md` ;
- `docs/SCRAPING.md` ;
- `docs/DEPLOYMENT.md` ;
- `docs/VISUAL_SYSTEM.md` ;
- `docs/ODM-09E-PRODUCTION-CERTIFICATION.md` ;
- `docs/ODM-CANARY-READMODEL-01-VERDICT.md` ;
- `docs/odm/ODM-CANARY-1PERCENT-01.md` ;
- `docs/odm/ODM-CANARY-DUAL-READ-01.md`.

Les grands journaux ne sont pas réécrits dans ce LOT afin d’éviter de détruire leur historique. Ils devront être archivés/segmentés dans une mission documentaire dédiée.

## 6. Données utilisées pour la mise à jour

Lecture Supabase non destructive du 3 août 2026 :

- 56 777 Thin Index ;
- 34 172 immobilier probable ;
- 22 586 non immobiliers ;
- 22 481 immobilier display eligible ;
- 7 483 pages annonce listing-only éligibles ;
- 717 comparables prix/surface ;
- 4 508 `property_listings` ;
- 2 767 observations.

Production Vercel vérifiée :

- deployment `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f` ;
- état `READY` ;
- alias `akarfinder.vercel.app`.

## 7. Dette documentaire restante

- segmenter `SESSION.md` par mois ou LOT ;
- segmenter `DECISIONS.md` par année/domaine avec index ;
- ajouter un frontmatter commun (`status`, `date`, `supersedes`, `canonical`) ;
- déplacer les preuves closes vers `docs/archive/` sans casser les liens ;
- créer un gate CI détectant les mentions obsolètes critiques ;
- synchroniser les documents de monétisation et go-to-market lors de la prochaine décision commerciale ;
- comparer la copie GitHub avec les fichiers locaux non poussés du propriétaire.
