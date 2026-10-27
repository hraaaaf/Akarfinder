# AkarFinder — première collecte RAW publique chiffrée (V1, 27 octobre 2026)

Objectif : confirmer une collecte réelle de **24 URLs publiques au maximum** sur six portails, dans un runner éphémère, sans stocker le RAW en clair dans GitHub et sans aucune écriture DB ni publication.

- Le collecteur `scripts/acquisition/public-raw-encrypted-canary-v1.mjs` vérifie chaque robots.txt et respecte l'accès par site. Un 401/403/429, CAPTCHA ou robots bloquant isole uniquement le site/chemin, les autres continuent. Aucune connexion authentifiée ni contournement.
- Le RAW est capturé en RAM et chiffré immédiatement **AES-256-GCM** avec clé aléatoire par page ; clé de session encapsulée avec une clé publique **RSA-OAEP-SHA256**. Seul le **public** `config/raw/akar_raw_public_2026-10-27.pem` est commité. **La clé privée ne doit jamais être committée ni envoyée à GitHub.**
- Le manifest contient URL, horodatage, empreinte SHA256 du plaintext et tailles ; les fichiers de l'artifact sont du ciphertext. Artifact GitHub expirant à 30 jours : **ni stockage durable ni pipeline 200K**.
- Tests QA hors réseau du chiffrement réversible, de la continuité après blocage et absence d'écriture DB. Le workflow se lance sur un commit de la branche `data/200k-fresh-parser-v2`, pas sur main ni par Vercel.
- Succès observable = CI tests verts + `summary.json` effectif + `encrypted > 0` si des sites permettent la collecte ; en cas de blocage global, annoncer **0 RAW** sans inventer.
- Suite : rapatrier l'artifact chiffré dans un stockage privé durable et confirmer la récupération des octets intacts, puis alimenter le pulper et versionner les moules en évitant le texte intégral dans le dépôt.

Important : cet artifact est sensible même chiffré ; accès limité au repo et rétention courte. Les pages sources peuvent contenir des données personnelles ou des contenus non réutilisables. Rien ne doit être admis dans une DB tant que fraîcheur, disponibilité, unicité et droits ne sont pas certifiés.
