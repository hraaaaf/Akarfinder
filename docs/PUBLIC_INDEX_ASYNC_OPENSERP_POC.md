# PUBLIC_INDEX_ASYNC_OPENSERP_POC

## 1. Objectif
AkarFinder pose une fondation d'index public observe, alimentee de maniere asynchrone par OpenSERP Bing/Ecosia, puis restituable rapidement via une couche Supabase PostgreSQL FTS + trigram.

## 2. Pourquoi un index async
OpenSERP a un signal utile pour decouvrir des resultats publics observes, mais la latence est trop elevee pour le chemin utilisateur direct. Un feeder asynchrone permet de separer la collecte de la restitution.

## 3. Pourquoi pas OpenSERP live
Le chemin utilisateur `Rechercher` ne doit jamais declencher OpenSERP. La recherche publique reste rapide, deterministe, et depend uniquement de l'index deja present ou des stores de fallback.

## 4. Resume du POC precedent
Le POC precedent a montre un signal exploitable sur Bing et Ecosia. Google a ete bloque et reste interdit en V1. Le bon pattern n'etait pas un provider live, mais un feeder controle, desactive par defaut.

## 5. Architecture cible
OpenSERP Bing/Ecosia -> worker async controle -> mapping public-safe minimal -> `public_property_index` -> Supabase FTS + trigram -> restitution rapide -> lien original obligatoire.

## 6. Migration POC
La migration revue-only cree `public_property_index` avec `pgcrypto`, `pg_trgm`, `fts_vector`, RLS et les index necessaires. Elle existe pour revue et tests, mais n'est pas appliquee en production dans cette mission.

## 7. Donnees stockables
Autorise: `source_host`, `source_url`, `title`, `short_snippet`, `inferred_city`, `inferred_neighborhood`, `inferred_property_type`, `inferred_transaction_type`, `public_price`, `public_surface`, `observed_at`, `result_source`, `provider_engine`, `observation_count`.

## 8. Donnees interdites
Interdit: contact, telephone, WhatsApp, email, galerie, image, `image_url`, `raw_metadata`, payload complet, secrets provider, `cache_key`, `value_low`, `value_median`, `value_high`, `evidence_ref`, `source_registry`.

## 9. Moteurs autorises / interdits
Autorises V1: `bing`, `ecosia`.
Interdit V1: `google`.
Plus tard seulement: `duckduckgo`.

## 10. FTS + trigram
Le moteur cible combine:
- FTS sur `title`, `short_snippet`, `inferred_city`, `inferred_neighborhood`, `inferred_property_type`, `inferred_transaction_type`
- trigram sur `inferred_city` et `inferred_neighborhood`
- tri final par pertinence puis `observed_at DESC`
- `limit` borne a 100

## 11. Feeder OpenSERP async
Le feeder vit dans `scripts/public-index/openserp-async-feed-poc.ts`.
Regles:
- ne tourne jamais automatiquement
- `PUBLIC_INDEX_POC_ENABLED=false` par defaut
- `OPENSERP_ASYNC_FEEDER_ENABLED=false` par defaut
- `OPENSERP_LOCAL_URL` obligatoire pour toute tentative de feed
- `google` refuse
- pas de proxy, pas de bypass, pas de captcha handling agressif
- `PUBLIC_INDEX_POC_WRITE=true` obligatoire pour un write
- dry-run par defaut

## 12. Flags de securite
Flags attendus:
- `PUBLIC_INDEX_POC_ENABLED=false`
- `PUBLIC_INDEX_POC_USE_FIXTURES=false`
- `OPENSERP_ASYNC_FEEDER_ENABLED=false`
- `OPENSERP_ALLOWED_ENGINES=bing,ecosia`
- `OPENSERP_LOCAL_URL=http://localhost:xxxx`
- `PUBLIC_INDEX_POC_WRITE=false`

## 13. Tests et scans
Tests ajoutes:
- mapping Bing/Ecosia vers record public-safe
- refus Google
- absence de flag = aucun appel OpenSERP
- no raw metadata
- no contact / phone / WhatsApp / email
- no gallery / image / image_url
- no `value_low` / `value_median` / `value_high`
- no `evidence_ref` / `source_registry`
- recherche fixture `appartement casablanca maarif`
- tolerance `maariff` via trigram
- limit max 100
- API interne read-only
- migration avec RLS et `pg_trgm`
- wording public-safe

Scans gardes:
- secrets
- OpenSERP live dans `app/search`, `app/api/search`, `components/search`
- Google interdit dans le POC
- fuites de champs interdits

## 14. Limites POC
- pas de production automatique
- pas de live search OpenSERP
- pas de modification Gateway
- pas de modification cache Gateway
- pas de modification Supabase production
- pas de stockage de metadata brute
- pas de rehosting d'image

## 15. Conditions GO / NO-GO pour V1
GO V1 si:
- tests et build verts
- preview validee
- aucun champ interdit expose
- route interne stable sans table
- feeder async reste desactive par defaut

NO-GO V1 si:
- OpenSERP devient un provider live
- Google est reintroduit
- des donnees sensibles sont stockees
- la production est touchee sans GO explicite
