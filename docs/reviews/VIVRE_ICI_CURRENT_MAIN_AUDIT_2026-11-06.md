# Vivre Ici — audit code & contrats du main courant (06/11/2026)

> **Statut : AUDIT PARTIEL — NON CERTIFIÉ VISUELLEMENT.**
> Cette revue constate les écarts démontrés dans les fichiers de `main@c0f172bc6755d769a3103051d90c2953f3215de2` et le rapport d'un parcours automatisé. **Aucune capture du Vivre Ici sur le HEAD courant n'a été produite** par cet audit. Les anciens snapshots historiques ne sont pas présentés comme preuve d'aujourd'hui. Aucune note UX globale sur 10 n'est accordée.

## GOAL / SUCCESS / PROOF

**Goal.** Auditer le parcours canonique **Vivre ici = `/map`** : Maroc → région → ville → quartier → biens, et la cible pilote **Maârif** (vue quartier, limites administratives, zoom rue/POI), sans données ou frontières inventées.

**Success observable attendu.** Captures réelles et scénarios fonctionnels **390×844, 430×932, 768×900, 1280×900** pour national + 3 modes Maârif, mêmes viewports BEFORE/AFTER si correction ; liens et retour Maroc fonctionnels ; accès clavier/tactile, pas d'overflow, pas d'élément fixe masquant CTA ; affichage fail-closed des sources/prix/POI ; pas de diffusion de données synthétiques comme vérifiées ; réseaux/licences/attribution contrôlés ; revue visuelle sévère **≥9,5/10** selon [spec propriétaire](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65).

