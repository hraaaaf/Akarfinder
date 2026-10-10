# AkarFinder — Canary Discovery des paginations publiques (10 octobre 2026)

**Goal** : détecter si des pages de catégorie Mubawab déjà certifiées exposent de **véritables liens paginés** exploitables, sans inventer d'URLs. Entrées : quatre pages catégorie publiques reprises du run `38047432831` (villas Fès, commerces Kénitra, maisons Tétouan, terrains Nador). Ces quatre *catégories* ont été observées HTTP200 dans la matrice ; la présence de pagination ne doit pas être supposée.

**Méthode** : inspection seulement des ancres HTML `a[href]` exactes du même hôte/catégorie (query `?page=N`, chemin `:p:N` ou `/page/N`, de 2 à 200) ; robots fail-closed pour pages catégories **et** candidats, UA identifié, 1,8 s minimum entre requêtes, arrêt 403/429, maximum quatre catégories, **aucune requête de pagination ou détail**, aucune DB. Un candidat est une *URL réellement liée*, pas une annonce ni la preuve que sa route serait visitable/commercialement exploitable.

**Preuves attendues** : `linked-pagination-canary-v1.json` rapporte pages 200, nombre de liens et état robots ; `.jsonl` contient uniquement URL/catégorie/type/page autorisés et `visited:false`. Nouvelle CI exact HEAD obligatoire avant de proclamer un rendement. Si 0 lien, ne pas inventer de suite de pages ni tenter de contournement; pivoter vers découvertes autorisées de nouveaux portails/villes.

**Next** : classer les liens source exacts après la CI, choisir un petit lot d'essai read-only des liens permis, mesurer son rendement marginal vs les 9 745 IDs source et maintenir la certification vendeur/physique/droits séparée.


## Résultat du premier canari et pivot

Le run [38071017861](https://github.com/hraaaaf/Akarfinder/actions/runs/38071017861) ✅, artifact 11676876747 inspecté, a observé **4/4 pages HTML et 0 lien de pagination classé permis**, sans blocage robots, ni lecture de page 2/détail/DB. Ces quatre pages ne justifient donc pas une expansion par pagination construite ; ceci **n'exclut pas** d'autres paginations ailleurs.

Extension indépendante du même canari : extraire les liens `/fr/st/` de catégorie/type **présents dans les ancres HTML** via le parseur existant `extractFrontierCategories`, valider host exact, absence de paramètres, ville connue et robots, sans suivre ces liens. Sortie additionnelle `linked-type-categories-v1.jsonl`. Résultat réel à établir uniquement après la nouvelle CI.
