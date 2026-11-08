# Vivre Ici — L6-B : configuration CARTO sans clé dans Git

**08/11/2026 — GREEN technique de configuration/fallback au code `c0ea82f512d962821b877012956f9932af088a6e`, MAIS affichage CARTO avec clé et conformité commerciale NON certifiés.** Branche `feat/vivre-ici-l6b-carto-key-20261108` empilée sur L6-A #1192. Aucune mutation DB, aucun merge, aucun déploiement Vercel.

## GOAL / SUCCESS / PROOF

- **Goal :** fournir des fonds CARTO vectoriels officiels (Voyager clair, Dark Matter sombre) avec clé valide, attribution `© OpenStreetMap contributors, © CARTO`, sans stocker de clé dans le dépôt.
- **Configuration réelle** : variable `NEXT_PUBLIC_CARTO_BASEMAP_API_KEY` créée dans Vercel projet `akarfinder` pour **Preview/Production**, de type `sensitive`. La valeur secrète n'est jamais reproduite dans ce fichier. Aucune compilation/déploiement Vercel lancé. Les valeurs `NEXT_PUBLIC_` sont **nécessairement visibles dans le navigateur** une fois l'application compilée ; la protection pertinente est la restriction des référents/hostnames CARTO.
- **Code** : `lib/map/carto-basemap-style.ts` choisit le style MapLibre vectoriel avec `?key=` (URL-encodé) si la variable est non vide, sinon utilise OpenFreeMap Liberty dans les deux thèmes (aucune requête CARTO sans clé). Le composant national réutilise la même configuration pour l'initialisation et les changements de thème. Attribution correspond au fournisseur actif. Pas de changement de données V5.
- **Validation attendue** : TypeScript + build + N2/N3 sur code SHA exact et test `node --import tsx --test scripts/scrapers/__tests__/carto-basemap-style.test.ts` déclenché par le script N2 existant, sans toucher au workflow PR lourd. Le test unitaire vérifie les deux URL, l'échappement, les attributions et le fallback sans vraie clé ; **la CI sans variable ne prouve pas l'affichage réel CARTO avec la clé client**.
- **Gate humain** : dans [CARTO dashboard](https://dashboard.basemaps.carto.com/) limiter le **Referer** aux domaines exacts d'Akarfinder utilisés, dont `akarfinder.vercel.app` ; les domaines Preview et `localhost` peuvent nécessiter une clé distincte. Surveiller le quota commercial (1 M requêtes tuiles/mois gratuites d'après CARTO) et l'attribution visible.
- **Droits séparés non résolus** : les tuiles satellite Esri (`World_Imagery`) restent sur d'autres composants sans preuve contractuelle d'usage commercial ; CARTO ne couvre pas Esri. Exiger une licence adaptée ou retirer/remplacer cet usage avant release.
- **Conformité a11y / visual 9.5/10** : toujours ouvertes. Aucun fond CARTO n'est prétendu visuellement validé avant captures réelles sur 390/430/768/1280, thèmes clair/sombre.

## Preuves / suite

- [CARTO officielle : obtenir une clé et règles d'attribution](https://carto.com/basemaps/apikey/)
- [CARTO officielle : restrictions des clés](https://dashboard.basemaps.carto.com/)
- [CARTO styles vectoriels officiels](https://github.com/CartoDB/basemap-styles)

**Next exact :** restreindre la clé dans CARTO (Referer/domains), obtenir la preuve commerciale Esri ou désactiver l'imagerie, puis QA CARTO réel sur 4 tailles × 2 thèmes sous environnement expressément autorisé. Aucun merge ni déploiement.


## CI policy corrigée sans neutraliser de contrôle

Le premier candidat `b8431e4` a reçu un contrôle **CI Workflow Efficiency Policy FAILURE** ([#42430277910](https://github.com/hraaaaf/Akarfinder/actions/runs/42430277910)) : le validator applique une règle contre les workflows lourds modifiés et déclenchés sur PR ; il rejetait la modification du workflow N2 existant. **Correction** : rétablir exactement le fichier workflow N2 de la branche parente, déclencher le test unitaire depuis `scripts/audits/carte-national-neighborhoods-n2.mjs` déjà exécuté au sein de N2. Le test n'est ni supprimé ni assoupli. Les runs N2/N3 du SHA de correction sont désormais SUCCESS et les artefacts/12 captures ont été inspectés (voir closeout ci-dessous).


## CLOSEOUT technique — contrôle des preuves du 08/11/2026

**SHA de code CERTIFIÉ** : `c0ea82f512d962821b877012956f9932af088a6e` ([PR #1193 Draft](https://github.com/hraaaaf/Akarfinder/pull/1193)). Ces résultats **ne** portent **pas** sur un style CARTO servi avec la clé : les jobs GitHub n'ont pas de `NEXT_PUBLIC_CARTO_BASEMAP_API_KEY` et ont exercé le **repli OpenFreeMap**.

- **N2** [#42430483506 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42430483506) ; [artefact #13597387998](https://github.com/hraaaaf/Akarfinder/actions/runs/42430483506/artifacts/13597387998) téléchargé/extrait (**147 fichiers, 141 PNG, six JSON**). Les six rapports `ok=true`, `failure=null` : historique **4/4**, L4-B1 **4/4**, huit villes **32/32** et 17 sélections, L4-C **4/4**, L4-D **4/4**, L6-A **4/4**, sur 390/430/768/1280. Kénitra source V5 réellement visible par `queryRenderedFeatures` ; fade municipal au niveau rue à z12.2 ; aucun overflow signalé. **12 images** du parcours Maroc/Kénitra/Mohammedia ouvertes et montées (montage disponible en conversation).
- **Test unitaire CARTO dans N2 réellement exécuté** : **2/2 PASS** dans les logs N2 : URLs vectorielles Voyager et Dark Matter, attributions, encodage de clé, repli sans clé évitant tout appel CARTO non authentifié. TypeScript et build N2 passés. Les deux tests n'utilisent **pas** la clé réelle.
- **N3** [#42430483427 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42430483427) ; [artefact #13596882962](https://github.com/hraaaaf/Akarfinder/actions/runs/42430483427/artifacts/13596882962) téléchargé/extrait : `report.json ok=true, failure=null` et parcours Casablanca→Maârif→Search sur 390/1280, `maplibreReady=true`, `searchRendered=true`, `overflow=0`.
- **Quatre workflows annexes RED au même SHA, ne pas masquer** : C7 #42430483486 `waitForResponse` market intelligence timeout (logs comportent `[db] neon is not configured`) ; Zillow UI #42430483534 ancien sélecteur `[data-premium-map]` introuvable ; multi-city #42430483468 tuiles zoom élevé Fès indisponibles sous 20 s ; Market Synthetic #42430483493 ancien `[data-akarfinder-market-intelligence-map]` introuvable (logs mentionnent aussi variables Supabase absentes). Trois familles (C7/Zillow/Market Synthetic) étaient déjà RED sur le SHA parent `328decb2` ; l'échec multi-city est observé sur cette PR, sa causalité avec CARTO est **non établie**. **Suite de release non GREEN**, même si les gates ciblés N2/N3 sont verts.
- **Sécurité/config** : variable Vercel `NEXT_PUBLIC_CARTO_BASEMAP_API_KEY` `sensitive` déclarée pour Preview/Production, non publiée dans Git ; son contenu sera publiquement observable dans le navigateur à l'usage (clé API navigateur et non secret serveur). Exiger restriction Referer CARTO + suivi quota. Aucune preuve de configuration Referer, aucune requête réussie vers CARTO réelle, aucun bilan visuel après bascule ni preuve de licence satellite Esri.
- **Statut** : L6-B sous-tâche **configuration carto + fallback : GREEN technique**, **conformité fournisseur/affichage CARTO/UX final : OUVERTS**. Aucun merge, aucune DB, aucun déploiement Vercel.

**NEXT EXACT / gate humain :** définir dans le dashboard CARTO les domaines/Referer autorisés pour cette clé ; pour Esri obtenir le droit commercial documenté ou retirer la fonction satellite. Puis autoriser explicitement un environnement Vercel Preview (si souhaité) afin de vérifier réellement les 8 images CARTO clair/sombre × 4 tailles, et traiter les quatre workflows annexes selon leurs périmètres. **Ne pas inventer 9,5/10** ni pourcentage global.
