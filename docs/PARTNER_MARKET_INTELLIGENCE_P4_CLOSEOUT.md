# AkarFinder — Partner Market Intelligence V2 — P4 Closeout

Date : 2026-08-24  
Statut : **P4 CLOSED — 4/5 lots certifiés = 80 %**

## Goal

Transformer la vérité canonique partenaire + résolution géographique P3 en métriques marché quartier observées, dédupliquées et fail-closed.

## Succès vérifié

- déduplication propriété canonique × transaction ;
- vente et location jamais mélangées ;
- inventaire éligible limité aux offres actives et autorisées ;
- volume conservé même si le prix manque ;
- prix/m² calculé seulement depuis prix + surface valides ;
- médiane + reliability issues du moteur existant ;
- catégories, fraîcheur, source count et provenance conservés ;
- densité calculée uniquement depuis une aire positive explicitement certifiée pour le même canonical neighborhood ID ;
- Yakeey reste un benchmark prix vente, jamais une source de volume ni d'aire ;
- représentativité marché reste explicitement `uncertified` ;
- comparaison historique NULL-safe.

## Preuve exact-head

- HEAD produit : `8907513d945a70de344bb76513bc7659483e0a7e`
- Workflow : `Partner Market Intelligence P4`
- Run : `32720134232`
- Job : `97409584679`
- Conclusion : **success**
- tests pipeline P2→P4 : **success**
- TypeScript : **success**
- production build : **success**

## Anomalies non bloquantes

- `npm ci` signale 5 vulnérabilités high dans l'arbre de dépendances : backlog sécurité séparé ;
- les actions GitHub v4 signalent la transition Node 20 → Node 24 côté runner ; P5 utilise explicitement Node 24 pour le projet.

## Non-goals confirmés

- aucune migration DB ;
- aucun write production ;
- aucun changement ranking/Search public ;
- aucun déploiement Vercel.

## Verdict

**P4 CLOSED.**

Next : **P5 — Activation & certification**.
