# C8D — Rabat Agenz live dry-run closeout

## Verdict

Le dry-run live borné **Agenz × Diour Jamaa** est certifié en lecture seule.

## Preuves exactes

- workflow : `C8D Rabat Agenz Live Dry Run` ;
- run : `31960247064` ;
- head exact : `871e61feef19769319d03820c38bdcc1739b7e2a` (`main`) ;
- job `contract` : SUCCESS ;
- job `live-dry-run` : SUCCESS ;
- artefact : `9267050182` ;
- digest : `sha256:35e9e2a94e5fedd084453a1111203616bc240a83f2343f2924786a58c0e5273b` ;
- mode : `read_only_audit` ;
- `productionWriteCount` : **0** ;
- source : `agenz.ma` ;
- localité : `diour-jamaa` ;
- limite demandée : **9** ;
- lignes source interrogées : **584** ;
- candidats détail : **9** ;
- pages récupérées : **9/9** ;
- `robotsSkipped` : **0** ;
- `failed` : **0** ;
- prix récupérable : **8/9** ;
- surface récupérable : **0/9** ;
- prix + surface récupérables : **0/9**.

## Conclusion produit

Le dry-run démontre que la récupération de **prix** sur les pages détail Agenz est techniquement viable sur cette cohorte bornée. Il ne démontre pas une récupération de **surface** suffisamment fiable : aucune surface n'a satisfait le contrat high-confidence JSON-LD.

Par conséquent :

- aucune métrique prix/m² candidate ne devient publiable ;
- aucune écriture DB prix/surface n'est autorisée par ce closeout ;
- aucune activation publique C8 n'est accordée ;
- le verrou principal C8D devient l'amélioration de la preuve de surface et la validation valeur par valeur avant toute mutation future.

Ce closeout ferme uniquement le **live dry-run read-only**. Il ne ferme pas C8 globalement.
