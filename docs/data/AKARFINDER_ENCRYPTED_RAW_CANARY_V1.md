# AkarFinder — première collecte RAW publique chiffrée (V1, 27 octobre 2026)

Objectif : confirmer une collecte réelle de **24 URLs publiques au maximum** sur six portails, dans un runner éphémère, sans stocker le RAW en clair dans GitHub et sans aucune écriture DB ni publication.

- Le collecteur `scripts/acquisition/public-raw-encrypted-canary-v1.mjs` vérifie chaque robots.txt et respecte l'accès par site. Un 401/403/429, CAPTCHA ou robots bloquant isole uniquement le site/chemin, les autres continuent. Aucune connexion authentifiée ni contournement.
- Le RAW est capturé en RAM et chiffré immédiatement **AES-256-GCM** avec clé aléatoire par page ; clé de session encapsulée avec une clé publique **RSA-OAEP-SHA256**. Seul le **public** `config/raw/akar_raw_public_2026-10-27.pem` est commité. **La clé privée ne doit jamais être committée ni envoyée à GitHub.**
- Le manifest contient URL, horodatage, empreinte SHA256 du plaintext et tailles ; les fichiers de l'artifact sont du ciphertext. Artifact GitHub expirant à 30 jours : **ni stockage durable ni pipeline 200K**.
- Tests QA hors réseau du chiffrement réversible, de la continuité après blocage et absence d'écriture DB. Le workflow se lance sur un commit de la branche `data/200k-fresh-parser-v2`, pas sur main ni par Vercel.
- Succès observable = CI tests verts + `summary.json` effectif + `encrypted > 0` si des sites permettent la collecte ; en cas de blocage global, annoncer **0 RAW** sans inventer.
- Suite : rapatrier l'artifact chiffré dans un stockage privé durable et confirmer la récupération des octets intacts, puis alimenter le pulper et versionner les moules en évitant le texte intégral dans le dépôt.

Important : cet artifact est sensible même chiffré ; accès limité au repo et rétention courte. Les pages sources peuvent contenir des données personnelles ou des contenus non réutilisables. Rien ne doit être admis dans une DB tant que fraîcheur, disponibilité, unicité et droits ne sont pas certifiés.

## First real canary — verified at 10:50 UTC on 27 October 2026

- [GitHub run 40491221477](https://github.com/hraaaaf/Akarfinder/actions/runs/40491221477) **SUCCESS**, 5/5 offline encryption and per-host tests, HTTP fetch step completed.
- **24 attempted; 1 original HTTP response captured, encrypted and verified; 23 not retained**. The only captured host was `www.feenway.com`, size **115 528 raw bytes**. Status breakdown: **4 robots_denied, 4 robots_unavailable, 1 HTTP 403, 14 skipped_host_blocked, 1 encrypted**. The affected host list was Sarouty, Masaken, Yakeey, Agenz, Avito; four Mubawab page URLs explicitly disallowed by robots.
- [Artifact 12729082396](https://github.com/hraaaaf/Akarfinder/actions/runs/40491221477/artifacts/12729082396), **118 350 bytes**, expires **2026-11-26 10:49 UTC**, SHA256 ZIP `5c0afc9221606bffd5ce91ee1ac8667a1527b92dc202eacfda9d5e2ddf809d1e` confirmed. Artifact downloaded to an isolated local runtime. The **one** encrypted page was decrypted in memory using the private key held outside GitHub; AES-GCM tag and SHA256 of all **115 528** bytes checked, no plaintext uploaded to GitHub.
- **No DB writes, no production publications.** CI success proves the capture/crypto flow, not 24 successful acquisitions or freshness/publication rights.
- Scale-up: [run 40491752624](https://github.com/hraaaaf/Akarfinder/actions/runs/40491752624) for **40 FeenWay public listing pages**, initialized QUEUED from commit `7c328e407a7816dd022bcc1ade15c001bf814c6c`. Verify exact `encrypted` count/artifact before claiming success.
- The GitHub 30-day encrypted artifact is a short-lived transport mechanism, **not durable storage for 200K RAW**. Next critical infrastructure gate: long-lived encrypted object store with lifecycle/privacy controls; preserve source permissions per host, advance mold/pulper separately, and admit into DB only demonstrably fresh and qualified listings.
