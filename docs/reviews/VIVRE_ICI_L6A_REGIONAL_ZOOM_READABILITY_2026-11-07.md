# Vivre Ici — L6-A : lisibilité réelle des villes secondaires et détails de rue

**07/11/2026 — L6-A GREEN TECHNIQUE sur SHA code `44e2fd699726c24cb61d286b255824cc38eb36ec` ; QA visuelle globale encore ouverte.** Étape après le closeout L4-D, sur branche enfant de [PR #1191](https://github.com/hraaaaf/Akarfinder/pull/1191). Aucun merge/DB/Vercel.

## GOAL / SUCCESS / PROOF

- **Goal :** rendre réellement utile le zoom progressif : une ville secondaire sourcée doit **apparaître lisiblement dans le viewport** à l'échelle locale, et le contour municipal OSM doit s'effacer au profit des rues/quartiers sourcés aux grands zooms.
- **Succès :** 4 formats **390/430/768/1280** : sur `/map?layer=explore`, le nom **Kénitra** est **réellement rendu** par la couche `akarfinder-national-secondary-city-labels` quand la caméra est centrée sur le **centre réel** de Kénitra issu du V5 et passe à z8.6. Ne pas confondre « source présente » ou « couche active » avec « texte réellement visible » ; le test utilise `queryRenderedFeatures` avec le slug `kenitra`. Au zoom rue z12.2 dans la vue Mohammedia, les **contours municipaux** (ligne, remplissage, halo, couche secondaire) ont des expressions de fondu vers une opacité **0**, sans supprimer les points de quartiers/clics/recherche ni changer les données.
- **Preuve :** script N2 `scripts/audits/vivre-ici-l6a-regional-representation.mjs` sur quatre viewports ; 12 captures `before-national`, `after-secondary-kenitra`, `after-street-faded`, rapport JSON `l6a-regional/report.json` attendu `ok=true` et quatre cas `passed`. Les N2 historiques L4-A/B/C/D et N3 doivent rester verts au même SHA code, sans nouveau workflow lourd ni données fictives.

## BEFORE → référence → correction → AFTER

- **BEFORE réel :** [L4-D N2 #42423728463 SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/42423728463), code testé `59c263953081886c62db83c4b9bf0f7fa033b074`, artefact #13594501766. Les **16 captures inspectées** de quatre stades et quatre formats montrent que `regional-secondary` zoomait de 4.75 à 8.6 **sans changer le centre Maroc** : image presque vide, testant seulement la présence des couches. À Mohammedia z12.2, le contour **municipal** bleu et son grand remplissage dominent les rues. Score visuel local indicatif ~7/10, **pas** la note globale 9.5/10.
- **Référence :** région centrée sur une vraie ville secondaire (Kénitra) avec son **label visiblement rendu**, carte claire, sans surcharger la vue Maroc de villes secondaires et sans inventer un contour de quartier.
- **Code candidat :** les couches OSM de ville choisie `active-line`, `active-fill`, `focus-halo` et les lignes municipales de fond se fondent progressivement entre zoom 8 et ~11, pour être **nulles à zoom rue**. L'identité de la ville choisie reste indiquée par son nom, le panneau actif et le repère source (pas par un polygone municipal géant).
- **Test candidat :** lecture de `/api/geo/national-territories` → centre de Kénitra (pas de coordonnées codées en dur), `jumpTo({center,zoom:8.6})` sur l'unique MapLibre et attente de `queryRenderedFeatures` prouvant le label Kénitra **dans le viewport**. Pour Mohammedia z12.2, test des expressions d'opacité **explicitement décroissantes vers zéro**, captures AFTER et absence d'erreurs JS et d'overflow.

## Limites et gates

- Certifier un label visible pour Kénitra n'est pas certifier les **341 noms de villes**, ni la vérité de 4914 quartiers. Si le label n'apparaît pas ou est couvert, rendre **N2 rouge**, corriger la présentation réelle plutôt que supprimer le contrôle.
- Le fond peut montrer ses propres toponymes ; pas de suppression de logos ni d'attribution OSM/OpenFreeMap/CARTO.
- L6 global : a11y/smartphones, droits tuiles et score visuel ≥9.5/10 **restent ouverts**. L3 frontières quartiers/POI, L5 inventaire SQL/prix restent ouverts.
- Aucun merge / aucune mutation DB / aucun déploiement Vercel.

## CLOSEOUT — preuves réellement inspectées le 07/11/2026

- **Code certifié (avant mise à jour documentaire)** : `44e2fd699726c24cb61d286b255824cc38eb36ec`. [PR #1192](https://github.com/hraaaaf/Akarfinder/pull/1192) **Draft**, enfant de la branche L4-D, non fusionnée.
- **N2** [run #42424829540](https://github.com/hraaaaf/Akarfinder/actions/runs/42424829540) **SUCCESS** avec artefact [#13594439946](https://github.com/hraaaaf/Akarfinder/actions/runs/42424829540/artifacts/13594439946) réellement téléchargé, extrait, JSON ouverts et **12 PNG L6-A examinés**. Six rapports indépendants `ok=true`, `failure=null` : N2 historique **4/4**, L4-B1 **4/4**, L4-B huit villes **32/32** (17 choix), L4-C **4/4**, L4-D **4/4**, **L6-A 4/4**.
- **L6-A 390/430/768/1280** : `l6a-regional/report.json` `ok=true` ; 4 cas `passed`. V5 Kénitra `center={lng:-6.570169,lat:34.26457}`, `zoom=8.6`, `queryRenderedFeatures` trouve le **label kenitra dans le viewport** (1 feature à chaque largeur), **un seul canvas**, **overflow=0**. À Mohammedia `zoom=12.2` les quatre familles de contours municipaux passent le contrôle `municipalOutlinesFade=true`.
- **N3** [run #42424829523](https://github.com/hraaaaf/Akarfinder/actions/runs/42424829523) **SUCCESS**, [artefact #13594898192](https://github.com/hraaaaf/Akarfinder/actions/runs/42424829523/artifacts/13594898192) lu : `ok=true`, `failure=null` ; 390/1280, `maplibreReady=true`, navigation Casablanca→Maârif→`/search?city=Casablanca&district=Ma%C3%A2rif`, `searchRendered=true`, `overflow=0`. Même SHA code N2 et N3.
- **Revue visuelle humaine des 12 captures** : recadrage Kénitra nettement plus pertinent que BEFORE (ville source et son nom visibles) ; les forts contours municipaux bleus ne dominent plus le zoom rue. **Réserves** : fond de carte pâle, lecture des toponymes encore faible, vue Mohammedia rue 430 px particulièrement peu détaillée. **Score local indicatif ~8/10**, non égal à l'objectif global **≥9.5/10**. Aucun utilisateur réel ni conformité fournisseur certifiés par ces tests.
- **Périmètre / risque** : aucun changement de la base, des coordonnées, des annonces, de l'attribution ou des droits de tiers. Le test repositionne directement la caméra par `jumpTo` ; cela prouve le rendu de la couche, pas la découverte de cette ville par un utilisateur dans tous les parcours.
- **Statut L6-A : GREEN technique / conformité visuelle globale NON certifiée**. **Rester Draft et non mergé** ; aucun DB/Vercel. Toute modification documentaire postérieure au SHA certifié est **docs-only**, ne pas la confondre avec une nouvelle preuve N2/N3.

**NEXT EXACT :** L6-B — documenter ou obtenir clé CARTO et droits Esri applicables à l'usage commercial, puis audit attrib./a11y ; poursuivre l'amélioration de contraste du fond/labels et la lisibilité 430 px pour le seuil visuel final. L3 frontières/POI sourcés et L5 annonces SQL/prix continuent d'être des gates ; aucun merge ni déploiement.
