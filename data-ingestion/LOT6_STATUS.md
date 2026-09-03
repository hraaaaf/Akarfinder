# Lot 6 Status

**Status: 🟡 OPEN — chunked off-production crawl shakedown launched**

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
- minimum de candidats : 100 ;
- chunk JSONL : 50 annonces ;
- première passe : 50 ;
- reprise checkpoint jusqu'au nombre de candidats contrôlés ;
- délai inter-requêtes : 750 ms ;
- contexte discovery contradictoire sale/rent interdit tout fallback transactionnel ;
- zéro DB write ;
- zéro téléchargement image ;
- zéro ingestion AkarFinder.

Runner : `scripts/mubawab-crawl-lot6-shakedown.ts`

Workflow : `Data Ingestion Lot 6 Shakedown`

**État : gate CI lancé — preuve à inspecter avant tout élargissement.**

## Preuve attendue

- `manifest.json` global ;
- `coverage.json` ville × catégorie ;
- `checkpoint.json` ;
- `listings-0001.jsonl`, `listings-0002.jsonl`, ... ;
- `errors.jsonl` ;
- `proof.json` ;
- IDs source uniques ;
- compteurs explicite/contextuel/manquant ;
- conflits de contexte sale/rent ;
- route/detail mismatches ;
- reprise démontrée ;
- taille de chunk respectée.

## Succès Lot 6A

Le shakedown est valide si :

- toutes les routes prévues sont auditées ;
- le cap est respecté ;
- aucun source ID dupliqué n'est écrit ;
- les chunks font au plus 50 lignes ;
- la reprise ne refetch pas les IDs déjà traités ;
- les erreurs/rejets sont mesurés ;
- aucune écriture production n'a lieu.

Le détail échantillonné n'est pas encore revendiqué comme représentatif de toute la couverture Lot 6 ; l'équilibrage par scope sera imposé avant l'élargissement final si nécessaire.

## Lot 6 complet

Lot 6 ne sera CLOSED qu'après élargissement progressif vers les villes/catégories ciblées et production d'un manifest final de couverture.

## Interdictions inchangées

- zéro write production
- zéro ingestion AkarFinder
- zéro contournement anti-bot
- aucun merge automatique
- aucun déploiement Vercel
