# J18-I — Quota Redis distribué, candidat hors production (mise à jour 2026-11-11)

## Goal / Success / Proof

Goal : préparer sans publier un quota atomique distribué pour l'éventuelle route de repères indicatifs Vivre Ici, tout en maintenant le verrou de diffusion J18-H.

**Succès vérifié pour le moteur de quota** : la réservation atomique est validée avec trois processus indépendants, d'abord Redis OSS, puis transport HTTP local, puis **Upstash REST HTTPS réel + flag Lua allow-key-locking**. Cela ne signifie ni publication autorisée, ni sécurité réseau/identité intégrée, ni capacité production certifiée.

- [Run Redis OSS réel #43002160137](https://github.com/hraaaaf/engineering-governance/actions/runs/43002160137) SUCCESS, 36 réservations simultanées : 20 acceptées/16 rejetées, TTL, isolation, coût pondéré.
- [Run Redis OSS + HTTP local #43011957419](https://github.com/hraaaaf/engineering-governance/actions/runs/43011957419) SUCCESS, 3 processus Node, 20/16, ZCARD=20, TTL=61 786 ms, fail-closed.
- [Run Upstash réel #43033841210](https://github.com/hraaaaf/engineering-governance/actions/runs/43033841210) **SUCCESS** : base Upstash Redis gratuite éphémère (suppression automatique après 72 h), 36 appels HTTPS depuis trois processus Node, 20/16, refus après quota, indépendance des identités, ZCARD=20, TTL conforme ; exécution non modifiée de l'adaptateur REST et de la première ligne Lua `#!lua flags=allow-key-locking`. Jeton, URL et ID masqués dans les logs, aucune donnée client, aucun secret de production. Vérification des logs du job #130567420577.
- [Run indépendant Redis OSS + HTTP #43033840889](https://github.com/hraaaaf/engineering-governance/actions/runs/43033840889) SUCCESS sur le même HEAD de laboratoire.
- Tests Node du pack 12/12 PASS en environnement isolé après ajout de la copie exacte de la route J18-H du HEAD d'origine ; sans cette route (pack partiel), 11/12 passent et le dernier échoue par ENOENT, pas par dysfonctionnement produit. Live-run sans credentials retourne exit 2, fail-closed.

**Contrat** : `scripts/neighborhood-context/j18-distributed-redis-quota.mjs`, fenêtre glissante par acteur (TIME serveur Redis, ZCOUNT, ZREMRANGEBYSCORE, ZADD NX, PEXPIRE), un EVAL par réservation, clé acteur SHA256, borne timeout, refus explicite. Le composant consommateur J18-H doit utiliser une identité de confiance, jamais un X-Forwarded-For librement fourni. Source Lua SHA256 `ca18124342c615253b72672b09fe072c13fd62da67216c859548f1bf550075c0`; blob de l'adaptateur `356eee6858816b59f21798afaf4816731a47cc28`.

## Limites, risques et gates

**Facturation pas certifiée** : métrique Upstash de la base temporaire a retourné `commands_total=0` alors que la preuve REST démontre des commandes réussies. La métrique peut être non actualisée ou inappropriée ; **ne pas en déduire zéro consommation**. Projection interne ~6 commandes/acceptation coût 1, ~3/refus, soit 168 pour 20/16, sans valeur de facture. Le quota libre Upstash annoncé est 500k commandes/mois ; évaluer les commandes réelles via Insights de compte avant activation.

**Disponibilité/performance non certifiées** : essais petits, même région inconnue, pas de test de charge WAN prolongée, pas de test de CDN cache, failover, latences p95/p99 représentatives, ni WAF/identité issue du vrai reverse proxy. Une base temporaire sans compte n'est pas destinée à la production. Ne pas incorporer ses credentials au repo.

**Publication NO-GO** : `app/api/geo/indicative-landmarks/route.ts` reste code-source OFF / HTTP 404. Adapter non raccordé à la route, aucune signature humaine réelle, aucune approbation OSM/PBF, aucun endpoint public, aucune lecture intégrée au reader J18-F. WAF Hobby amont non activé ; cache CDN pourrait éviter de compter certaines réponses si placé avant la Function.

**Git / déploiement — intégration effective le 11/11/2026** : les 7 fichiers J18-I initialement préparés dans les commits `46e9dbe43a9d955c3f57259241ea71271a7de14c` et `9ddc1972b04120ac7c10668a5840ab25dc19ef5e` sont maintenant sur la branche de [PR #1197](https://github.com/hraaaaf/Akarfinder/pull/1197), au HEAD `c2ef019bfb123f87c56088567d68180345622dff` lors de la première intégration. La branche inclut en plus `vercel.json` avec `git.deploymentEnabled["feat/vivre-ici-maarif-modes-clarity-20261108"]=false` pour interdire ses auto-deploys (sans affecter `main`). Blocage temporaire du preview au niveau du projet Vercel appliqué avant le push, puis restitué à son réglage normal après le push ; 4 déploiements historiques, aucun nouveau déploiement Vercel observé lors du contrôle. Le run ciblé [J11/J18 #43034883145](https://github.com/hraaaaf/Akarfinder/actions/runs/43034883145) est **SUCCESS** sur ce HEAD : tests Python et Node, incluant J18-I. Les autres workflows de ce commit étaient encore en cours lors du closeout ; statut global à relire sur le HEAD exact. PR toujours Draft, non mergée, aucune publication.

## Next exact et séquence restante

1. **J18-I — validation de coût** : mesurer commandes réellement facturées/commandes par réservation dans une base Upstash **revendiquée et dédiée**, si un accès approprié devient disponible ; confirmer limites, protection contre l'abus et logs sans secrets. Ne pas confondre métrique scratch à zéro et certification.
2. **Validation de l'intégration déjà effectuée** : les fichiers et la CI J18-I sont dans la PR #1197. Vérifier les autres workflows du HEAD actuel, résoudre tout échec, contrôler TypeScript, HTTP 404, contrat d'identité fiable, non-régression et absence de nouveau déploiement Vercel ; maintenir le blocage automatique de cette branche dans `vercel.json`. Tout merge, preview volontaire ou changement de ce verrou exige une nouvelle autorisation explicite.
3. **J18 release** : source/manifeste/pinning vérifiés, signature humaine véritable, reader serveur J18-F, autorisations ODbL, QA 3 villes×4 viewports, mobile/VoiceOver/NVDA, géométrie Maârif central, score UX ≥9,5 ; gates humains distincts avant merge, publication et Vercel.

**Progrès global Akarfinder non certifié ; aucun pourcentage inventé.**
