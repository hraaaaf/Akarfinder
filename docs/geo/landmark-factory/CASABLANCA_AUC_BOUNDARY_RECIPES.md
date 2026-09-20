# Casablanca — authoritative boundary recipes (AUC)

These recipes are authoring-only inputs for Landmark Factory. They do not
constitute published boundaries. A geometry may move to SHADOW only after:
1. every required ingredient is resolved to OSM geometry,
2. topology closes without hand-drawn interpolation,
3. area is consistent with the AUC reference,
4. provenance is archived.

## Racine
AUC reference area: ~143 ha.

Required boundaries:
- North: Boulevard Racine
- South: Boulevard d'Anfa + Boulevard Abdelkrim Al Khattabi
- West: Avenue Temera + Boulevard de la Lybie
- East: Boulevard du Phare + Boulevard Abdellatif Ben Kaddour + Boulevard Mohamed Zerktouni

Status: recipe locked; OSM alias resolution still in progress.

## Bourgogne 2
AUC reference area: ~109 ha.

Required boundaries:
- North: Boulevard de la Corniche
- South: Boulevard Abdellatif Ben Kaddour
- West: Avenue du Phare (renamed Avenue Docteur Mohamed Sijelmassi)
- East: Boulevard Mohamed Zerktouni

Status: recipe locked; legacy Avenue du Phare alias accepted only where OSM
provenance explicitly preserves the old name / renamed axis.

## Aïn Diab
AUC reference area: ~200 ha.

Required boundaries:
- North + West: Atlantic Ocean coastline
- South: Boulevard de l'Océan Atlantique
- East: Boulevard de la Corniche

Status: recipe locked. Must use real OSM coastline geometry for ocean edges;
never replace coastline with a straight line or bbox.
