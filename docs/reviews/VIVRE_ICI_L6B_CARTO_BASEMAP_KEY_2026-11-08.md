# Vivre Ici — L6-B : configuration CARTO sans clé dans Git

**08/11/2026 — CANDIDAT (non certifié en navigateur avec CARTO).** Branche `feat/vivre-ici-l6b-carto-key-20261108` empilée sur L6-A #1192. Aucune mutation DB, aucun merge, aucun déploiement Vercel.

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

**Next exact :** vérifier CI N2/N3 et tests, inspecter les nouvelles captures de repli, faire la QA CARTO véritable en environnement contrôlé **sans déploiement Vercel non autorisé**, confirmer Referer et droits Esri. Pas de merge tant que l'intégration et les conditions commerciales ne sont pas certifiées.


## CI policy corrigée sans neutraliser de contrôle

Le premier candidat `b8431e4` a reçu un contrôle **CI Workflow Efficiency Policy FAILURE** ([#42430277910](https://github.com/hraaaaf/Akarfinder/actions/runs/42430277910)) : le validator applique une règle contre les workflows lourds modifiés et déclenchés sur PR ; il rejetait la modification du workflow N2 existant. **Correction** : rétablir exactement le fichier workflow N2 de la branche parente, déclencher le test unitaire depuis `scripts/audits/carte-national-neighborhoods-n2.mjs` déjà exécuté au sein de N2. Le test n'est ni supprimé ni assoupli. Nouvelle CI requise sur le SHA de correction ; aucun résultat de réussite encore déclaré.
