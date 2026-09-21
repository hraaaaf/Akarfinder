# Casablanca product geography — Yakeey / Google cross-check

Status: authoring doctrine, non-published geometry.

## Purpose

Do not conflate historical/urban-planning sectors with current real-estate product neighborhoods.

### Source roles

- AUC / official planning documents: administrative or historical urban-planning evidence.
- Yakeey public price reference: current real-estate product taxonomy / neighborhood naming.
- Google Maps public cartography: current colloquial spatial orientation and neighboring-place cross-check.
- OSM/PBF: materialization substrate once a product boundary recipe is independently defensible.

No third-party geometry is copied unless it is explicitly public, reusable, and provenance/licence-safe.

## Confirmed product separations from Yakeey

Casablanca taxonomy exposes these as distinct product entities:

- Racine
- Triangle D'Or
- Bourgogne (Anfa)
- Bourgogne (Sidi Belyout)
- Ain Diab
- Ain Diab Extension 2
- Casablanca Finance City
- El Hank
- Sindibad
- Maarif
- Maarif Extension
- Gauthier
- Cil
- Ferme Bretonne
- Beausejour

This means AkarFinder must not collapse:
- Bourgogne (Anfa) into Bourgogne (Sidi Belyout)
- Ain Diab into Ain Diab Extension 2
- Racine into Triangle D'Or / Maarif Extension
- CFC into CIL / Ferme Bretonne / Beausejour

## Racine modern-product signal

Google Maps imagery indexed publicly positions:
- Bourgogne north of Racine
- Gauthier east of Racine
- Boulevard Al Massira Al Khadra along the southern side of the Racine label area

This current product orientation is distinct from the historical AUC sector recipe that includes a historical “Boulevard Racine”.

Therefore:
- keep the historical AUC Racine geometry track in HOLD until its historical street names are resolved;
- create a separate modern Racine product-geometry track;
- do not use the historical AUC ~143 ha area as a target for the modern product polygon.

## Yakeey reverse-engineering result

A direct unauthenticated machine fetch of Yakeey pages from GitHub Actions returns HTTP 403.
The public/search-indexed HTML exposes the product taxonomy and price pages but not polygon coordinates.
Do not attempt aggressive bypasses.

Next safe path:
1. collect public Yakeey-labeled listings / product pages as neighborhood-membership evidence;
2. cross-check neighborhood adjacency with Google Maps;
3. materialize candidate boundaries on OSM roads only when enough independent evidence supports the edge;
4. keep candidate polygons SHADOW until visual + topological + neighborhood-membership tests pass.
