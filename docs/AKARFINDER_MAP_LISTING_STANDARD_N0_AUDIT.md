# AkarFinder — Map + Listing Standard — N0 Audit

Date : 2026-08-19
Statut : **CURRENT**
Base auditée : `main` `49b80c4c1deffb1f1999f91412b5092151ac63c5`

## Goal

Établir la baseline produit réelle et les écarts qui justifient le nouveau chantier avant toute modification visuelle.

## Succès

- HEAD et closeout précédent vérifiés ;
- captures exact-head récupérées ;
- Map, Search, Listing et publication inspectés ;
- fondations réutilisables identifiées ;
- écarts structurels séparés des simples préférences visuelles.

## Preuve baseline

### Final UI / Accessibility Smoke

- head : `aed9e9e7ce88eb221980d27a16b221eee597f117` ;
- PR #821 : **2 fichiers docs uniquement**, `0` modification runtime ;
- run : `32267867957` — SUCCESS ;
- artifact : `9371334718` ;
- digest : `sha256:cdbb98b51619ececd9e3739c3a49a89fb20312997f798236258cc1c0a8b8dfd9` ;
- 12 routes × 4 viewports = **48 captures** ;
- report machine : **0 finding**, 0 overflow sur la matrice auditée.

Les captures Map/Search/Vendre de cet artefact sont valides comme BEFORE structurel du `main` actuel car le merge #821 est documentaire uniquement.

### Carte C7 exacte

- product head : `3db92d158ca2c388e5d53857089fce304348899b` ;
- run : `32244517896` — SUCCESS ;
- artifact : `9366976831` ;
- digest : `sha256:8ac9c4758d66986215795621c2b180a155e7b75fc54b5a217d35ffccc0d905eb` ;
- captures Prix / Densité / Annonces / zone sheet sur 390 / 430 / 768 / 1280 ;
- report `ok: true` ;
- 390 : sheet ratio `0,30095`, map-clear `0,60427` ;
- 430 : sheet ratio `0,27253`, map-clear `0,64163` ;
- 0 page error / 0 request failure.

### Listing L17

- head : `367fe07f74653e61025e80ed0cfaf31d87e211d7` ;
- PR #814 mergée `0f24bd260a97753f3aa9f16f9dfbd4f528c40521` ;
- run : `32129531035` — SUCCESS ;
- artifact : `9321690793` ;
- digest : `sha256:789e46815bee9618008b61d9b0763a72760fbd43f047b70231d7f6ed2e21456b` ;
- **6/6 captures**, **0 finding**, 0 overflow, 0 console error / failed response dans le report.

## Findings structurels

### F1 — Map et Search restent deux expériences

**Vérifié.** `/search` rend `LightZillowSearchShell` et expose Liste / Mixte / Carte ; `/map` rend séparément `MapNeighborhoodClient`.

`SearchMapNavigationBridge` synchronise les liens `/map` avec l’état URL de Search, ce qui est une bonne fondation de continuité, mais reste un bridge entre pages et non un workspace unique.

**Conséquence :** l’utilisateur doit conceptuellement choisir entre « chercher des biens » et « explorer la carte », alors que la cible doit fusionner les deux.

### F2 — La Carte explique bien le marché mais révèle peu les biens

**Vérifié visuellement.** C7 montre une excellente logique de heat map / zone sheet et des états fail-closed, mais pas encore la mécanique centrale d’un moteur cartographique de biens : inventaire visible, pins/prix, sélection résultat ↔ pin et recherche par viewport.

**Décision :** conserver la couche territoriale comme différenciateur, ajouter les biens progressivement selon le zoom.

### F3 — Search contient déjà les bons composants, mais l’expérience est fragmentée

**Vérifié dans le code.** Search possède :

- canonical filters ;
- `PropertySelectionProvider` ;
- quick preview ;
- compare dock ;
- map bridge ;
- price explorer ;
- modes Liste / Mixte / Carte.

**Décision :** N2/N3 doivent recomposer ces fondations, pas reconstruire une seconde Search.

### F4 — Listing est riche mais très long

**Vérifié visuellement.** Le desktop L17 possède une bonne colonne décisionnelle et une hiérarchie premium en haut, mais la page s’étire ensuite en une succession verticale très longue. Le mobile concentre énormément de sections dans un scroll continu.

**Conséquence :** bonne profondeur d’information, faible efficacité de navigation. La nouvelle cible doit améliorer la hiérarchie et les handoffs Map/Search sans supprimer la vérité existante.

### F5 — Publication propriétaire fonctionne ; incohérence sémantique à normaliser

