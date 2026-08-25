# AkarFinder — Neighborhood Context Intelligence — L4 VISUAL TARGET

Date : 2026-08-26
Base UI : `main@dc5b152f2cc69a9819ab8b3648edb916d92d4093`
Statut : **LOCKED BEFORE IMPLEMENTATION**

## Goal visuel

Ajouter sur `/map` une couche **Repères** décisionnelle, discrète et truth-safe, sans transformer les modes marché `Prix / Densité / Annonces` en annuaire de POI.

## Décision d’architecture UX

`Repères` est un **overlay indépendant** des modes Market Intelligence.

Pourquoi :
- Prix / Densité / Annonces répondent à « que dit le marché ? » ;
- Repères répond à « qu’est-ce qui structure la vie autour de ce quartier ? » ;
- l’utilisateur peut donc garder un fond Prix/Densité/Annonces et activer ou masquer les repères par-dessus.

## Semantic zoom verrouillé

### National
- 0 POI affiché ;
- aucun nuage de pins ;
- le contrôle Repères peut rester masqué tant qu’aucune ville n’est sélectionnée.

### Ville
- uniquement anchors `structural` si la donnée est exploitable ;
- maximum 3 repères visibles simultanément par défaut ;
- aucun label permanent envahissant.

### Quartier
- 5–8 anchors maximum selon `NeighborhoodContextReadModelV1` ;
- jamais de remplissage artificiel si le read-model est `insufficient | unavailable` ;
- catégories contextuelles disponibles : `Tous · Transport · Éducation · Santé · Courses · Parcs & sport · Services` ;
- maximum 2 anchors d’une même catégorie reste hérité de L2.

## Interaction cible

### Contrôle principal
Pill compacte `Repères` avec icône MapPin et compteur si quartier couvert.

États :
- off : neutre ;
- on : accent AkarFinder ;
- unavailable : masqué ou désactivé avec wording explicite, jamais bouton mort silencieux.

### Pins
- petites pastilles/icon pins sans gros label permanent ;
- identité visuelle par catégorie ;
- hover/focus desktop et tap mobile ;
- pin sélectionné mis en avant sans masquer la carte.

### Fiche POI
Compacte, pas un nouveau side-panel géant :
- nom ;
- catégorie ;
- wording territorial exact (`Dans le quartier` uniquement si relation certifiée, sinon `Autour du repère quartier`) ;
- distance au repère quartier si disponible ;
- provenance discrète ;
- **aucune durée de trajet** depuis le contexte quartier.

## Wireframe desktop

```text
┌──────────────────────────── CARTE ────────────────────────────┬──────────────┐
│ [Ville/quartier] [Prix] [Densité] [Annonces]   [📍 Repères] │ Decision rail│
│                                                               │ existant      │
│   [Tous][Transport][Éducation][Santé][Courses][Parcs][Services]│              │
│                                                               │              │
│            ○ école                    ◉ gare                   │              │
│                                                               │              │
│                        ● parc                                 │              │
│                                                               │              │
│     ┌─ POI sélectionné ─────────────────────┐                 │              │
│     │ Gare Rabat Agdal · Transport          │                 │              │
│     │ Autour du repère quartier · 650 m     │                 │              │
│     └───────────────────────────────────────┘                 │              │
└───────────────────────────────────────────────────────────────┴──────────────┘
```

## Wireframe mobile

```text
┌──────────────────────┐
│ Carte Agdal           │
│ [📍 Repères · 5]     │
│ [Tous][Transport]… → │
│                      │
│      ○      ◉        │
│          ●           │
│                      │
│ ┌──────────────────┐ │
│ │ Gare Rabat Agdal │ │
│ │ Transport        │ │
│ │ Autour du repère │ │
│ └──────────────────┘ │
└──────────────────────┘
```

## BEFORE obligatoire

16 captures sur le HEAD sans implémentation L4 :
- `national` ;
- `rabat-city` ;
- `rabat-agdal` ;
- `casablanca-maarif` ;
- 390×844 ; 430×932 ; 768×900 ; 1280×900.

Même matrice pour AFTER.

## Critères de succès UI

1. 0 POI au niveau national.
2. Ville : ≤3 anchors structurants visibles par défaut.
3. Quartier : ≤8 anchors, read-model uniquement.
4. Aucun POI publié si stale/rejected/unavailable.
5. Aucun faux `Dans le quartier`.
6. Aucune durée de trajet inventée.
7. Aucun overflow horizontal sur 390/430/768/1280.
8. 0 erreur navigateur critique.
9. Carte reste visuellement dominante.
10. Contrôles tactiles critiques ≥44 px sur mobile.
11. AFTER comparé au BEFORE et à ce target.
12. Score visuel cible ≥9,3/10.
13. Validation humaine obligatoire avant fermeture L4.

## Non-goals

- pas de refonte globale de `/map` ;
- pas de nouvelle taxonomie POI ;
- pas de nouvelle source de vérité ;
- pas de routing/isochrone quartier ;
- pas de Vercel.
