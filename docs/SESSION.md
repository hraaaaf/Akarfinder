# AkarFinder — Session courante

**Mise à jour : 2026-08-22**

Ce fichier est un **handover opérationnel court**. Il ne crée ni priorité, ni pourcentage, ni statut global autonome.

## Autorité canonique

- `docs/ROADMAP.md` = **unique vérité canonique** pour l’état global, l’ordre des chantiers et leur progression.
- une issue GitHub = contrat de scope d’un chantier ; elle ne remplace pas la roadmap.
- une PR = implémentation + preuves d’un lot ; une PR ouverte n’est pas, à elle seule, un chantier actif.
- `docs/SESSION.md` = miroir de reprise uniquement ; en cas d’écart, la roadmap prévaut et SESSION doit être corrigé.
- toute PR doublon, superseded ou issue d’une ancienne architecture doit être fermée ou explicitement revalidée avant reprise.
- ancien ledger roadmap détaillé : `main@05f74e8892b8d8958d86bbf2b2247e69b98d276f:docs/ROADMAP.md`.

## Chantier courant — Homepage Visual Reconciliation

Issue canonique de scope : `#849` — **Homepage Visual Reconciliation — HVR-1→HVR-6**.

Progression stricte : **1/6 lots CLOSED = 16,7 %**.

### HVR-1 — CLOSED

- PR `#850` ✅ MERGED
- merge squash : `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1`
- runtime HEAD certifié : `49877cf7924e3e757cc9f52902050b9c7572157f`
- HVR-1 Visual Proof : run `32563274184` SUCCESS
- artifact `9473438871`
- digest `sha256:75b23d0b5848830bc922c13a473ef9857bee422a2f95a409765e6a238b0929cc`
- 4/4 viewports 390 / 430 / 768 / 1280 ; findingCount 0 ; 0 overflow ; 0 console error
- Fidelity `32563274188` SUCCESS ; Hero `32563274191` SUCCESS ; Home Proof `32563274147` SUCCESS ; UI All Pages `32563274125` SUCCESS
- score visuel : **9,0/10**
- human visual gate : **APPROVED 2026-08-22**
- aucun backend/DB/ranking/source/Vercel.

### HVR-2 — NEXT

Goal : rendre **Explorer le Maroc** immédiatement actionnable.

- baseline BEFORE = AFTER HVR-1 certifié sur 390 / 430 / 768 / 1280 ;
- référence visuelle = mockup homepage validé avec cartes villes ;
- interaction cible : clic sur une carte ville → `/search?city=<ville>` directement ;
- supprimer l’étape actuelle « choisir une ville puis choisir Acheter/Louer/Investir/Neuf » ;
- Search conserve ses propres filtres de transaction ;
- aucun compteur d’annonces inventé ;
- tests : destination de chaque ville, clavier/accessibilité, 0 overflow, responsive ;
- AFTER mêmes viewports → comparaison → score → human gate.

### Lots suivants verrouillés

- HVR-3 : Biens à découvrir — vraies annonces, wording truth-safe.
- HVR-4 : Intelligence actionnable — supprimer/remplacer les blocs passifs.
- HVR-5 : Homepage complète + responsive polish.
- HVR-6 : benchmark final frais Zillow / Redfin / Realtor.com / Rightmove, score final visé ≥ 9/10.

## GitHub Hygiene & Single Source of Truth — fermé

- PR `#851` ✅ MERGED
- merge squash : `9359034d8587ee12e0bd2fce72bf791582b90a5c`
- scope : PR template + roadmap compacte + SESSION ; aucun runtime/DB/Registry/DATA/ranking/Vercel.
- **26 PR historiques / doublons / superseded fermées** pendant le ménage initial.

## Product Experience Reconciliation — fermé

Progression validée : **12/12 lots CLOSED = 100 %**.

Preuve P11 finale : PR `#848` MERGED ; run `32559337861` SUCCESS ; artifact `9472405507` ; 332/332 captures ; score 9,2/10 ; human gate APPROVED ; merge `669d040162eb39f25e904da065c1b197c09dc039`.

## Invariants

- UI/UX : BEFORE exact → Goal écrit → référence/mockup → implémentation → AFTER mêmes viewports → comparaison → score → human gate avant merge.
- aucune donnée, géographie, source, partenariat ou signal inventé.
- exact-head + preuve dédiée avant certification.
- CI en cours n’interrompt pas le travail indépendant.
- aucun déploiement Vercel sans autorisation explicite.
