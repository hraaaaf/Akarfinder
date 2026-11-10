# Vivre Ici — J11-C adaptateur de lecture QA locale (10/11/2026)

## Scope et sécurité
Objectif : vérifier la lecture du pack privé J11-B depuis le moteur Node de Next, **sans UI et sans mise en ligne**. L'API `/api/geo/qa-national-landmarks` existe uniquement pour la preview locale, et retourne `404` sauf si les **trois** conditions sont remplies : `NODE_ENV=development`, `AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW=true` et les variables serveur `AKAR_VIVRE_ICI_QA_TILE_PACK_DIR`, `AKAR_VIVRE_ICI_QA_EXPECTED_SHA256` définies.

La lecture est limitée à 64 cellules de 0,05° et à 1 000 features au maximum, hors vues nationales à faible zoom. Chemins de tuiles construits à partir d'indices numériques, SHA-256 vérifié pour chaque tuile chargée, refus des données malformées ; identité du PBF fixée par la variable de SHA-256 attendue. Réponse no-store/noindex. Aucun endpoint public déployé, aucune DB produit, aucun pack dans `public/` ni dans Git.

### Variables de QA Windows (exemple du lot)
- `AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW=true`
- `AKAR_VIVRE_ICI_QA_TILE_PACK_DIR=C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\national-index\morocco-20261109-osm-tiles-v1`
- `AKAR_VIVRE_ICI_QA_EXPECTED_SHA256=0ba250a5c27319a029b7c6b971e2a96a86b300d459406bb162be4c44a23a730f`

Ne jamais ajouter ces variables au Vercel ni envoyer le pack QA sur Internet.

### Gate et suites
- **J11-C1** : tests Node isolés sur bbox, provenance, hash, limite, chemin et refus des revendications commerciales ; workflow GitHub ciblé. Code fourni, pas encore certifié au HEAD.
- **J11-C2** : avant modification MapLibre, captures BEFORE aux 390/430/768/1280, puis lecture réseau QA + map markers à coordonnées OSM fixes (pas de glissement), collisions et attribution ; AFTER mêmes 4 viewports. Ne pas réutiliser automatiquement les POI 'certifiés commerce' existants comme s'ils étaient de nouvelles sources officielles.
- **J12** : QA performance mobile/réseau/cache et UX 3 modes Maârif ; puis J13 closeout et J14 gate release.

**Interdictions :** pas de déploiement Vercel, de merge, de DB PROD ni de publication des tuiles privées.

## J11-C1 durcissement accès local

En mode QA, le hostname de la requête doit également être loopback (`localhost`, `127.0.0.1`, `::1`) ; même un serveur Next de développement accessible sur le LAN ne doit pas distribuer ces données privées sur une autre adresse. L’échec donne HTTP 404, sans fuite de chemin local.

## J11-C1 — preuve Node sur pack national réel (10/11/2026)

Script de QA privé `qa-node-national-serving.mjs` exécuté sur le PC, avec le lecteur versionné `private-national-qa-tiles.mjs` du dépôt, pack final J11-B et empreinte SHA-256 PBF épinglée. **75 lectures Node**, 25/ville et 180 points retournés/ville, exit 0. Sans écriture DB, réseau public ou UI.

| Ville | Médiane Node disque | P95 |
|---|---:|---:|
| Casablanca | 38,032 ms | 68,237 ms |
| Rabat | 35,819 ms | 38,924 ms |
| Marrakech | 36,805 ms | 50,109 ms |

Source et attribution OSM/ODbL présentes ; `businessOperatingStatusCertified=false` et `officialNeighborhoodMembershipCertified=false` sur les trois villes. Ce benchmark valide **le module Node**, pas encore l'API HTTP Next ni le rendu MapLibre.

**Compression J11-B indépendante** : 1 339 tuiles, 9 184 479 octets bruts hors manifeste, 1 387 698 octets gzip niveau 6 (économie 84,9 %) ; tuile la plus dense 351 305 octets bruts, 35 774 octets gzip. Mesure disque QA sans requête HTTP ; ne pas présenter comme mesure CDN.

**Prochain gate J11-C2** : test HTTP localhost Next avec `NODE_ENV=development` et variables locales privées, 404 en production/sans flag/hors loopback, puis branchement MapLibre sur option QA, captures BEFORE/AFTER aux 390/430/768/1280. Pas de déploiement Vercel, de merge ni de promotion du pack.

