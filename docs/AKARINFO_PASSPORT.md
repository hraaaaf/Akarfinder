AKARINFO_PASSPORT.md — Passeport d'information AkarFinder
Version : 2026-07-06

Objectif

Le Passeport AkarInfo aide l'utilisateur à comprendre ce qu'il regarde sans
changer la doctrine Gateway et sans exposer publiquement les prix du
référentiel interne.

Le passeport montre :
* le niveau d'information disponible ;
* le type de source ;
* le rôle de la source originale ;
* les points à vérifier avant contact ;
* des repères quartier qualitatifs quand ils sont `public_safe=true`.

Ce que le passeport n'est pas

* pas une estimation de prix ;
* pas un badge de fiabilité absolue ;
* pas une validation juridique ;
* pas une promesse de disponibilité ;
* pas un score quartier chiffré.

Niveaux d'information

1. Aperçu limité
   Résultat web externe. AkarFinder montre un résumé prudent et redirige vers
   la source originale.

2. Fiche structurée
   Fiche AkarFinder structurée à partir de données autorisées ou first-party,
   avec préparation de lecture et points à vérifier.

3. Fiche enrichie
   Variante partenaire autorisée avec plus de contexte et d'actions possibles
   si le standard partenaire l'autorise.

Doctrines conservées

Résultat web externe :
* source originale obligatoire ;
* aperçu limité obligatoire ;
* aucun contact, aucune galerie, aucune page interne Gateway ;
* aucun prix interne du dataset marché.

Fiche structurée / enrichie :
* contexte et repères possibles ;
* vérifications terrain et source toujours nécessaires ;
* pas de prix marché, pas de prix officiel, pas de prix réel ;
* pas de quartier sûr / quartier dangereux.

Repères quartier autorisés

Le passeport peut afficher uniquement des labels qualitatifs issus du dataset
`lib/market-reference/*` via les helpers publics sûrs.

Exemples autorisés :
* Animation élevée
* Quartier très vivant
* Animation très élevée, tourisme urbain

Exemples interdits :
* prix du quartier
* médiane MAD/m²
* sous le marché
* au-dessus du marché
* quartier sûr
* quartier dangereux

Points à vérifier

Le passeport liste toujours des vérifications minimales avant contact :
* disponibilité réelle ;
* prix affiché et conditions ;
* localisation précise ;
* documents, charges, annexes utiles ;
* pour le neuf : plan, calendrier, réservation ;
* pour la location : loyer, charges, bail, mobilier.

Préparation future

Le passeport prépare des extensions futures sans les afficher publiquement dans
cette mission :
* fraîcheur source ;
* historique d'annonce ;
* repères internes complémentaires ;
* future intégration AkarInfo Passport + Price Position Reference V2.

Règle de sécurité publique

Les helpers du passeport ne doivent jamais faire remonter :
* `value_low`
* `value_median`
* `value_high`
* `evidence_ref`
* `confidence` associé à une donnée de prix

Le passeport public s'appuie uniquement sur :
* labels de source ;
* résumés prudents ;
* labels lifestyle qualitatifs ;
* points à vérifier.
