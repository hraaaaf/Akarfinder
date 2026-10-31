# MarocImmo — diagnostic de 12 fiches individuelles, 2026-10-12

**Preuve source** : sitemap HTTP 200 (run GitHub 38267638287, artifact 11754714444), 3 936 URL publiques en quatre langues, dont **517 URL françaises de fiches distinctes** sous `/fr/annonces/{slug}-{id}`. Le précédent détecteur `/fr/vente/...` ne reconnaissait pas ce format réel. Les 517 sont des liens d'annonces, pas 517 offres fraîches et disponibles.

**Goal** : adapter le parseur MarocImmo à son vrai format source et inspecter au plus **12 pages détails primaires** sélectionnées de façon stable par hash d'ID. Respect du robots.txt avec UA identifié, 1,8 seconde entre requêtes, stop HTTP403/429, aucun accès aux données privées, aucun DB, aucune copie HTML brute ou coordonnées d'annonceur.

**Méthode** : ne retenir un champ structuré JSON-LD que si le noeud `RealEstateListing`/type équivalent porte exactement l'URL de la fiche étudiée. Prix MAD explicitement balisé `offers.priceCurrency=MAD`, surface MTK, ville `addressLocality`, quartier `neighborhood`. Pas de récupération globale de mots contenus dans les annonces voisines; aucun `district` inféré d'un nom de ville, d'une URL ou d'un titre. Sans noeud principal fiable, état `unverified` et queue d'amélioration. 4 champs + ID URL ne certifient pas disponibilité, fraîcheur, unicité physique ou transaction.

**Sorties** : `marocimmo-detail-evidence-v1.json` avec stats/états, `.jsonl` pour chaque fiche, sans contacts. Tests offline de non-fusion du noeud JSONLD d'une autre fiche. CI sur HEAD nécessaire avant conclusion et intégration éventuelle à la sortie `listing-tamis-v1`. Aucun gel ni nouveau compte certifié avant ce contrôle.

**Prochain lot** : classer chaque échec de la canari et enrichir seulement le parseur MarocImmo sur un cas HTML vérifié, avec fixture et non-régression.


## Preuves sur 12 vrais détails MarocImmo

Run [38268370624](https://github.com/hraaaaf/Akarfinder/actions/runs/38268370624) SUCCESS, artifact 11756230662 : 12/12 pages individuelles HTTP200 et même URL principale en JSON-LD ; 12 prix MAD structurés, 0 surface/ville/quartier réunis en JSON-LD strict, donc **0 nouveau cinq-champs publiable**. Diagnostic de schéma [38269150499](https://github.com/hraaaaf/Akarfinder/actions/runs/38269150499) SUCCESS, artifact 11755897965 : les 12 noeuds ont @context, @type, datePosted, description, image, mainEntity, name, offers, url ; ils n'ont ni address ni floorSize de premier niveau, et **11/12 descriptions contiennent une surface explicitement libellée**. Correctif de parsing isolé dans la description du seul noeud principal, avec rejet des valeurs multiples/fourchettes/prix au m²; CI de ce correctif à inspecter avant affirmation de rendement. Le nombre de fiches en sitemap est 517, non certifié frais, unique ni disponible.