## J11-C1 — preuve HTTP de sécurité locale (10/11/2026)

**Défaut découvert lors du contrôle réseau réel** : la route QA renvoyait HTTP 200 avec un en-tête `Host: foo.invalid` malgré un `request.nextUrl.hostname` normalisé à `127.0.0.1`. Le contrôle du seul `nextUrl.hostname` n'était pas suffisant pour garantir la restriction d'hôte. **Correctif** : helper `private-qa-host-guard.mjs` avec lecture du champ `Host`, du champ `X-Forwarded-Host` et du hostname Next, refus en cas d'hôte non loopback ou d'en-tête malformé ; garder en outre le serveur de développement lié uniquement à `127.0.0.1`.

**Après correctif** : HTTP `200` pour l'hôte local autorisé, `404` pour `Host: foo.invalid`, `404` pour `X-Forwarded-Host: foo.invalid`. **12/12 tests Node locaux PASS** (8 lecture de tuiles + 4 garde d'hôte). Le host check est une défense supplémentaire, **pas une authentification** et ne remplace jamais l'écoute loopback et `NODE_ENV=development`. Aucune activation Vercel.

**J11-C2** : un essai de capture BEFORE 390 px sur le serveur Next local a expiré sur `/map` (timeout `domcontentloaded` 60 s pendant la compilation de la page). **Aucune capture actuelle certifiée**, pas de rendu MapLibre QA validé. Diagnostiquer la compilation/capture, puis BEFORE/AFTER 390/430/768/1280 avant validation UI. Les captures historiques du 08/11 ne constituent pas une preuve de rendu sur ce nouveau HEAD.

## J11-C2 — preview MapLibre nationale privée et captures (10/11/2026)

**Goal :** afficher des repères OSM indicatifs du pack national via l'API QA locale J11-C1 sur Maârif, en conservant les contrôles de provenance et sans impact production. **Success provisoire J11-C2 :** une seule couche MapLibre derrière le double gate `NODE_ENV=development` + `NEXT_PUBLIC_VIVRE_ICI_QA_NATIONAL_POI=true`, requête HTTP loopback bornée à 180 objets et 64 cellules ; source GeoJSON clusterisée, compteurs, sélection catégorie, clic/zoom et attribution OSM/ODbL.

**BEFORE/AFTER Playwright locaux** : dossier privé `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\before-j11c` puis `after-j11c`. Les quatre tailles identiques **390×844, 430×932, 768×900, 1280×900** ont été capturées à chaque étape, écran `/map?layer=explore&city=casablanca&district=maarif` sur serveur localhost. BEFORE : couche contexte initiale 0 repère, MapLibre basemap `available`. AFTER v2 : API nationale HTTP 200, **152 / 176 / 180 / 180 objets** selon viewport, couche QA `ready`, fond `available`, 7 boutons catégorie, **0 erreur JS, 0 overflow horizontal** ; les objets sont regroupés visuellement en clusters natifs MapLibre, plutôt qu'une pluie de 180 points. Première variante non clusterisée archivée sous `after-j11c-v1`, non retenue pour la QA visuelle.

**Conditions importantes** : `sourceSha256` vérifiée côté Node à partir du PBF Geofabrik national ; pas de publication des tuiles `PRIVATE_QA_ONLY`, pas de capture d'ouverture réelle ou périmètre officiel ; aucun statut commerce ouvert certifié. La sélection est **par viewport**, pas une certification du quartier Maârif. Les limites administratives restent distinctes de cette couche. L'interface publique garde l'ancien message « aucun repère suffisamment récent » : **incohérence de lecture entre repères indicatifs OSM et flux historique** à résoudre au J12 avant release.

**Problèmes détectés et corrigés pendant QA** : une première implémentation affichait 152–180 points sans regroupement, trop dense ; adoption de `cluster=true`, clusters et compteurs, filtre client reconstruit la source pour éviter des groupes non filtrés. Une régression d'initialisation de `activeCategory` a empêché une capture v2 initiale ; corrigée par réordonnancement des hooks, puis les quatre captures finales ont réussi. Ne pas promouvoir la première tentative.

**Réserves / prochains gates** : les captures Playwright prouvent la disponibilité et la géométrie de la preview locale, **pas une performance HTTP production ni un score UX ≥9,5/10**. La couche de points WebGL manque encore d'alternative clavier et la fiche de quartier historique n'est pas synchronisée à la source indicative ; benchmark réseau mobile, budget CDN/cache, a11y, collisions mobiles, J12 puis J13/J14 restent à valider. Aucun merge/DB PROD/déploiement Vercel.

