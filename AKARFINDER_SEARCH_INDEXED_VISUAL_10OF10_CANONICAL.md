# AKARFINDER_SEARCH_INDEXED_VISUAL_10OF10_CANONICAL.md

## Chantier
AkarFinder — Search Indexed Visual — 10/10 pass

Dernière mise à jour : 2026-08-28

## Goal
Faire converger les cartes `public_indexed` vers le mockup premium approuvé, illustrations **et carte complète**, sans modifier les cartes partenaires/utilisateurs, le ranking, la data ni la DB.

## Succès observable
- TARGET : mockup utilisateur `Concept premium — Système visuel par type de transaction`.
- AFTER : 390×844 / 430×932 / 768×900 / 1280×900 sur le vrai composant `SearchListingCardDark`.
- Achat : maison + pin + clé + skyline légère.
- Location : porte arquée ouverte + petite clé verticale + ville légère + chemin d’entrée.
- Neuf : grue treillis + crochet + structure ouverte de chantier.
- carte : prix groupé, cœur en haut à droite, type + chambres + surface + SDB avec petites icônes, footer source.
- aucune photo tierce pour `public_indexed`.
- aucune collision/clipping.
- findings Chromium = 0.

## État repo
- Repo : `hraaaaf/Akarfinder`
- Branche : `feat/search-indexed-visual-10of10`
- PR : `#947`
- HEAD fonctionnel final : `6b0acdd238319a57923f88bd3674e16d3ebc53ec`
- Vercel : aucun déploiement effectué.

## Preuve finale — HEAD `6b0acdd238319a57923f88bd3674e16d3ebc53ec`
- UI All Pages Baseline `33217768261` ✅
- UI All Pages Certification `33217768355` ✅
- artifact baseline `9704158708` ✅
- digest `sha256:39b5cc842332ec5a9b334173aece1399bd938e030713d45e8f5b70d248cb5eb4`
- findings Chromium : `0` ✅
- AFTER 390×844 / 430×932 / 768×900 / 1280×900 inspectés ✅
- collision mobile `ANNONCE INDEXÉE` / cœur corrigée et vérifiée ✅

## Résultat vérifié
- Achat / Location / Neuf conformes au TARGET visuel retenu.
- Prix indexés groupés avec séparateurs lisibles.
- Cœur affiché en haut à droite.
- Ligne de faits avec icônes : type, chambres, surface, salles de bain.
- Footer source conservé.
- Aucune photo tierce affichée sur `public_indexed`.
- Cartes partenaires/utilisateurs inchangées par ce lot.
- Aucun changement ranking/data/DB.

## CI globale hors diff
Des workflows historiques plus larges restent rouges hors diff. Ils ne sont pas présentés comme verts. Les preuves exact-HEAD pertinentes du lot sont les deux certifications Chromium ci-dessus, toutes deux vertes.

## Closeout
- preuve visuelle : acquise ;
- canonique : à jour ;
- PR : prêt pour passage ready puis merge si mergeabilité confirmée ;
- post-merge : vérifier `main` ;
- aucun déploiement Vercel sans autorisation explicite.

## Avancement
**Fonctionnellement certifié — closeout Git en cours.**
