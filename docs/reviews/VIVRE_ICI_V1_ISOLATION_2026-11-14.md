# Vivre Ici V1 limitée — isolation du lot composite #1197 (14/11/2026)

## GOAL
Isoler les trois modes Maârif acceptés et les améliorations de lisibilité, depuis la base `72a1f4ef5377c8e2856bdebe35bf169597cade14`, sans importer les 162 fichiers du diff #1197.

## SUCCESS / Preuve prévue
- 3 commandes accessibles : Quartier 2D, Rue zoom, Limites et Retour au quartier ; pas de polygone administratif non certifié.
- H1, landmark main, disclosure natif des sources, états vides honnêtes, lien Search inchangé.
- 390/430/768/1280 : commandes >=44px, retour Maroc >=44px, texte d'état >=12px, caméra Rue 17,1, Limites 14,6, 0 overflow / erreur JS.
- Screenshots sur SHA de cette PR + comparaison au run #43536821001 de #1197 ; tant que la CI/capture isolée n'est pas terminée : **non validé**.
- Merge et Vercel uniquement après deux autorisations distinctes.

## Périmètre technique
- Porte : `components/map/MapLibreNeighborhood3D.tsx` (ajout de Limites explicatif, aucun adminShadow), `components/map/P4MapDecisionRail.tsx` (source/read-model / UX), `app/map/page.tsx` (main), CSS de présentation et scripts Playwright, canonique.
- Réutilise les primitives de carte 2D, navigation, fetch d'ancres vérifiées et composants de la base.
- Exclut : `app/api/geo/indicative-landmarks`, `j18-blob-review`, `j18-indicative-review`, `qa-national-landmarks`, tout `lib/map/maarif-osm-arrondissement-shadow`, routes J18, lecteurs Blob, quotas Redis, tuiles OSM et tout ajout de POI/DB. Aucun workflow lourd modifié, pas de nouveau trigger de benchmark.
- Aucun aperçu adminShadow ne peut être activé via un flag de cette PR.

## Gouvernance
V1 human gate accepté dans [commentaire #1197](https://github.com/hraaaaf/Akarfinder/pull/1197#issuecomment-6874627963). Le code isolé est une adaptation minimale : les preuves historiques montrent l'intention UX, mais **ne sont pas une validation automatique du nouveau SHA**.
Lot 5 ACTIVE, Lot 6 OPEN. Aucun merge ni Vercel autorisé.

## Premier audit CI sur 329e0e97 : 4 workflows RED, causes identifiées, aucun changement de données

- L1 Registry #43577681646 : ancien contrat test attend 13 POI ANN-L5, mais `lib/neighborhood-context/certified-seed.ts` contient exactement 12 entrées ; corriger uniquement l'assertion 13 → 12, **sans créer de POI** ni modifier le dédoublonnage runtime (qui appartient à une décision distincte Lot 5).
- Casablanca Visual #43577681675 : à 390px, le rail compact avait `clientHeight=158` et `scrollHeight=181`, texte/CTA potentiellement tronqués. Cause de portage : le composant accessible est `h1` mais plusieurs sélecteurs CSS de la base ne stylent que `h2`. Reprendre de #1197 uniquement les styles de présentation H1 dans `l2c-sheet`, `clinical-final`, `premium-lot8`, `target-alignment`, et l'espacement d'attribution `l2d-attribution` ; **vérifier par nouvelle capture**, ne pas annoncer réparé avant.
- N2 #43577681712 et N3 #43577681641 : anciens tests cherchent « Voir les biens disponibles à Maârif » tandis que la V1 approuvée dit « Rechercher des biens à Maârif ». Corriger les sélecteurs dans les deux tests, sans importer les tests J18/OSM de #1197.
- Aucun workflow YAML, route, source SIG, données POI, DB, stockage ou flag public modifié. Aucun merge ni Vercel.
