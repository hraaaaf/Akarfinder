# Vivre Ici — Landmark Factory LOT 03 — Rabat / Agdal

Date: 2026-09-20

## Registry-first decision

Existing landmark already present for canonical `district_rabat_agdal`: **Gare Rabat-Agdal**. It is not duplicated.

This lot reviews additional high-utility Agdal anchors and retains two candidates with independent evidence and verified points.

## RETAIN 1 — Jardin d’Essais Botaniques de Rabat

Canonical parent: `district_rabat_agdal`.

Evidence:
- **INRA (primary)**: official Jardin d’Essais page; created in 1914, 17 ha, >650 species, research/conservation/education role; address Avenue Hassan II, Rabat.
- **Independent territorial/geodata corroboration**: published Agdal description and coordinate `34.00833,-6.84583`; municipal/independent mapping corroborates the garden footprint around `34.00847,-6.84934`.

AkarFinder point retained for the landmark: **34.00833, -6.84583**. Because the garden spans 17 ha, this is a representative verified landmark point, not a doorway claim.

Notoriety score: **94/100**
- public visibility 19/20
- orientation value 20/20
- local anchoring 20/20
- visual singularity 18/20
- source reliability 17/20

Visibility target: `minZoom=13.6`, `retainPriority=true`; reuse existing progressive zoom/collision engine.

Illustration target: semi-figurative garden composition with the long axial terraces, dense mature canopy, a restrained arabo-Andalusian pavilion cue and basin geometry. No generic tree/leaf pictogram, no text, no photorealism.

## RETAIN 2 — Bibliothèque Nationale du Royaume du Maroc (BNRM)

Canonical parent: `district_rabat_agdal`.

Evidence:
- **BNRM (primary)**: official contact page explicitly gives `Avenue Ibn Khaldoun, Agdal Rabat`.
- **Visit Rabat (independent public tourism source)**: identifies the BNRM as a major cultural centre in Agdal.
- **ISSN International Centre (independent institutional source)**: gives `5, avenue Ibn Khaldoun, Agdal` and coordinate `34.0091341,-6.8429856`.

AkarFinder point retained: **34.009134, -6.842986**.

Notoriety score: **93/100**
- public visibility 19/20
- orientation value 19/20
- local anchoring 20/20
- visual singularity 17/20
- source reliability 18/20

Visibility target: `minZoom=13.6`, `retainPriority=true`; reuse existing progressive zoom/collision engine.

Illustration target: simplified semi-figurative BNRM massing with long contemporary horizontal facade, deep shaded entrance/esplanade and restrained Moroccan geometric rhythm. No generic book/library pictogram, no text, no photorealism.

## Rejections / holds

No third candidate is promoted in this lot. The quality gain from two strong institutional/green anchors is preferable to filling a quota with a weaker or less singular Agdal POI.

## Guardrails

- 0 Supabase write
- 0 business-data mutation
- 0 listing-ranking change
- 0 deploy
- 0 merge

## Runtime registry status

The two entries are **certified candidates**, but this branch deliberately does not rewrite `territory-landmark-registry.ts` blindly. Previous factory runs established that connector retrieval of the large shared registry can be incomplete/truncated. A byte-complete or narrow safe patch path is required before runtime insertion. This prevents accidental deletion/regression of existing landmarks.

## Source URLs

- https://www.inra.org.ma/fr/content/jardin-dessais-botaniques-de-rabat-0
- https://fr.wikipedia.org/wiki/Jardin_d%27essais_botaniques_de_Rabat
- https://www.communesmaroc.com/nl/ville/rabat/spot/view/rabat-jardin-d-essais-botaniques
- https://bnrm.ma/bnrm/fr/contactez-nous.html
- https://www.visitrabat.com/lieux/la-bibliotheque-nationale/
- https://www.issn.org/locations/bibliotheque-nationale-du-royaume-du-maroc-bnrm/
