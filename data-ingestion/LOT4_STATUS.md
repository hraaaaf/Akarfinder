# Lot 4 Status

**Status: 🟡 OPEN — controlled rehearsal**

## Goal

Valider le comportement du crawl pilote Mubawab sur un périmètre volontairement limité avant tout volume canonique 100–500 et avant toute ingestion AkarFinder.

## Lot 4A rehearsal

Périmètre strict :

- source : Mubawab
- ville : Casablanca
- catégorie de discovery : `apartment_sale`
- pages de discovery max : 2
- détails max : 40
- délai inter-requêtes détail : 750 ms
- première passe : 15 détails max
- deuxième passe : reprise depuis checkpoint

## Preuves attendues

- pagination > 1 page
- compteurs discovery
- doublons mesurés
- manifest conforme au contrat conceptuel du run
- checkpoint persistant dans l’artefact
- deuxième passe sans refetch des source IDs déjà traités
- erreurs enregistrées
- arrêt immédiat sur robots disallow / 403 / 429
- extraction vers `CollectionListing`
- annonces non suffisamment déterminées comptées comme rejected, jamais complétées par la catégorie de discovery
- `database_writes = 0`
- `image_downloads = 0`
- `mass_ingestion = false`

## Limite volontaire

Ce rehearsal à 40 détails maximum **ne ferme pas à lui seul Lot 4** si le canonique exige ensuite un pilote 100–500.

Il sert à valider les mécanismes de pagination, reprise, compteurs, erreurs et sécurité avant d’augmenter prudemment le périmètre.

## Interdictions inchangées

- aucune DB production
- aucune ingestion AkarFinder
- aucune collecte massive
- aucun contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
