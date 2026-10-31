# AkarFinder — 200K / proposition de pivot « freshness-first »

Date de proposition : 2026-10-09
Statut : **PROPOSÉ, PAS ENCORE ADOPTÉ**. Aucun déploiement, merge, accès DB ni écriture autorisés.

## Goal et vérité de départ

Goal inchangé : au moins **200 000 annonces fraîches, uniques, avec URL, ville, quartier, prix et superficie**, réellement recherchables après certification.

Artefact gel : `10910779576`, SHA-256 gzip `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`.

- 226 286 URLs uniques, **222 359 scope-eligible**. Obtenir 200 000 depuis ce stock exigerait **89,94 %** de rendement final frais+complet+unique.
- 8 487 URLs ont été observées HTTP 200 en profondeur ; **1 191 fiches possèdent les quatre champs+URL** dans le gel, **mais aucune n'est pour autant certifiée fraîche/servicable** par cette seule preuve.
- Sur Mubawab le run V3 **37959672836** : 6/300 (2 %) fiches à cinq champs `write_safe`, fraîcheur non certifiée. Sur V4 **37966914495**, 208/300 identités finales non préservées ; la réparation détaillée d'archives historiques est un goulet d'étranglement.

## Scoreboard calculé directement du gel (HTTP 200 observés)

| Source | URLs scope-eligible | HTTP 200 détaillés | 5 champs présents (non certifiés frais) | Lacune dominante |
| --- | ---: | ---: | ---: | --- |
| Domio | 10 307 | 3 495 | **1 176 (33,65 %)** | Fraîcheur actuelle / volume limité |
| MarocImmo | 37 268 | 4 499 | **15 (0,33 %)** | Prix seulement 19/4 499 ; superficie 2 085/4 499 |
| Sarout | 43 794 | 493 | **0** | Quartier 0/493 ; prix 427, surface 364 |
| Mubawab | 81 975 | 0 dans le gel initial | 0 dans le gel initial | Bench strict 6/300 d'un échantillon déterministe distinct |
| Avito | 23 804 | 0 | 0 | Aucune preuve deep dans ce gel |
| Agenz | 9 347 | 0 | 0 | Aucune preuve deep dans ce gel |

Note : ce tableau compare la **présence des champs dans le gel**, non des `write_safe` homogènes ; l'échantillon Mubawab est distinct et non interchangeable.

Contrôle des dates `published_at` par rapport au 9 octobre 2026 :
- Domio : **25/3 495** observations HTTP 200 datées des 30 derniers jours ; **151/3 495** dans les 90 derniers jours. Parmi **1 176** fiches complètes, **2** publiées dans les 30 jours et **24** dans les 90 jours.
- MarocImmo : **441/4 499** observations datées des 90 derniers jours ; seulement **1/15** fiches complètes dans les 90 jours.
- Les dates publiées anciennes **ne démontrent pas à elles seules une annonce inactive** ; elles prouvent seulement que le gel n'est pas un flux de publications récentes.

Méthode reproductible : parcourir le `jsonl.gz` du gel ; pour chaque `source_domain`, compter `200 in deep_http_statuses`, puis le nombre de lignes avec `city`, `district`, `price_mad`, `surface_m2` tous non nuls ; calculer les jours à partir de `published_at`. **Aucune requête DB**.

## Proposition : inverser le pipeline

### Étape 1 — Sélectionner les sources par rendement, pas par volume brut
- Arrêter les cycles répétés de réparation de l'archive Mubawab ; conserver le parser, les artifacts et les gates de sûreté. Terminer la seule CI V4.1 déjà lancée sans déclencher de nouvelles campagnes Mubawab pour le moment.
- Comparer **Domio, MarocImmo, Sarout** sur un **petit lot source-first de publications récentes** autorisées (p.ex. 100 annonces par source si robots/conditions le permettent). Réutiliser les observations existantes dès que possible ; pas de bypass anti-bot.
- Score principal : `fresh_unique_primary_5of5 / requested_details`, complété par précision d'un audit manuel, nombre de requêtes, conflits, délais, conditions d'accès. Considérer comme gate **proposé** un rendement strict >=20 % et zéro fail de confidentialité / conformité ; ne pas traiter ce seuil comme un fait.

### Étape 2 — Acquérir des annonces réellement récentes
- Privilégier catalogues des annonces **nouvellement publiées**, flux officiels, imports agence avec permission (CSV/XML/API selon disponibilité effective) plutôt que recrawler des millions d'anciennes URLs.
- Certifier `source_id`, URL canonique stable, date de fetch, indicateur actif explicite ou contenu toujours présent, ville, quartier, prix, superficie, hash du contenu, dédup et provenance de champ.
- Quand une adresse précise ou un point GPS réellement fiable est publié, dériver le quartier via les polygones territoriaux existants **uniquement si point dans polygone non ambigu**, sinon conserver `review`. Aucun quartier inventé depuis géolocalisation floue.

### Étape 3 — Ouvrir un flux de producteurs directs
- Le gel n'offre pas assez de marge pour garantir 200k : atteindre 200k depuis 222 359 eligible exigerait 89,94 % de rendement intégral, non démontré.
- Construire une arrivée durable d'inventaire directement auprès d'agences, promoteurs, portails et outils CRM consentants ; accords de republication et fréquence de mises à jour définis contractuellement.
- Dédupliquer entre sources par identités fortes et preuves rapprochées, sans fusion automatique risquée. Score national seulement après preuve d'activité + cinq champs.

## Arbitrage proposé

**A — continuer Mubawab archive** : faible rendement constaté (2 % 5/5 strict avant fraîcheur), coût d'itération élevé.

**B — pivot multi-sources fraîcheur d'abord (RECOMMANDÉ)** : un benchmark court, comparatif, puis investissement sur sources qui produisent vraiment des annonces vérifiables. Éviter de se fier au seul 33,65 % de champs Domio sans fraîcheur actuelle.

**C — acquisition contractuelle seule** : meilleure provenance potentielle et meilleure actualisation, mais disponibilité, négociation et volume non vérifiés. À mener en parallèle de B.

## Succès / preuve / next

Succès intermédiaire : tableau sourcé de rendement `fresh+unique+5of5` par source avec de vraies nouvelles annonces autorisées ; au moins une source démontre un rendement utile. Pas de date de livraison ni de chiffre total annoncé avant les preuves.

**Next exact si B adopté :** inventaire des workflows disponibles et règles d'accès ; plan d'échantillonnage comparatif 100 annonces nouvelles/source ; réutilisation des artifacts, tests de provenance, résultats stricts, puis classement. Si aucun canal n'offre de rendement plausible, privilégier le partenariat de données plutôt que falsifier le chiffre 200k.

**Sécurité :** snapshot-only ; aucune lecture/écriture DB, pas de déploiement Vercel, pas de merge, aucun contournement robots/CAPTCHA.
