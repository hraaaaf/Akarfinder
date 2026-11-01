# Akarfinder V6.4.6 — Rapport d'audit et closeout technique

**Statut : OFFLINE SAFETY GREEN / LIVE AND SCALE NOT CERTIFIED**

**Goal** : sécuriser le scraper suite à la revue Claude sans réécrire le parseur ni écrire dans la base Akarfinder.

**Résultat** : guard de sources vente uniquement, contrôle robots dynamique SHA256 avant toute extraction, migration locale `source_search_url` + `transaction_type`, pas de mélange rent/sale dans les comparables, redirections refusées.

**Preuves :** tests locaux 116/116 PASS, CI GitHub [#41335423592](https://github.com/hraaaaf/Akarfinder/actions/runs/41335423592) 19/19 PASS sur [commit b9c7d4e3](https://github.com/hraaaaf/Akarfinder/commit/b9c7d4e3474866fffb6bf10625c9413a2f997626). Tests de restauration sur copie des 97 lignes du run live V6.4.5, prix review `8441628` préservé. La version distribuée ZIP contient diagnostics et SQLite de V6.4.5.

**Note** : la revue Claude avait raison sur la traçabilité et l'absence des preuves dans le ZIP ; elle ne remettait pas en cause la cohérence du code au commit live (blob identique).

**Aucune nouvelle exécution en ligne.** Le site interdit l'extraction à grande échelle en usage commercial dans ses CGU ; aucune permission n'est impliquée par la réussite des tests du guard. La source PDF n'est pas impliquée ici.

**Prochaine étape** : sur un canal licite, relever compteur annoncé par shard, troncature, vitesse utile et doublons ; ne pas promettre 200k en 48h. Aucune écriture DB ou déploiement Vercel.

Fichier de reprise primaire : `docs/handovers/AKARFINDER_200K_48H_SOURCE_SCALE_2026-11-01.md`.
