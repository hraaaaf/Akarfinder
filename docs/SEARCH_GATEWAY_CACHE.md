SEARCH_GATEWAY_CACHE.md

## 1. Objectif du cache

Ajouter une couche cache prudente devant le Search Gateway pour :

* reduire les appels repetes a Serper ;
* proteger le quota mensuel ;
* limiter les pages vides quand le provider retourne `0` ou devient instable ;
* conserver la doctrine Gateway : resultat web externe, apercu limite, source originale a confirmer.

## 2. Pourquoi Serper quota necessite un cache

Le Gateway AkarFinder depend d'un provider de recherche externe pour obtenir
des resultats web immobiliers. Quand le quota ou le provider se degrade,
l'API peut retourner `0` resultat meme pour des requetes normalement utiles.

Le cache V1 sert donc a :

* eviter les appels inutiles sur des requetes identiques ;
* reutiliser une reponse recente pendant 12h ;
* autoriser un fallback stale prudent jusqu'a 7 jours si le provider echoue
  ou retourne `0`.

## 3. Cache key

Constante d'invalidation :

* `SEARCH_GATEWAY_CACHE_VERSION = "v1"`

Composition :

* `provider`
* `query normalisee`
* `city detectee`
* `transaction_type`
* `property_type`
* `page`
* `locale`
* `cache version`

Exemple :

* `serper:v1:buy:appartement:casablanca:page1:fr-ma:appartement-casablanca`

Regles :

* trim + lowercase ;
* accents normalises ;
* espaces multiples compacts ;
* aucune donnee personnelle dans la cle ;
* pas de telephone ni email.

## 4. TTL

Politique V1 retenue :

* TTL frais : `12h`
* stale max age : `7 jours`

Le V1 reste volontairement simple. Une granularite differenciee par intent ou
rarete de requete pourra arriver plus tard.

## 5. Stale fallback

Sequence :

1. lookup cache frais ;
2. si `hit`, retour immediat ;
3. sinon appel provider ;
4. si reponse fraiche avec resultats, sauvegarde cache ;
5. si reponse fraiche a `0` ou provider degrade, tentative de fallback stale ;
6. si stale trouve, retour avec metadata interne `cache.status = stale`.

Important :

* un resultat stale n'est jamais presente comme frais ;
* aucun wording public du type `mis a jour`, `actif`, `confirme`, `disponible`
  n'est ajoute ;
* la metadata `cache` reste interne/API, non exploitee publiquement dans l'UI.

## 6. Donnees stockees

Le cache stocke uniquement une reponse Gateway assainie :

* `title`
* `snippet` court
* `original_url`
* `display_url`
* `source_id`
* `source_name`
* `source_host`
* `normalized_city`
* `normalized_property_type`
* `normalized_transaction_type`
* `result_count`
* `sources_queried`
* drapeaux d'affichage limites (`can_show_contact=false`, `can_show_gallery=false`)

## 7. Donnees interdites

Jamais stocke :

* contact ;
* telephone ;
* WhatsApp ;
* email ;
* galerie ;
* images tierces re-hebergees ;
* `value_low`, `value_median`, `value_high` ;
* `evidence_ref` ;
* `source_registry` ;
* secret, API key, env value.

Par prudence, le cache V1 neutralise aussi les miniatures en relecture cachee
(`can_show_thumbnail=false` dans le payload stocke).

## 8. Supabase table

Migration creee, non appliquee :

* `supabase/migrations/20260706130000_create_search_gateway_cache.sql`

Table :

* `search_gateway_cache`
* cle primaire `cache_key`
* `response_json` en `jsonb`
* `expires_at` + `stale_until`
* `hit_count` + `last_hit_at`

## 9. Comportement si table absente

Le code doit continuer a fonctionner si :

* `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` sont absents ;
* la table `search_gateway_cache` n'existe pas encore ;
* Supabase retourne une erreur schema/cache.

Dans ce cas :

* fallback `NoopSearchGatewayCacheStore` si Supabase n'est pas configure ;
* `SupabaseSearchGatewayCacheStore` retourne `bypass` si la table manque ;
* la route Gateway continue sans crash.

## 10. Comportement si quota epuise

Le V1 ne suppose jamais automatiquement "quota epuise" quand `results_count=0`.

Classification prudente interne :

* `zero_results`
* `provider_error`
* `quota_or_auth_possible`
* `parser_empty`
* `unknown`

Si le provider renvoie `0` ou se degrade :

* le cache tente un stale fallback ;
* sinon la route retourne `0` proprement avec metadata `cache`.

## 11. Limites V1

* TTL unique, pas de politique fine par ville ou intent.
* Pas d'invalidation active.
* Pas de warming automatique.
* Pas de surface UI publique du statut cache.
* Pas de garantie d'un cache stale existant tant que le quota n'a pas permis
  au moins une population fraiche.

## 12. Procedure future pour appliquer migration

1. Revue humaine SQL.
2. GO explicite.
3. Application manuelle dans Supabase.
4. Verification lecture/ecriture en preview.
5. Promotion production seulement apres validation.

Cette mission n'applique aucune migration et ne modifie pas la base
production.

## 13. Tests

Ajoutes dans `scripts/scrapers/__tests__/search-gateway-cache.test.ts` :

* stabilite de la cache key ;
* differences par transaction/type/page ;
* `hit` evite le provider ;
* `miss` appelle le provider ;
* sauvegarde des resultats frais ;
* `0` frais + stale retourne stale ;
* `0` frais + pas de stale retourne `0` proprement ;
* sanitization sans contact/galerie/prix dataset ;
* cache expire non servi comme `hit` ;
* stale jamais presente comme fresh ;
* `NoopCacheStore` et `SupabaseCacheStore` tolerants a l'absence de table.

## 14. Prochaines etapes

* peupler le cache apres renouvellement quota Serper ;
* observer les taux `hit/miss/stale` ;
* envisager un TTL plus fin par intent ;
* ajouter un warming prudent sur requetes frequentes si besoin ;
* considerer seulement apres GO prod l'etape suivante de roadmap.
