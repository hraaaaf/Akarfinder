# AkarFinder — START

**Version : 2026-08-03**  
**Statut : application publique active, chantier critique DATA/Search**  
**Référence code : `main` @ `fa983a3`**  
**Production vérifiée : `dpl_8XqdkUnMvVRgKVTCU2bNVnXbYg5f` — `READY`**

## 1. État actuel

AkarFinder n’est plus en phase d’initialisation.

Le produit public existe et les parcours principaux sont opérationnels :

- accueil ;
- Acheter ;
- Louer ;
- Vendre ;
- recherche `/search` ;
- résultats structurés historiques ;
- résultats externes indexés avec redirection vers la source ;
- cartes, filtres, comparaison et premières couches d’intelligence ;
- expériences professionnelles et démonstrations contrôlées.

La contrainte principale n’est plus l’absence de fonctionnalités. Elle est devenue :

> **profondeur de vraies pages annonce, qualité économique, fraîcheur, provenance, diversité des sources et dédoublonnage.**

## 2. Vérité DATA vérifiée le 3 août 2026

Lecture directe et non destructive du projet Supabase canonique :

| Indicateur | Valeur |
|---|---:|
| Documents Thin Index conservés | 56 777 |
| Classés immobilier probable | 34 172 |
| Quarantainés non immobiliers | 22 586 |
| Non classés | 19 |
| Immobilier + display eligible | 22 481 |
| **Pages annonce LISTING réellement éligibles au read model public ODM** | **7 483** |
| Avec ville normalisée | 7 483 |
| Avec type de bien | 7 203 |
| Avec intention | 7 233 |
| Avec prix | 853 |
| Avec surface | 2 085 |
| Prix + surface comparables | 717 |
| `property_listings` structurés | 4 508 |
| `listing_sources` | 4 513 |
| `property_clusters` | 4 369 |
| Observations factuelles | 2 767 |

La North Star DATA n’est donc pas `56 777 documents`. La vérité utile actuelle est **7 483 vraies pages annonce éligibles**, dont seulement **717** sont comparables sur prix et surface.

## 3. Recherche publique

Le chemin historique reste le fallback de sécurité.

Le read model ODM est branché derrière un Canary déterministe et fail-closed :

- cap technique actuel : 10 % ;
- activation conditionnée par variables d’environnement et approbation explicite ;
- `ODM_PUBLIC_CANARY_STOP` permet l’arrêt ;
- toute erreur ODM retombe sur le chemin historique ;
- `/search` et `/api/search` utilisent désormais la même normalisation de paramètres et la même clé stable.

Le code autorisant 10 % ne constitue pas, à lui seul, une preuve que l’environnement Production sert actuellement exactement 10 % de trafic ODM. Cette activation doit être certifiée par télémétrie interne bornée.

## 4. UX/UI actuelle

La famille visuelle **Option A** approuvée est en Production pour :

- Appartement ;
- Villa ;
- Terrain ;
- Studio ;
- Riad ;
- Bureau.

Elle est utilisée sur Acheter, Louer, Recherche, les fallbacks de cartes et le parcours Vendre. Une vraie photo autorisée reste toujours prioritaire.

## 5. Mission active recommandée

### P0 — Restaurer une profondeur honnête de vraies annonces

Objectif : augmenter les **pages annonce LISTING éligibles**, sans réintroduire de catégories, pages de recherche, bruit vertical ou URLs ambiguës.

Ordre recommandé :

1. acquérir des URLs net-new via sources et feeds autorisés ;
2. renforcer le Source Registry et les accords partenaires ;
3. augmenter prix, surface et fraîcheur prouvés ;
4. réduire la concentration sur quelques domaines ;
5. recertifier le read model public et le Canary ;
6. seulement ensuite augmenter progressivement l’exposition ODM.

## 6. Lecture obligatoire avant modification

1. `docs/START.md`
2. `docs/ROADMAP.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/SCRAPING.md`
6. document du LOT concerné
7. migrations, tests et code réellement actifs

`docs/SESSION.md` et `docs/DECISIONS.md` sont de grands journaux historiques. Ils servent à retrouver une preuve ou une décision, mais ne remplacent pas l’état canonique ci-dessus.

## 7. Règles d’exécution

- Inspecter avant de modifier.
- Une responsabilité principale par LOT et par PR.
- Ne jamais annoncer « terminé » sans tests, CI et preuve connectée.
- Ne jamais activer Production sans autorisation explicite et rollback vérifié.
- Ne jamais confondre code mergé, variable activée, trafic observé et certification réussie.
- Ne jamais traiter une source externe comme partenaire sans contrat ou statut explicite.
- Ne jamais publier un prix, une surface, une fraîcheur ou un doublon comme certain sans preuve suffisante.

## 8. Périmètre gelé

Jusqu’à amélioration significative de la profondeur et de la qualité :

- nouvelles features périphériques non critiques ;
- refonte UX globale supplémentaire ;
- activation massive d’une collecte ;
- hausse Canary non mesurée ;
- promesse marketing « toutes les annonces » comme vérité statistique acquise ;
- réutilisation de contenus ou images sans droit établi.
