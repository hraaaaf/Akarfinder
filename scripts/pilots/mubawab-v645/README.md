# Scraper Mubawab V6.4.5 — 3 pages de recherche, pilote supervisé

La V6.4.4 avait un défaut : `--pages N` (N>1) créait `:p:N` interdit par le robots.txt actuel de Mubawab. V6.4.5 bloque ce chemin et autorise uniquement `--urls-file` avec 1 à 3 URLs HTTPS `/fr/(st|sd|cd)/...` validées, sans query, colon, redirection vers un autre domaine ni login.

**Canary réel prévu :** Rabat appartements à vendre (ancienne page validée), Casablanca Maârif appartements à vendre et Agadir Hay Salam appartements à vendre (URLs réellement observées dans le run GitHub #33663293707, mais datant de septembre 2026). Les résultats actuels sont **inconnus avant le nouveau run**. Chaque page doit passer les garde-fous de prix, surface, localité et qualité.

**Conservation de l'état :** restaure et vérifie SHA-256 de la base du run #41315575782 (32 annonces). Le flag review_low 8441628 ne doit pas disparaître. Réécrit la SQLite dans un artefact **seulement si les trois pages passent**.

**Données :** objets JSON/Markdown et SQLite sur runner uniquement. Aucune écriture Supabase/Neon/Akarfinder, aucun merge, aucune programmation automatique.

**Limite :** 3 pages n'est pas une stratégie 200k. Cette expérimentation teste l'extraction réelle inter-villes, avant toute extension. Un chemin techniquement non interdit par robots.txt ne constitue pas à lui seul une licence de réutilisation commerciale.

**Tests :** 95 régressions historiques (locaux) + 7 nouveaux tests de validation des URLs. Pour tout résultat partiel : analyser `mubawab-v645-multishard-diagnostics`, ne pas publier ni compter les annonces rejetées.