**Correction d’audit.** Ce n’est **pas** un bug runtime.

`/listings/owner-*` est traité explicitement avant `canShowInternalListingDetail()`, donc `source_name="Propriétaire"` n’est pas bloqué par le fallback Registry.

Reste une dette de contrat :

- Search owner utilise `source_id="owner_declared"`, `source_name="Propriétaire"` ;
- owner detail expose `source_access_level="partner_full"` ;
- le Source Registry ne possède pas une classe owner explicite et classerait ce nom inconnu en `third_party_legacy` hors chemin spécial.

**Décision :** N1 harmonise la sémantique/provenance sans casser le chemin owner déjà fonctionnel.

### F6 — Buyer onboarding et publisher onboarding sont deux concepts différents

**Vérifié.** `app/onboarding/page.tsx` est une route legacy buyer/tenant qui redirige vers `/compagnon` ou `/accompagnement`.

En parallèle, `lib/property-schema/onboarding.ts` contient déjà le contrat dynamique du bien : identité, localisation, prix, surfaces, agencement, équipements, légal, média et droits média, conditionné par type/transaction/segment.

**Décision :** N8 réutilise ce schéma pour owner/agence/promoteur. Ne pas détourner le buyer onboarding.

### F7 — wording Map potentiellement daté

`app/map/page.tsx` annonce encore `Données indicatives 2024–2025` dans la metadata alors que la carte runtime utilise maintenant une intelligence observée plus structurée.

**Statut :** dette de wording à revalider, pas correction automatique dans N0.

### F8 — machine green ≠ excellence visuelle

Le Final UI smoke prouve structure/accessibilité/overflow, pas la qualité de composition ni la continuité produit. Le closeout Carte lui-même précise que sa certification historique ne prétend pas une copie pixel-perfect du mockup.

**Décision :** les lots du nouveau chantier exigent une revue humaine BEFORE / target / AFTER avec score, en plus des gates machine.

## Baseline visuelle — lecture humaine

### Map desktop

Points forts : carte dominante, modes marché clairs, zones certifiées, légende et sheet riches.

Écarts cible : toolbar très imposante, vaste espace cartographique sans inventaire de biens, panneau marché déconnecté d’une liste de résultats, pas de boucle scan résultat ↔ pin.

### Map mobile

Points forts : map-first réel, sheet repliée, bottom-nav claire.

Écarts cible : la carte reste un explorateur de zones ; le passage aux biens exige encore un handoff Search.

### Search desktop/mobile

Points forts : filtre clair, modes de vue déjà présents, bottom-nav mobile cohérente.

Écarts cible : surface séparée de la vraie intelligence Map ; le mode Carte n’est pas le cœur continu de la session ; l’état vide montre bien que Search sait gérer les fallbacks mais ne prouve pas encore la boucle cartographique complète.

### Listing desktop/mobile

Points forts : trust/provenance, marché/comparables, décision, Mon Projet et CTA bien présents.

Écarts cible : longueur élevée ; densité de lecture inégale sous le hero ; contexte cartographique insuffisamment intégré ; mobile trop linéaire.

### Vendre

Points forts : entrée owner claire, distinction publier / estimer / accompagner, standard AkarFinder déjà expliqué.

Écart cible : le standard doit devenir un contrat unique réutilisable par owner, agence et promoteur, pas seulement une promesse éditoriale.

## Fondations réutilisables validées

- Map navigation + listing map ;
- market intelligence / reliability / provenance ;
- geo precision / POI / Street Reality / Living Here ;
- canonical Search session + selection provider ;
- property schema + dynamic onboarding ;
- owner publication/projection/detail ;
- partner standards ;
- public property detail / comparables / history ;
- media rights et source access guards.

## Risques

1. Réécrire Map/Search au lieu de les recomposer.
2. Transformer la couche territoriale AkarFinder en simple copie Zillow.
3. Afficher des pins plus précis que la preuve source.
4. Mélanger market intelligence et inventaire commercial.
5. Faire trois onboardings divergents owner/agence/promoteur.
6. Considérer un test `0 finding` comme score UX.

## N0 — gate restant

Avant fermeture N0 :

1. verrouiller la référence visuelle du nouveau workspace Map/Search/Listing ;
2. comparer cette référence aux BEFORE exact-head déjà récupérés ;
3. inscrire le programme N0→N9 dans la roadmap globale canonique lors du closeout N0 ;
4. créer les critères précis N1/N2 avant toute implémentation runtime.

**Aucun code produit modifié dans N0. Aucun déploiement Vercel.**
