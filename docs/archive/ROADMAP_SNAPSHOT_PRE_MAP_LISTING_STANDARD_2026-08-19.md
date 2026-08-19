# Roadmap — pointeur snapshot avant Map + Listing Standard

Le ledger canonique détaillé précédent est conservé intégralement dans Git.

- dernier commit avant le chantier : `49b80c4c1deffb1f1999f91412b5092151ac63c5` ;
- blob exact de `docs/ROADMAP.md` : `f097e0396a1a38e339aeb8868900779ac9a87182` ;
- taille observée : 74 510 octets.

Ce pointeur évite de recopier dans la roadmap active des centaines de lignes de closeouts historiques tout en gardant leur récupération exacte et vérifiable.

Aucune décision historique n’est annulée par la compaction. Les closeouts canoniques dédiés restent également présents sous `docs/`.
