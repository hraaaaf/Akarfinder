# ANN-L11 — Pro & conversion — Visual Goal

## Goal

Transformer la zone de conversion de la fiche en une surface professionnelle, crédible et fail-closed, sans exposer un seul contact ou CTA non autorisé.

## Baseline attendue avant implémentation

- desktop : carte `Actions` séparée d'un bloc `Professionnel / source` encore placeholder ;
- mobile : dock Favori + Comparer + `Continuer dans Mon Projet`, sans matrice contact commune avec le desktop ;
- source originale visible quand l'URL existe.

## Référence / wireframe cible

### Desktop

```text
┌──────────────────────────────────┐
│ PROFESSIONNEL / SOURCE            │
│ Nom professionnel                 │
│ Badge commercial autorisé         │
│ Source / attribution              │
│                                  │
│ [ Demander une visite ]          │  <- seulement si autorisé
│ [ WhatsApp ] [ Téléphone ]       │  <- seulement si autorisés + donnée déclarée
│ [ Voir la source d'origine ]     │  <- selon policy
│                                  │
│ Favori · Comparer · Mon Projet   │  <- secondaires
│ Signaler cette annonce           │
└──────────────────────────────────┘
```

### Mobile dock

```text
[ Visite ] [ WhatsApp ]             <- si autorisés
ou
[ Voir la source ]                  <- indexed/source-only
+ actions secondaires accessibles sans concurrencer le CTA principal
```

## Critères visuels de succès

- hiérarchie CTA principale immédiatement compréhensible ;
- aucun CTA contact si la policy ne l'autorise pas ;
- aucun téléphone/WhatsApp inféré ;
- badge commercial uniquement si statut réellement autorisé ;
- source d'origine toujours identifiable quand exigée ;
- dock mobile sans collision bottom-nav/safe-area ;
- 390 / 430 / 768 / 1280 : 0 overflow, 0 collision, 0 erreur console/ressource ;
- desktop et mobile consomment la même matrice métier, sans logique d'autorisation dupliquée dans React.

## Scoring final

Le score UI L11 sera attribué uniquement après comparaison baseline / cible / captures finales et certification navigateur exact-head.
