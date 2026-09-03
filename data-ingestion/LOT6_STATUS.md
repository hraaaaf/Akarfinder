# Lot 6 Status

**Status: 🟡 OPEN — chunked off-production crawl shakedown**

## Goal

Produire un dataset Mubawab large, chunké, reprenable et auditable sans l'injecter dans AkarFinder.

## Doctrine d'exécution

Le passage Lot 4/5 est prouvé, mais le crawl large reste progressif :

1. shakedown multi-ville / multi-transaction contrôlé ;
2. validation chunks + checkpoint + coverage ;
3. élargissement graduel ;
4. seulement ensuite, couverture complète ciblée.

Aucun contournement anti-bot. Arrêt immédiat sur robots disallow / HTTP 403 / HTTP 429.

## Lot 6A — shakedown

Périmètre initial :

- villes : Casablanca, Rabat ;
- catégories : `apartment_sale`, `apartment_rent` ;
- pages discovery max par combinaison : 2 ;
- détails max : 200 ;
- chunk JSONL : 50 annonces ;
- première passe : 50 ;
- reprise checkpoint jusqu'au cap ;
- délai inter-requêtes : 750 ms ;
- zéro DB write ;
- zéro téléchargement image ;
- zéro ingestion AkarFinder.

## Preuve attendue

- `manifest.json` global ;
- `coverage.json` ville × catégorie ;
- `checkpoint.json` ;
- `listings-0001.jsonl`, `listings-0002.jsonl`, ... ;
- `errors.jsonl` ;
- `proof.json` ;
- IDs source uniques ;
- compteurs explicite/contextuel/manquant ;
- route/detail mismatches ;
- reprise démontrée ;
- taille de chunk respectée.

## Succès Lot 6A

Le shakedown est valide si :

- toutes les routes prévues sont auditées ;
- le cap est respecté ;
- aucun source ID dupliqué n'est écrit ;
- les chunks sont déterministes ;
- la reprise ne refetch pas les IDs déjà traités ;
- les erreurs/rejets sont mesurés ;
- aucune écriture production n'a lieu.

## Lot 6 complet

Lot 6 ne sera CLOSED qu'après élargissement progressif vers les villes/catégories ciblées et production d'un manifest final de couverture.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- zéro contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
