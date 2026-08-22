# Chantier

- **Roadmap / chantier canonique** :
- **Issue de chantier** :
- **Lot** :
- **Goal** :
- **Succès observable** :
- **Preuve attendue** :

## Scope

- Inclus :
- Hors scope :
- Supersède :
- Dépend de :

## Contrat de vérité unique

- [ ] `docs/ROADMAP.md` contient déjà cet état, ou la mise à jour canonique est incluse dans cette PR.
- [ ] Cette PR ne redéfinit pas l’avancement global du chantier en dehors de `docs/ROADMAP.md`.
- [ ] `docs/SESSION.md` reste un handover court et ne contredit pas `docs/ROADMAP.md`.
- [ ] Une seule PR d’implémentation est active pour ce lot exact ; les doublons/superseded sont fermés.
- [ ] Si cette PR devient superseded, elle sera fermée au lieu de rester ouverte comme faux chantier actif.

## Sécurité / production

- DB / migration : aucune, sauf mention explicite ci-dessous.
- Vercel : **aucun déploiement sans autorisation explicite**.
- Données / Registry / permissions : aucune mutation implicite.

## Validation

- [ ] tests proportionnels au risque
- [ ] exact-head vérifié avant certification
- [ ] preuves et limites documentées
- [ ] si UI/UX : BEFORE → Goal → référence/mockup → AFTER mêmes viewports → score → human gate

## Closeout

- [ ] `docs/ROADMAP.md` mis à jour avec l’état réellement prouvé
- [ ] `docs/SESSION.md` synchronisé si ce lot est le chantier courant
- [ ] PR précédentes devenues obsolètes fermées
- [ ] aucun statut `CLOSED`, `CERTIFIED`, `production ready` ou pourcentage non prouvé
