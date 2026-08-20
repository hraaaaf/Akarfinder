# AkarFinder Experience — P1-B1 Canonical Page Targets

Date : 2026-08-20
Base initiale : `main@9ec284f8888e2187288af4b5a6c9adc9b51c8439`
Statut : **FERMÉ — VALIDÉ, CERTIFIÉ ET MERGÉ**

## Goal

Verrouiller les cibles visuelles et structurelles des huit surfaces canoniques AkarFinder : Accueil, Search, Carte, Quartier, Listing, Mon Projet, Publier et Professionnels.

## Succès validé

- doctrine `Territoire → Marché → Vie locale → Biens → Décision` ;
- Search/Carte map-list et map-first sans clone visuel Zillow ;
- Listing `Bien → Confiance → Marché → Vie locale → Décision → Source` ;
- Publier commence par le **type de bien** ;
- Mon Projet progressif ;
- Professionnels : identité, publication structurée, intelligence marché ;
- palette AkarFinder bleu/navy/blanc ;
- aucun écran produit existant modifié ;
- aucune mutation DB/source ;
- aucun Vercel ;
- logo production exact verrouillé.

## Contrat mobile

- Search/Carte : strips horizontaux scrollables à 390 px ;
- Carte : hauteur utile mobile ;
- Mon Projet/Publier : stepper compact mobile et complet desktop.

## Contrat logo

Assets exacts du `SiteHeader` production :

- `/brand/logo-v2/logo-header-light.png` ;
- `/brand/logo-v2/logo-header-dark.png`.

## Certification finale

- PR `#830` ;
- HEAD `5f94a477bfca401eab4c250750bfdfd3a9355ef6` ;
- run `32406060774` — **SUCCESS** ;
- artifact `9420359227` ;
- digest `sha256:a023717e5e0d798725fbe1a0eb39f05e4f3027ff0c274cc02349e36aa426b381` ;
- **16/16 captures** ;
- **0 finding** ;
- **0 overflow** ;
- score UX/UI : **8,8/10** ;
- human gate approuvé le 20/08/2026 ;
- merge `260922d2e051b67b8bdd80be519b111fbbc64d3f`.

P1-B1 est fermé et ses huit cibles sont la référence canonique des lots page-level. P1-A1 a depuis été repris et fermé via PR `#828`; aucune objection P1 ne reste ouverte.
