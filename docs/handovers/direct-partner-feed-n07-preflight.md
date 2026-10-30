# AkarFinder — N07, admission des flux partenaires directs (précontrôle offline)

**Goal :** alimenter AkarFinder en annonces fraîches légitimement transmises par agence ou promoteur, sans reproduire un crawl d'URL historiques. Le code existant parse déjà CSV/JSON/XML, stage les créations/mises à jour/retraits et construit PartnerListingV2. N07 ajoute le chaînon absent : **ne pas déclarer une fiche partenaire disponible et autorisée sur la seule base d'un fichier entrant**.

**Implémentation :** `lib/feeds/authorized-preflight.ts`, contrôle pur et sans IO de `stageFeed()` avant `validatedFeedRowToPartnerListingV2()`. Nécessite autorisation avec référence, évaluateur, période de validité, source exacte, monnaie MAD et sémantique de prix total vente/loyer mensuel ; requiert pour chaque fiche une preuve récente et unique de disponibilité émise par propriétaire ou agent mandaté, liée à l'identifiant externe, et une mise à jour source de moins de sept jours. Le domaine HTTPS exact, les droits image, quartier, prix, identité externe et doublons d'URL sont contrôlés. Les signaux de retrait vont dans une file de révision séparée.

**Statuts de sortie :** `candidate_v2_review`, `lifecycle_review`, `hold`. **Aucun ne vaut autorisation juridique vérifiée par l'exécuteur, ni disponibilité commerciale certifiée par AkarFinder** : le précontrôle prend des déclarations et preuves externes en paramètres, il ne peut pas en vérifier l'authenticité. Tous conservent `eligible_for_db=false`, `publishable=false` ; aucun DB write, HTTP, import ou déploiement.

**Preuves :** huit tests de refus/cas valides sur jeu synthétique et fixture de démonstration historique ; CI dédiée + non-régression des tests existants à vérifier. Aucun flux réel d'agence n'a encore été reçu. Le brouillon Gmail de contact Kaynly n'est pas un accord signé.

**Next exact :** qualifier le premier flux directement fourni par un partenaire, obtenir les preuves d'autorisation et de disponibilité, valider indépendamment un micro-lot puis relier au mécanisme de staging existant ; ne pas considérer le jeu synthétique comme inventaire. PR #1105 DRAFT, aucun déploiement Vercel.
