# MarocImmo — diagnostic de 12 fiches individuelles, 2026-10-12

**Preuve source** : sitemap HTTP 200 (run GitHub 38267638287, artifact 11754714444), 3 936 URL publiques en quatre langues, dont **517 URL françaises de fiches distinctes** sous `/fr/annonces/{slug}-{id}`. Le précédent détecteur `/fr/vente/...` ne reconnaissait pas ce format réel. Les 517 sont des liens d'annonces, pas 517 offres fraîches et disponibles.

**Goal** : adapter le parseur MarocImmo à son vrai format source et inspecter au plus **12 pages détails primaires** sélectionnées de façon stable par hash d'ID. Respect du robots.txt avec UA identifié, 1,8 seconde entre requêtes, stop HTTP403/429, aucun accès aux données privées, aucun DB, aucune copie HTML brute ou coordonnées d'annonceur.

**Méthode** : ne retenir un champ structuré JSON-LD que si le noeud `RealEstateListing`/type équivalent porte exactement l'URL de la fiche étudiée. Prix MAD explicitement balisé `offers.priceCurrency=MAD`, surface MTK, ville `addressLocality`, quartier `neighborhood`. Pas de récupération globale de mots contenus dans les annonces voisines; aucun `district` inféré d'un nom de ville, d'une URL ou d'un titre. Sans noeud principal fiable, état `unverified` et queue d'amélioration. 4 champs + ID URL ne certifient pas disponibilité, fraîcheur, unicité physique ou transaction.

**Sorties** : `marocimmo-detail-evidence-v1.json` avec stats/états, `.jsonl` pour chaque fiche, sans contacts. Tests offline de non-fusion du noeud JSONLD d'une autre fiche. CI sur HEAD nécessaire avant conclusion et intégration éventuelle à la sortie `listing-tamis-v1`. Aucun gel ni nouveau compte certifié avant ce contrôle.

**Prochain lot** : classer chaque échec de la canari et enrichir seulement le parseur MarocImmo sur un cas HTML vérifié, avec fixture et non-régression.
