# J18-I — Quota Redis distribué, candidat de code non publié (2026-11-11)

## Goal / Success / Proof
But : intégrer sans publier l'adaptateur de quota atomique pour la future route indicatrice Vivre Ici, et conserver le verrou de release J18-H. La route /api/geo/indicative-landmarks reste OFF/404 ; aucun token réel, aucune DB, publication ou déploiement.

Candidat : j18-distributed-redis-quota.mjs avec un EVAL Lua/fenêtre glissante par acteur (TIME serveur, ZCOUNT, nettoyage, ZADD NX, PEXPIRE) ; refus 503 dans la politique appelante si le backend renvoie erreur/timeout, et 429 si quota épuisé. Clé acteur hachée. Exiger une identité issue d'un proxy fiable, jamais un X-Forwarded-For non fiabilisé.

Preuve locale du pack staging : 12/12 tests Node ciblés PASS, comparaison SHA de source candidate avec blob de test GitHub. Preuve redis OSS réelle : [GitHub Actions #43002160137](https://github.com/hraaaaf/engineering-governance/actions/runs/43002160137) SUCCESS, 3 processus / 36 demandes = 20 autorisées, 16 refusées. Preuve HTTP réelle avec passerelle locale imitant l'enveloppe Upstash et vrai Redis 7.4 : [GitHub Actions #43011957419](https://github.com/hraaaaf/engineering-governance/actions/runs/43011957419) SUCCESS, 20/16 et fail-closed, Lua SHA256 ca18124342c615253b72672b09fe072c13fd62da67216c859548f1bf550075c0, TTL mesuré 61786 ms.

IMPORTANT : Github Actions n'a PAS testé l'API HTTPS Upstash officielle, le flag allow-key-locking réel, son décompte facturé ni le délai réseau production. Redis OSS ne reconnaît pas ce flag propriétaire : la CI a retiré UNIQUEMENT la ligne de flag et exécuté le corps Lua original. Pas de clé ni d'instance Upstash de test disponible. Borne projetée seulement : ~6 commandes par acceptation cost=1, ~3 par refus, 168 pour 20/16 (NON facturées/mesurées). WAF effectif sur production requiert accord humain ; cache CDN peut contourner la Function et donc son compteur applicatif.

## Sécurité / état d'intégration
Le présent commit est un CANDIDAT détaché, sans branche Git déplacée et sans GitHub Actions Vercel : ne vaut PAS une intégration effective à PR #1197. Tout transfert ultérieur de la branche Vercel exige contrôle préalable du déclencheur de preview et GO humain avant tout déploiement. La route J18-H n'est pas modifiée ; la nouvelle CI cible seulement des tests Node/mocks sans instance externe ni secrets.

## Next exact
Tester l'API REST et le flag allow-key-locking sur Upstash single-region isolé, mesurer commandes/latences et gestion de refus sans fail-open. Puis après neutralisation prouvée d'un éventuel auto-preview Vercel, appliquer ce candidat sur la branche PR, revalider les contrats J18-H + J18-I et la CI exacte ; rester OFF. Viennent ensuite signature humaine véritable, source/pinning/cache/reader J18-F, QA 3 villes × 4 viewports, mobile/VoiceOver/NVDA, géométrie Maârif central et gate UX ≥9,5/10 ; merge/publication/Vercel sur GO distinct uniquement. Aucun pourcentage global certifié.