**Périmètre vérifié.** Code GitHub `main@c0f172bc6755d769a3103051d90c2953f3215de2`, `app/map/page.tsx`, `components/map/PremiumInteractiveMap.tsx`, `components/map/PremiumInteractiveMapBridge.tsx`, `components/map/NationalMapRouter.tsx`, `components/map/MapLibreNeighborhood3D.tsx`, `components/map/P4MapDecisionRail.tsx`, `lib/product-navigation.ts`, `scripts/audits/carte-national-journey-n3.mjs`; artifact GitHub N3 [run #42295913806](https://github.com/hraaaaf/Akarfinder/actions/runs/42295913806) / #13541542922 (JSON analysé).

## Résultats : classement par gravité

### P0 — Données de démonstration présentant un niveau de vérification non fondé

**Preuve source :** `components/map/PremiumInteractiveMap.tsx` (fonction `useMapData()`, commentaires `MOCK`, marqueur `data-db-mode="mock-only"`) encode pour des quartiers `priceRepere` et `landmarksVerified` numériques. Exemple **Maârif : 17 600 DH/m² et 15 repères**. Les blocs de quartier et les lignes de liste affichent directement ces chiffres comme **« repère prix »** et **« repère vérifié »**, avec une icône de validation. Le haut de la page mentionne « prototype » et le footer avoue « mock isolé » : la simulation est donc textuellement annoncée, **mais le libellé “vérifié” reste contradictoire et facile à prendre pour une preuve réelle**.

**Risque :** confiance utilisateur, information immobilière potentiellement fausse. **Correctif requis avant certification publique :** ne jamais afficher de valeurs `priceRepere`/`landmarksVerified` issues de `useMapData` dans une carte de décision ; afficher « données non disponibles » (fail closed), ou utiliser uniquement un read-model réellement sourcé avec date, méthode, provenance et droits. Retirer les traces de développement du rendu final, sans cacher que les données ne sont pas disponibles. Ajouter test de non-publication de chiffres mock.

### P0 — Parcours pilote Maârif non conforme à la cible en trois vues

**Cible validée :** [Notion, 10/10/2026](https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65) : vue quartier 2D, limites administratives sur action explicite avec attribution et retour, zoom rue avec POI sourcés ; périmètre de l'arrondissement OSM distinct du seul quartier central.

**Preuve source :** `NationalMapRouter.tsx` monte `MapLibreNeighborhood3D` pour `city=casablanca&district=maarif&layer=explore` mais **ne fournit pas `boundaryGeometry`**. Le composant indique `data-maplibre-boundary-status="center-only"` si la géométrie manque. Les « modes » Satellite/Quartiers rendus par `MapLibreNeighborhood3D.tsx` sont des `<span>` statiques, pas des boutons permettant de choisir trois vues ; aucun contrôle nommé « Voir limites administratives » n'y est exposé. Son affichage par défaut est satellite 3D, alors que la spec exige une vue quartier 2D en premier.

**Risque :** mélange de représentation contextuelle et limites réelles, promesse produit Maârif non tenue. **Correctif :** réaliser de vrais états/actions Vue quartier 2D ↔ Limites administratives (arrondissement sourcé uniquement) ↔ Rue, attribution explicite, aucun polygone de quartier inventé. Vérifier le retour à chaque étape.

### P1 — Couverture d'audit actuelle incomplète (pas de certification UX)

**Preuve CI actuelle :** [N3 run #42295913806](https://github.com/hraaaaf/Akarfinder/actions/runs/42295913806) `report.json` : `ok=true` ; 2 cas **390 / 1280** ; transition premium Maroc → Casablanca → Maârif, MapLibre ready, handoff `/search?city=Casablanca&district=Ma%C3%A2rif`, `searchRendered=true`, `overflow=0`. **Aucune capture dans cet artifact (seulement report.json).** Le script N3 n'a que deux viewports. HVR-4 et HVR-6 testent seulement la présence du lien `/map` sur Home et l'absence volontaire du teaser sur Home ; ils **ne vérifient pas le design /map**.

**Blocages de preuve :** pas de 430/768 sur cet exact parcours et ce HEAD, pas de screenshots nation/quartier/administratif/rue, pas de vérification full-page du panneau mobile, clavier/focus, gestes, mode erreur réseau, ni source réelle des données. Le `main` fusionné n'a pas été déployé sur Vercel (interdiction propriétaire). Environnement de cette revue : GitHub disponible en lecture, **pas d'accès navigateur à un serveur lancé sur le HEAD** ; accès Git direct réseau indisponible. **Ne pas attribuer 9/10 ou 10/10 à Vivre Ici.**

### P1 — Lisibilité / accessibilité / gouvernance de l'imagerie à certifier

`PremiumInteractiveMap.tsx` expose des légendes UI à **8,5–9 px** et la mention technique « Aucun appel Supabase · aucune écriture DB · mock isolé dans useMapData() » dans son footer. `MapLibreNeighborhood3D.tsx` contient une navigation de catégories mais aussi de petits labels, des états de chargement, et utilise des tuiles satellite Esri avec `attributionControl:false` sur la carte. L'attribution est définie dans une source ; **la présence d'une attribution visible suffisante à l'écran et le droit de réutilisation en production ne sont pas prouvés**. La documentation historique `3-vivre-ici-akarfinder.md` exige déjà de verrouiller licence/support/attribution ; ce risque reste ouvert. Ne pas confondre soupçon d'accessibilité et non-conformité WCAG prouvée.

## Faits positifs et distinction architecture

- **Route publique canonique : `/map`**, navigation desktop + bottom-nav « Vivre ici » ; l'absence d'`/vivre-ici` n'est pas un bug de routage.
- **La section teaser Home Vivre ici a été volontairement retirée** par la décision Home #1145, ce que contrôlent HVR-4/6 ; ce n'est pas la preuve d'un audit du parcours /map.
- Code de navigation avec retour « Maroc » et paramètres city/district ; N3 confirme un vrai handoff à Search dans les deux scénarios automatisés.
- Sur Maârif, l'interface MapLibre énonce « Repère central sourcé · périmètre non revendiqué » en absence de polygone. C'est un bon garde-fou de vérité, **mais insuffisant pour remplir la cible des trois vues**.

## Plan correctif et protocole de certification

1. **P0 données** : stopper toute présentation des champs mock comme chiffres ou POI « vérifiés » ; contrats statiques et tests end-to-end sur tous les quartiers de la carte nationale.
2. **P0 spec Maârif** : expliciter les 3 modes avec bascule réelle, branchement géométrie arrondissement uniquement si source/qualité validées, aucun faux contour quartier. Préserver les POI sourcés.
3. **BEFORE** : sur le HEAD courant et un navigateur contrôlé sans Vercel, capturer `/map`, sélection région/Casa/Maârif, retours, Search, états vides/erreurs ; 390/430/768/1280, sauvegarder + afficher les captures.
4. **Mockup/target** : confronter les images à la spec Notion 3 vues, nommer les différences.
5. **Implémenter dans PR séparée**, puis **AFTER aux mêmes vues/fixtures**, tests interaction/accessibilité et contrôles des droits ; viser ≥9,5/10 **sans attribution anticipée**.
6. **Gate sécurité** : GitHub `gate` authentique, Vercel `git.deploymentEnabled:false` conservé, pas de DB de production ni d'import d'images tiers, merge et déploiement seulement selon autorisations explicites.

**Dernier état :** audit code/contrats **P0 NON RÉSOLU** ; audit visuel du HEAD courant **NON EFFECTUÉ**. Le closeout Search Option A (#1147/#1173) n'englobe pas et ne clôture pas Vivre ici.
