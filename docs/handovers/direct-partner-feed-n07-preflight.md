# AkarFinder — N07, admission des flux partenaires directs (précontrôle offline)

**Goal :** alimenter AkarFinder en annonces fraîches légitimement transmises par agence ou promoteur, sans reproduire un crawl d'URL historiques. Le code existant parse déjà CSV/JSON/XML, stage les créations/mises à jour/retraits et construit PartnerListingV2. N07 ajoute le chaînon absent : **ne pas déclarer une fiche partenaire disponible et autorisée sur la seule base d'un fichier entrant**.

**Implémentation :** `lib/feeds/authorized-preflight.ts`, contrôle pur et sans IO de `stageFeed()` avant `validatedFeedRowToPartnerListingV2()`. Nécessite autorisation avec référence, évaluateur, période de validité, source exacte, monnaie MAD et sémantique de prix total vente/loyer mensuel ; requiert pour chaque fiche une preuve récente et unique de disponibilité émise par propriétaire ou agent mandaté, liée à l'identifiant externe, et une mise à jour source de moins de sept jours. Le domaine HTTPS exact, les droits image, quartier, prix, identité externe et doublons d'URL sont contrôlés. Les signaux de retrait vont dans une file de révision séparée.

**Statuts de sortie :** `candidate_v2_review`, `lifecycle_review`, `hold`. **Aucun ne vaut autorisation juridique vérifiée par l'exécuteur, ni disponibilité commerciale certifiée par AkarFinder** : le précontrôle prend des déclarations et preuves externes en paramètres, il ne peut pas en vérifier l'authenticité. Tous conservent `eligible_for_db=false`, `publishable=false` ; aucun DB write, HTTP, import ou déploiement.

**Preuves :** huit tests de refus/cas valides sur jeu synthétique et fixture de démonstration historique ; CI dédiée + non-régression des tests existants à vérifier. Aucun flux réel d'agence n'a encore été reçu. Le brouillon Gmail de contact Kaynly n'est pas un accord signé.

**Next exact :** qualifier le premier flux directement fourni par un partenaire, obtenir les preuves d'autorisation et de disponibilité, valider indépendamment un micro-lot puis relier au mécanisme de staging existant ; ne pas considérer le jeu synthétique comme inventaire. PR #1105 DRAFT, aucun déploiement Vercel.

## N07b — outil fichiers exécutable

`npx tsx scripts/data/partner-direct-feed-preflight.ts --feed agence.csv --authorization reviewed-authorization.json --receipts activity-receipts.json --as-of 2026-10-30T20:00:00Z --out .tmp/partner-review`

Accepte CSV/JSON/XML 5 Mo maximum, 20 000 lignes, avec dossier d'autorisation et accusés de disponibilité distincts du flux ; émet un récapitulatif avec SHA256 des trois inputs et `review-decisions.jsonl` sans titre, description, photo ni coordonnées. Ne certifie **jamais l'authenticité d'un accord sur la seule base du JSON fourni**. Les dossiers de démonstration et tests synthétiques ne sont pas des partenaires autorisés. Aucun DB, réseau ou déploiement.

Workflow dédié CI pour script et tests sur fichiers réels de fixture. Prérequis d'intégration en production : un véritable accord vérifié, preuves source datées, examen de déduplication physique et revue de sécurité. Toujours 0 annonce importée tant que ces preuves ne sont pas reçues.

## N07 closeout — two exact-head CI successes (30 October 2026)

- Authorization/freshness gate: GitHub Actions 41139079881, SUCCESS on `cc9d974f7583f524cbfdef23a3f4cf750d92b805` ; test step succeeded including 8 new tests and existing V2 bridge/direct feeds suites.
- Executable local file preflight: GitHub Actions 41139236097, SUCCESS on `56b038c9cdced439a31c1ff5190b6f0b0118d9df` ; npm install and integration tests on real fixture files succeeded. No data harvested from sources.
- External outreach preparation: 3 customized Gmail DRAFTS, not sent, for Promo Immo Marrakech, Atlas Immobilier and Aykana. Addresses independently found on their official sites. Previous Kaynly email is also only a draft; no authorization identified.
- Files and safeguards: direct CSV/JSON/XML + separate authorization and activity receipts -> SHA-256 evidence report + review decisions; zero DB writes, zero new fresh listings, zero publishing. The reviewed_allow flag and refs in an input JSON are still claims requiring independent legal/human verification. Test data is synthetic.
- PR #1105 stays DRAFT. No merge, DB, or Vercel. Current gate for actual growth: receive one real feed and independently verified agreement/availability receipts from an agency; process with the CLI, then independently dedup and confirm rights before any production admission.

Next: execute the first compliant 20-50 offer sample when received; do not credit the 338 FeenWay historical candidates or synthetic fixture records toward the 200K fresh target.