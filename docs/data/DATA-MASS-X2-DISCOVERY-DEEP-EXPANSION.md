# DATA MASS-X2 — Discovery Deep Expansion

Objectif : augmenter les représentations `likely Morocco listing-detail` en shadow/read-only.

MASS-X2 ne remplace pas MASS-1. Une ligne ne peut être promue que si elle est déjà `likelyRealEstate=true`, `MOROCCO_LIKELY` et `AMBIGUOUS`, puis correspond à un pattern structurel verrouillé. Les catégories et non-immo restent exclues.

Audit read-only : baseline MASS-6 **24 505** ; gain structurel mesuré **+1 100** ; projection **25 605** URL representations. Cette projection n'est pas encore un nouveau total exact-head certifié et ne représente pas des biens uniques.

Gain : DabaAnnonce 563 ; MarrakechRealty 267 ; Yakeey 118 ; SouqCity listing-id 68 ; Jibril 40 ; SW Immobilier 27 ; Atlas 9 ; Loco 6 ; SouqCity ad-id 2.

Invariants : base classifier autoritaire ; candidate != authorization ; Source Registry autoritaire ; 0 DB/Registry/Search write ; 0 source/detail fetch ; 0 activation ; 0 permission inférée.
