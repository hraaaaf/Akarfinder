# AkarFinder — tamis annonce par annonce V1 (12 octobre 2026)

**Goal** : empêcher le gel d'une fiche individuelle sans identité, carte complète cohérente, origine vérifiable, contrat source et contrôle des collisions. Chaque fiche reçoit un verdict et un diagnostic de correction **avant** tout snapshot candidat. Le but du gel ici est un **artifact offline de cartes observées**, pas la publication d'une offre fraîche.

## Chaîne exécutable

1. **Collecte brute immuable** : les neuf artifacts d'origine, avec SHA256 exact épinglé en CI. Ne jamais fabriquer un prix/quartier/surface manquant à partir d'une autre annonce ou d'un autre passage.
2. **Réconciliation ID source** : `mubawab.ma|a:1234`, `domio.ma|domio:1234`. Contradictions inter-runs quarantinées ; chaque carte complète porte `artifact_key + card_sha256` sur ses cinq données et URL, sans substitution HTML au moment du gel.
3. **Tamis individualisé** : `scripts/data/listing-tamis-v1.mjs` exécute pour **chaque ID** : provenance carte, URL HTTPS exacte, identité URL/source, 5 champs réalistes, absence de contradictions, règles de source (prix/location/vente et taille appartement Domio), ville route explicite Domio, collisions physiques suspectes, absence de fausse certification.
4. **Verdict et empreinte** : `candidate_snapshot_pass` produit un SHA256 stable calculé sur les champs et la provenance. Tous les autres vont dans `hold_parser_repair`, `hold_conflicting_sources`, `hold_physical_review` ou `reject_safety`. Ne fusionner aucune fiche physiquement par simple signature ville/quartier/prix/surface.
5. **Boucle parser** : le rapport `.tamis.json` donne les causes par portail et une `repair_priorities` triée par impact ; `.quarantine.jsonl` conserve les fiches rejetées pour créer ensuite fixtures HTML isolées et tests de régression. Après correction d'un adapter, rejouer les neuf artifacts inchangés : aucune régression des bons IDs, aucune ligne sortie du tamis sans preuves.
6. **Go-live indépendant** : preuve datée de fraîcheur, disponibilité commerciale et unicité physique réelle restent des gates séparés. Un candidat de snapshot **n'est jamais** une annonce commercialement disponible certifiée. Aucune DB/Vercel/merge autorisé par ce lot.

### Sorties workflow ledger

- `acquisition-ledger-v1.jsonl` : registre complet avec `complete_card_evidence` et `tamis` pour chaque ID.
- `acquisition-ledger-v1.tamis.json` : total examiné, verdicts, causes, ventilation par source et priorisation des réparations.
- `acquisition-ledger-v1.snapshot-candidates.jsonl` : **uniquement** les cartes ayant passé le tamis technique (aucune publication).
- `acquisition-ledger-v1.quarantine.jsonl` : cartes en défaut ou doublon suspect, sans suppression ni perte de matière première.

**Succès et preuve** : CI ledger exacte HEAD verte, test sur 9 745 IDs immuables, `passed+quarantine=9 745`, zéro candidat en quarantaine et aucune quarantaine glissée en candidats, zéro écriture DB et aucune promotion d'annonce fraîche. Les anciens chiffres 7 610 cartes 5/5 sont une borne de complétude, **pas** le nombre passant nécessairement le tamis.

**Next** : lire CI et artifact, identifier le premier défaut par source, réparer le parseur en reproduisant l'HTML fautif dans une fixture; mesurer gain net et non-régression, itérer par petits lots.
