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

### 2026-11-14 — PR #1212 isolée : VALIDATION VISUELLE 12/12, blocages externes conservés

**Goal** : isoler la V1 Maârif approuvée (Quartier 2D, Rue zoom, Limites non disponibles) sans embarquer les 162 fichiers de #1197 ni aucun module de publication J18. **Success scope** : [PR #1212](https://github.com/hraaaaf/Akarfinder/pull/1212) Draft/non mergée, SHA code+tests `feca15d47665c3f820086792e8ef2329611d4435` (2 commits depuis `72a1f4ef`, 19 fichiers). GitHub Compare prouve zéro route `app/api/geo`, zéro workflow nouveau, zéro GeoShadow OSM, Blob/Redis/CDN, aucune donnée/DB/POI, aucune publication.

**Preuve UX stricte** : [Carte Lot 8 Casablanca Visual After #43578162428](https://github.com/hraaaaf/Akarfinder/actions/runs/43578162428) SUCCESS. Artefact GitHub **14107681924**, ZIP **7 717 893 octets** SHA256 local concordant avec GitHub : `8d4326ef2f15659ce460df04fba0c0eaebab8fe37bca94e66d70c194cadb8406`. Les 12 PNG `Quartier/Rue/Limites × 390/430/768/1280` sont **strictement identiques pixel-par-pixel (différence RGB=0 pour 12/12)** à la version V1 acceptée `c5e9bf10`, artefact SHA256 `7512e1abc5068e9f1e13cab605941f3c638ccee5d082392a4593d9619374a0b9`. Rapport Playwright `ok=true` : zoom Rue=17,1 et Limites=14,6 tous viewports, retour Maroc ≥44px/12px, message 12–12,5px, 0 erreur JS, 0 overflow horizontal, **0 POI public**. Comparatifs visuels contrôlés dans ChatGPT.

**CI complète sur ce SHA** : **11 workflows = 9 SUCCESS / 1 SKIPPED / 1 FAILURE** ; N2, N3, Casablanca, C7, Market, Zillow, Mockup PASS. [L1 POI Registry #43578162438](https://github.com/hraaaaf/Akarfinder/actions/runs/43578162438) FAILED uniquement à son **Final L1 truth + availability gate**, alors que contrats, TypeScript, build et capture L1 ont passé. Les deux endpoints Overpass ont renvoyé `upstream_error`, état `external_degraded`, `available=0/6`, `findings=0`. **Fail-closed maintenu, aucun faux repère : ne pas annoncer CI green ni désactiver le gate**. La couverture nationale L1 reste non certifiée ; cela ne retire pas le PASS du rendu limité explicitement sans POI.

**Accessibilité et périmètre d'acceptation** : la V1 sur #1197 a reçu la validation humaine et des essais NVDA/VoiceOver PASS, mais **ces lecteurs d'écran natifs n'ont pas été réexécutés sur le port #1212** (PC distant hors ligne). L'identité pixel ne prouve pas une identité de comportement vocal ou une conformité WCAG globale. Statut : **sous-lot UI isolé, visuel PASS**, fusion/release **NO-GO** tant que gouvernance de merge, dépendance L1 pertinente et risque d'accessibilité ne sont pas arbitrés. **Lots 5 ACTIVE, 6 OPEN, 4/6 historiques CLOSED** ; J18 OSM public OFF.

**NEXT exact** : conserver PR #1212 Draft, obtenir une revalidation ciblée des lecteurs natifs quand exécutable et traiter L1 externe sans tricher sur les données ; vérifier le HEAD documentaire après closeout puis préparer la revue/autorisation **distincte** de merge. Aucun merge ni déploiement Vercel sans autorisation explicite.


### 2026-11-14 — Audit natif NVDA/VoiceOver prêt sur la branche isolée (NON EXÉCUTÉ)

**Préflight de disponibilité** : le contrôle Desktop Commander `DESKTOP-3MAJEEH` retourne **OFFLINE** (77 h depuis dernière présence). Le plugin AI Machine Bridge voit une présence Windows en ligne, mais retourne `mode=presence_only, remote_commands=false, capabilities=[]`. Impossible d'exécuter la validation native sur le PC actuellement ; n'en pas déduire un PASS.

**Portage autorisé et à portée zéro produit** : les deux fichiers `scripts/audits/vivre-ici-native-screen-reader.spec.mjs` et `scripts/audits/vivre-ici-native-screen-reader.config.mjs` sont importés tels quels depuis le commit source #1197 `fff905186dc7f2fbabe7c8694398cc1461d38180`. Ils vérifient la **vraie voix NVDA/VoiceOver**, l'annonce du H1 Maârif, l'action native du bouton Limites, la présence du message indisponible, les attributs `aria-pressed`/`aria-expanded`/`aria-controls`, le retour au Quartier et la preuve `speech.json` ; ils ne simulent pas un lecteur d'écran. Ils ne changent **aucune interface**, aucun runtime, aucun workflow GitHub YAML, aucun flag / DB / OSM / Vercel. Le test sera valable seulement si exécuté sur le **HEAD exact** (sans déduire un succès de #1197).

**Commande de test sur environnement autorisé macOS ou Windows avec vrai lecteur** :
1. `git checkout <SHA exact de la PR #1212>`, `npm ci`, puis `npm install --no-save --package-lock=false @guidepup/guidepup@0.40.0 @guidepup/playwright@0.21.0 @guidepup/setup@0.29.3 @playwright/test@1.65.0`.
2. `npx @guidepup/setup setup --ci`, puis `npx @guidepup/setup install` ; installer `chromium` sur Windows ou `webkit` sur macOS via `npx playwright install <browser>`.
3. `npm run build`; démarrer l'application localement sur le port 3205 et attendre HTTP 200 sur `/map?city=casablanca&district=maarif&layer=explore`.
4. Définir `NATIVE_READER=nvda` (Windows) ou `NATIVE_READER=voiceover` (macOS), `BASE_URL=http://127.0.0.1:3205`, et exécuter `npx playwright test --config scripts/audits/vivre-ici-native-screen-reader.config.mjs`. Captures, speech log et rapport sont stockés dans `artifacts/native-sr` ; ne pas afficher un PASS sans ces preuves. Le navigateur local n'est pas un déploiement Vercel.

**Gate complémentaire L1 distinct** : [L1 run #43578844675](https://github.com/hraaaaf/Akarfinder/actions/runs/43578844675) échoue seulement sur disponibilité externe Overpass (0/6 quartiers) après tests/tsc/build PASS. Conserver la politique fail-closed ; aucune donnée d'emprunt, aucun changement du seuil. Le screenshot-pass et ce gate ne doivent pas être fusionnés en un « ALL GREEN ».

**Next exact** : allumer/connecter une session de vrai contrôle distant sur Windows, puis lancer les scripts natifs au SHA de #1212 ; à défaut, garder le gate bloqué et passer à la prochaine action réellement autorisée dans le Lot 5.
