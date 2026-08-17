# ANN-L11 — Pro & conversion — Visual Goal

## Goal

Transformer la zone de conversion de la fiche en une surface professionnelle, crédible et fail-closed, sans exposer un seul contact ou CTA non autorisé.

Le standard de comparaison est **AkarFinder ultra-premium**, pas un premium générique. Toute décision visuelle doit rester cohérente avec le design system public existant.

## Référentiel AkarFinder obligatoire

Source canonique : `components/ui/design-system.ts`.

- page : `#F8FAFC` ;
- texte principal : `#0B1F3A` / `#0B2545` ;
- action primaire : `#0B63CE` ;
- surfaces : blanc, bordure slate légère, ombre froide et contenue ;
- radius principal : `rounded-2xl` / environ 16–24 px selon la surface ;
- bronze : **accent de confiance uniquement** (eyebrow/badge), jamais gros CTA principal ;
- vert WhatsApp : réservé au canal WhatsApp, sans contaminer la palette globale ;
- aucun grand aplat coloré redondant si la même information est déjà visible dans le contenu principal.

### Principes premium

1. hiérarchie : confiance → identité pro → action → source ;
2. une action primaire AkarFinder clairement dominante ;
3. WhatsApp reste distinct mais secondaire au système de marque ;
4. zéro duplication prix/localisation dans la carte pro si déjà présents juste à gauche ;
5. actions secondaires compactes, jamais tassées ni concurrentes du CTA principal ;
6. respiration supérieure à densité : aucun libellé long comprimé à 390 px ;
7. cohérence desktop/mobile : même autorité CTA, présentation adaptée au viewport ;
8. le rendu doit sembler natif au reste d’AkarFinder, pas ajouté par-dessus.

## Baseline avant implémentation

- desktop : carte `Actions` séparée d'un bloc `Professionnel / source` encore placeholder ;
- mobile : dock Favori + Comparer + `Continuer dans Mon Projet`, sans matrice contact commune avec le desktop ;
- source originale visible quand l'URL existe.

Preuve baseline validée : run `31965408480`, 4/4 captures, 0 finding.

## Mockup canonique AkarFinder

### Desktop

```text
┌──────────────────────────────────────┐
│ PROFESSIONNEL / SOURCE              │  <- eyebrow primary AkarFinder
│ Nom professionnel        [Badge]    │
│ Attribution / preuve                │
│                                     │
│ [ Demander une visite ]             │  <- bleu #0B63CE
│ [ WhatsApp ]                        │  <- vert canal uniquement
│ [ Voir la source d'origine ]        │
│                                     │
│ [ Comparer ] [ Favori ]             │  <- secondaires sobres
│ [ Mon Projet ]                      │
│ Signaler cette annonce              │
└──────────────────────────────────────┘
```

Pas de duplication du prix ni de la localisation dans cette carte.

### Mobile dock

```text
[ Visite ] [ WhatsApp ]                <- CTA courts, 48 px min
[ ♡ ] [ ⇄ ] [ Mon Projet ]             <- secondaires compactes
```

ou, source-only :

```text
[ Voir la source d'origine ]
[ ♡ ] [ ⇄ ] [ Mon Projet ]
```

## Critères visuels de succès

- hiérarchie CTA principale immédiatement compréhensible ;
- aucun CTA contact si la policy ne l'autorise pas ;
- aucun téléphone/WhatsApp inféré ;
- badge commercial uniquement si statut réellement autorisé ;
- source d'origine toujours identifiable quand exigée ;
- dock mobile sans collision bottom-nav/safe-area ;
- 390 / 430 / 768 / 1280 : 0 overflow, 0 collision, 0 erreur console/ressource ;
- desktop et mobile consomment la même matrice métier, sans logique d'autorisation dupliquée dans React ;
- conformité palette AkarFinder : aucune couleur CTA hors primary/WhatsApp/neutral sans justification ;
- score premium cible : **≥ 9,2/10 global**, aucune dimension < 9,0/10.

## Score d’écart

Le score L11 doit comparer :

- baseline ;
- mockup canonique AkarFinder ci-dessus ;
- captures finales exact-head.

Le score de conformité fonctionnelle historique n'est pas suffisant : le standard premium prime.
