# Vivre Ici — Stadium pass LOT 01

Date: 2026-09-19
Branch: `feat/vivre-ici-stadiums-lot-01`

## Goal

Run a stadium-first landmark pass using map coordinates as the point anchor, then require independent territorial evidence before attaching the point to a canonical AkarFinder neighborhood.

## Registry/backlog check

The existing verified landmark registry was inspected before selection. Maârif already contains Twin Center but no stadium landmark. The other stadium candidates below are not promoted when their point cannot be attached safely to an existing canonical neighborhood.

## RETAIN — Complexe Sportif Mohammed V / Maârif

Canonical parent: `district_casablanca_maarif`

Sources:
1. SONARGES (primary operator): identifies Complexe Mohammed V in Casablanca — quartier Maarif and gives Avenue Al Caid Al Achtar, Maarif.
2. Casablanca City (primary municipal source): explicitly says the complex is in the Maârif neighborhood and gives Rue Al Azrak Ahmed — Maarif.
3. Google Maps: mapped stadium point / Rue Ahmed Lazrak.

Verified point used: **33.58287, -7.64682**.

### AkarFinder notoriety score — 100/100

- Public visibility: 20/20
- Orientation value: 20/20
- Local anchoring: 20/20
- Visual singularity: 20/20
- Source reliability: 20/20

Territory decision: **RETAIN**. Two primary sources independently name Maârif, and the mapped point agrees with the stadium location.

Visibility policy: `minZoom=13.2`, `retainPriority=true`. Existing collision/priority machinery remains authoritative; no map rendering contract is bypassed.

### Mini-illustration target

Semi-figurative simplified stadium bowl inspired by the Mohammed V oval geometry: low-angle oval grandstand, open green pitch void, two restrained floodlight silhouettes, no logo, no text, no photorealism, no generic football pictogram. Must remain recognizable at landmark-marker scale and follow the existing AkarFinder landmark palette/stroke language.

## Investigated — not promoted in LOT 01

- Prince Moulay Abdellah, Rabat: point is identifiable, but this pass does **not** attach it to Souissi or Hay Riad without canonical polygon/territorial proof. Previous loose Souissi assignment is explicitly rejected.
- Larbi Zaouli, Casablanca: public evidence ties it to Hay Mohammadi, but Hay Mohammadi is not yet a canonical AkarFinder neighborhood; wait for district reconciliation.
- Père Jégo, Casablanca: point is identifiable but no safe existing canonical parent is proven in this pass.
- Grand Stade de Marrakech: point/site is identifiable but its Ouahat Sidi Brahim / Route de Casablanca context does not map to the current canonical Marrakech neighborhood set without inference.
- Grand Stade d'Agadir: identifiable stadium zone, but no safe attachment to current canonical Founty/Talborjt entities.
- Stade Ibn Batouta, Tanger: identifiable point southwest of Tangier, but no safe attachment to Malabata/Ville Nouvelle/Marchan.
- Complexe sportif de Fès: identifiable on Route de Sefrou, but no safe attachment to current canonical Ville Nouvelle/Fès el-Bali.

## Guardrails

- No Supabase write.
- No business-data mutation.
- No ranking change.
- No merge.
- No deploy.
- A mapped point is necessary but never sufficient for neighborhood attachment.
