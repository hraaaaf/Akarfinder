# MOROCCO-PRICE-LIFESTYLE-REFERENCE-DATASET-1

## 1. Objectif

Créer un referentiel interne Maroc prix/quartiers/lifestyle pour preparer les
futurs modules d'aide a la decision AkarFinder, sans affichage public des prix
dans cette mission.

## 2. Pourquoi `internal_only`

Le dataset V1 est un seed produit. Il sert a structurer la couche de
reference, pas a publier des valeurs quartier au grand public. Les donnees
doivent rester reservees a la logique interne, aux tests et a la preparation
des futures experiences AkarInfo.

## 3. Difference prix affiches / prix transaction

Les donnees integrees representent des reperes indicatifs de prix affiches.
Elles ne representent ni des prix de transaction, ni des prix notariaux, ni
des prix officiels.

## 4. Champs du dataset

Le module `lib/market-reference/*` structure :

* villes seed internal_only
* quartiers seed internal_only
* price points types
* source registry interne
* methodology notes
* forbidden public claims
* helpers de resolution interne
* helpers de blocage public

Les `price points` gardent notamment :

* `metric_name`
* `value_low`
* `value_median`
* `value_high`
* `transaction_type`
* `property_type`
* `source_type`
* `source_url`
* `evidence_ref`
* `date_accessed`
* `confidence`
* `public_safe`
* `internal_only`

## 5. Regles `public_safe`

* Tous les `price points` restent `public_safe=false` dans cette mission.
* Tous les `price points` restent `internal_only=true`.
* Les labels lifestyle peuvent etre publics seulement s'ils sont qualitatifs et
  `public_safe=true`.
* Aucune valeur `value_low`, `value_median`, `value_high` ne doit sortir d'un
  helper public.

## 6. Regles `confidence`

* `portal_listing_prices` + `source_url=null` => `confidence=low` maximum.
* `manual_review` + `source_url=null` => `confidence=medium` maximum.
* Aucun seed V1 ne depasse ces plafonds.

## 7. Regles `source_url` / `evidence_ref`

Chaque donnee sans URL publique doit garder un `evidence_ref` interne.
Exemples integres :

* `internal/manual-review/2026-07-06/casablanca-maarif-buy-apartment`
* `internal/manual-review/2026-07-06/rabat-agdal-buy-apartment`
* `internal/portal-review/2026-07-06/marrakech-gueliz-buy-apartment`

## 8. Donnees integrees V1

Villes seed :

* Casablanca
* Rabat
* Marrakech
* Tanger
* Agadir

Quartiers seed :

* Casablanca / Maarif
* Rabat / Agdal
* Marrakech / Gueliz

Le seed reste volontairement limite. Cette mission ne remplit pas artificiellement
plus de quartiers.

## 9. Donnees non publiables

Doivent rester bloquees cote backend et helpers publics :

* `value_low`
* `value_median`
* `value_high`
* toute fourchette MAD/m2
* toute confidence de prix
* tout `evidence_ref`
* toute source registry interne
* toute comparaison du type "sous le marche" / "au-dessus du marche"

## 10. Forbidden public claims

Termes explicitement interdits dans un affichage public :

* `prix de marche`
* `prix officiel`
* `prix reel`
* `prix certifie`
* `prix garanti`
* `meilleur quartier`
* `quartier sur`
* `quartier securise`
* `quartier dangereux`
* `sous le marche`
* `au-dessus du marche`
* `prix de reference`
* `bonne affaire garantie`
* `annonce verifiee`
* `annonce fiable`

## 11. Usage autorise

Autorise dans cette mission :

* stockage dans un module interne type
* validation via tests
* preparation de helpers serveur
* preparation de filtres `public_safe`
* preparation du futur AkarInfo Passport
* documentation produit

## 12. Usage interdit

Interdit dans cette mission :

* afficher les prix dans l'UI
* creer une API publique de prix
* ajouter des badges de prix
* afficher `prix moyen quartier`
* afficher `prix de reference public`
* modifier Search Gateway
* modifier ranking
* modifier DB/Supabase
* creer une migration obligatoire

## 13. Preparation AkarInfo Passport

Ce referentiel sert de socle pour :

* un futur passeport quartier prudent
* une future logique de position prix encadree
* des indicateurs lifestyle qualitatifs
* des checks internes de coherence ville/quartier

Il ne constitue pas encore une fonctionnalite publique.

## 14. Prochaine etape

Prochaine etape recommandee apres validation preview/code :

* `AKARINFO-PASSPORT-1`

Puis :

* `PRICE-POSITION-REFERENCE-V2`