## J11-C2 — BEFORE → AFTER QA privée (10/11/2026)

**Goal :** rendre les POI OSM nationaux visibles sur MapLibre en mode QA strictement local, sans publication de données, sans faire passer des objets communautaires pour des commerces vérifiés ou un périmètre officiel. **Success observable :** 4 viewports chargés, couleurs/catégories/cluster, zoom et filtre fonctionnels, attribution OSM/ODbL présente, texte fiche sans contradiction, zéro erreur JS, zéro overflow.

**BEFORE vérifié** : `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\before-j11c\`, captures 390×844, 430×932, 768×900, 1280×900. Carte 2D disponible ; contexte ancien `anchor_count=0` et fiche « repères récents indisponibles » ; aucun repère national dessiné.

**AFTER vérifié** : `C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j11c-final-qa\` (4 captures + `report.json`, **sortie Playwright exit 0**). 390px **152**, 430px **176**, 768px **180**, 1280px **180** points OSM dans la bbox. Chaque viewport : API localhost HTTP 200, `source=available`, `qaState=ready`, 0 erreur JS, 0 overflow horizontal, 7 boutons de filtres visibles ou défilables, attribution OpenStreetMap/ODbL présente. Maximum sélection 180, pas une affirmation de couverture exhaustive. Capture 430 stabilisée **après retour au mode Quartier**, pas pendant le rechargement.

**Interactions vérifiées** : à 430px, bouton « Écoles » **176 → 24** points, « Repères » rétablit 176 ; « Rue · zoom » **14,6 → 17,1** après attente réelle des tuiles ; « Limites » affiche l'explication prudente, puis « Quartier · 2D » revient ; clic sur cluster repéré à l'écran conduit de **14,6 → 16,1** ; contrôles de réseau/pan corrigés. UI locale affichée seulement si `NODE_ENV=development` **ET** `NEXT_PUBLIC_VIVRE_ICI_QA_NATIONAL_POI=true`, route privée aussi soumise à son gate serveur et loopback. Ne pas ajouter ces variables à Vercel ni déplacer les tuiles dans `public/`.

**Contradiction supprimée** : `P4MapDecisionRail.tsx` distingue désormais explicitement repères OSM *indicatifs sur la carte* et vie quotidienne *enrichie non disponible dans la fiche*, uniquement sous gate QA. Aucun message « ouverture certifiée » ou appartenance officielle. La couverture des prix/valeurs contextuelles enrichies reste indépendamment non validée.

**Tests** : Node isolé et contrats source **17/17 PASS** (8 lecture du pack, 4 Host/loopback, 5 UI/release gating). Tests de navigation/interaction réalisés sur PC privé ; workflow GitHub ciblé J11 étendu aux composants MapLibre/rail et aux tests, **à contrôler sur le commit de ce lot**. TypeScript non attesté au moment de la rédaction de ce bloc si contrôle encore en cours.

**Analyse visuelle provisoire 8/10** : progrès réel vs AFTER précédemment vide ; clusters plus lisibles et message fiche cohérent. Les contrôles catégorie restent denses en mobile ; panneau/attribution occupent encore de la place ; limites fiables du quartier central Maârif absentes. **Pas de 9,5/10**, pas de score certifié production.

**Next** : typecheck et GitHub CI du HEAD après commit ; J12 tests multi-ville, zoom large (refus >64 cellules), interactions a11y/mobile, cache/réseau ; J13 docs/closeout ; J14 gate release humain. **Aucun merge, DB produit ou déploiement Vercel.**

## J12 — QA tactile, attribution, clavier et multivilles (10/11/2026)

Compte rendu détaillé et preuves : `scripts/neighborhood-context/J12_MAPLIBRE_QA_2026-11-10.md`. Résultats locaux observés : 44 px sur cibles tactiles auditées 390/430/768 ; attribution desktop contenue ; Playwright 4/4 viewports, API QA 9/9 assertions (Casablanca/Rabat/Marrakech + refus), clavier 2/2 ; Node contrats J11+J12 21/21. Tous ces résultats concernent la QA locale, pas la production. J12 reste ouvert pour accès clavier aux repères WebGL individuels et vérification réseau réelle ; objectif visuel 9,5/10 non atteint. Aucun merge, DB PROD, Vercel ni publication du pack privé.
