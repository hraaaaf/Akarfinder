# C8D — Agenz Surface Diagnostics — Closeout

## Scope

Cohorte bornée : Agenz × Diour Jamaa × 9 annonces détail, strictement read-only.

## Preuves live

### Surface recovery

- run `31968348418` : SUCCESS ;
- artefact `9269109315` ;
- digest `sha256:a03adfcfdd4911332acfa4f36f285737bc6d041c856a03fee5242bd383bc7f6f` ;
- 9/9 pages fetchées ;
- surface stricte : **2/9** (`90 m²`, `130 m²`) contre 0/9 avant correctif ;
- prix + surface : **1/9** ;
- `productionWriteCount=0`.

### Diagnostic signaux généraux

- run `31971442842` : SUCCESS ;
- artefact `9269907470` ;
- digest `sha256:e26de2c3baeb0ccee60162cf107a7799acb747fac12a97761f386a0320e5658f` ;
- les 7/9 échecs restants n'ont ni `m²` dans le titre ni `floorSize` JSON-LD ;
- le document contient pourtant de nombreux tokens `m²`, donc le body global est contaminé par des annonces voisines/recommandations ;
- aucun HTML brut persisté ; `productionWriteCount=0`.

### Diagnostic JSON structuré target-ID

- run `31973332410` : SUCCESS ;
- artefact `9270398018` ;
- digest `sha256:03ec794965f2d08f0ff691aece9589b5b800d84f4f6bd5665686410e4027f157` ;
- 9/9 pages fetchées ;
- 2 scripts JSON parseables par page observés ;
- **0 objet structuré portant l'ID cible exploitable** ;
- **0 nouvelle surface certifiable** via JSON target-ID ;
- `productionWriteCount=0`.

### Diagnostic DOM ownership

- run `31983044444` : SUCCESS ;
- artefact `9272933260` ;
- digest `sha256:24cc7a8484d875022e014c6d232dbd077dc525397eb9f391882e2aceab85bd70` ;
- 9/9 pages fetchées ;
- aucun conteneur sémantique surface/detail/feature ne fournit de candidat certifiable ;
- les valeurs `m²` non liées restent multiples et ambiguës ;
- **0 nouvelle surface certifiable** via DOM ;
- `productionWriteCount=0`, `rawHtmlPersisted=false`.

## Verdict

La surface Agenz est certifiable sur **2/9** annonces de cette cohorte via signaux page-scoped stricts. Les trois pistes supplémentaires — body global, JSON target-ID et DOM sémantique — ne permettent pas de défendre les 7/9 restantes sans risque de fausse attribution.

Aucun extracteur plus permissif n'est promu. Aucun champ récupéré n'est écrit en base. Aucune métrique prix/m² n'est publiée. Les 7/9 restent fail-closed.

## Next

Le chemin critique C8 repasse sur la certification géométrique des **19/23** localités non résolues, puis sur l'augmentation multi-source de profondeur prix/surface sans statistique sparse.
