# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane UX/Carte : P1B.4 ✅ Geo Coverage Recovery pilot certifié en production**  
**Lane DATA : DATA-4.4C ✅ Persistent Canary 50 certifié ; prochaine décision DATA = expansion bornée à définir explicitement**  
**Couche Offre quartier : OFF — couverture certifiée actuelle 0,45 %**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

P1B.4 code mergé via PR #386 : `5ab84bcf4d76f6ddda5371ae3d35ffc3b7f01050`.

Acquis récents :

- DATA-4.3H ✅ PR #377 — Dar Agadir 500/500, Search/display 500/500, drift 0 % ;
- DATA-4.4B ✅ PR #380 — Promo Immo revalidé : 3 130 URLs sitemap / 2 935 intersection / 2 456 éligibles ;
- DATA-4.4C ✅ PR #384/#385 — canary exact 50 persisté et certifié : Search **50/50**, display **50/50**, quality A/B **50/50**, projection préservée **50/50**, drift **0 %** ; Promo Immo **3 005 total / 59 fresh / 2 946 seed / 50 sitemap-presence** ;
- P1B.1 ✅ PR #371, **9,1/10** ;
- P1B.2 ✅ PR #376, **9,2/10** ;
- P1B.3 ✅ PR #382 — Territorial Metric Join Contract ;
- P1B.4 ✅ PR #386 — Geo Coverage Recovery pilot.

Invariants : no-bypass, provenance réelle, Search canonique, Geo Registry source géographique unique, aucune précision ou métrique territoriale fabriquée.

# UX / Carte — état certifié

## P1B.3 ✅

Contrat fail-closed :

`LISTING public/displayable → dernier événement geo explicite → resolved → quartier canonique validated → ville canonique validated`

Rapport production initial :

- eligible public listings : **15 399** ;
- resolved neighborhood listings : **0** ;
- coverage : **0,00 %** ;
- latest collisions : **0** ;
- conflicting history : **0** ;
- metric layers : **OFF**.

Cette preuve a imposé Geo Coverage Recovery avant toute couche Offre.

## P1B.4 ✅ PRODUCTION CERTIFIED

Source de vérité autorisée pour le pilot :

`public LISTING → coverage_bridge → property_listings.district explicite → alias quartier Geo Registry exact + unique → alias ville exact sur ville parente validated`

Interdits : titre, URL, fuzzy, coordonnées, proximité, interpolation.

Preuves :

- base `c036bb061ce4d083e264254387b8eac77f53b565` ;
- head revu `c2f99d90406ad696c13456efe1e05baa7ea6dd41` ;
- Reviewer PASS après correction d’un finding : ajout d’un véritable test PostgreSQL apply/drift/rollback ;
- exact-head gate `31254793603` ✅ ;
- merge #386 `5ab84bcf4d76f6ddda5371ae3d35ffc3b7f01050` ;
- post-merge gate `31254967688`, job `93096902922` ✅ ;
- migration production `p1b4_geo_coverage_recovery` ✅ ;
- preflight post-migration : **69/69**, **14 quartiers**, **5 villes** ;
- write transactionnel : **69/69** ;
- remaining candidates après apply : **0** ;
- provenance : **69 événements / 69 seeds / 14 quartiers / 5 villes** ;
- rollback append-only disponible, non requis ;
- aucun nouveau finding Supabase spécifique P1B.4.

Rapport P1B.3 post-write :

- eligible public listings : **15 395** ;
- resolved neighborhood listings : **69** ;
- coverage : **0,45 %** ;
- latest collisions : **0** ;
- conflicting history : **0** ;
- missing canonical geo : **0** ;
- metric layers : **OFF**.

Exemples de cohorte certifiée : Rabat Agdal 11, Agadir Founty 9, Rabat Souissi 9, Rabat Hay Riad 8, Marrakech Hivernage 6, Casablanca Racine 5 ; total = 69 sur 14 quartiers / 5 villes.

# Décision Carte

**Ne pas activer Offre quartier.** 0,45 % est une preuve de fonctionnement du pont, pas une couverture produit suffisante.

Prochaine action : auditer la prochaine cohorte explicitement récupérable :

- districts persistés non résolus ;
- alias Geo Registry absents ou variantes canoniques justifiables par preuve explicite ;
- bridges existants vers `property_listings` ;
- aucune inférence titre/URL/proximité.

Ne pas inventer de nouveau numéro de lot avant cet audit.

# DATA — DATA-4.4C ✅ CLOSED

Canary exact **50 lignes**, persistant et certifié. Search/display/quality/projection **50/50**, drift **0 %**, Registry inchangé, rollback non requis.

# Prochaine décision DATA

Définir explicitement un **nouveau lot d’expansion bornée** du second réservoir. DATA-4.4C ne donne aucune autorisation automatique de +100/+500.
