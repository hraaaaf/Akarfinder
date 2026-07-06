SIMILAR_PUBLIC_RESULTS.md

## 1. Objectif

Ajouter une couche publique prudente pour signaler que certains resultats du
web peuvent se ressembler dans une meme reponse de recherche.

Le but est d'aider l'utilisateur a comparer, jamais a accuser ou certifier.

## 2. Pourquoi “similaire possible” ≠ doublon confirme

Un resultat web externe peut partager plusieurs indices avec un autre :

* meme ville probable ;
* quartier proche ;
* type de bien proche ;
* prix proche si visible publiquement ;
* surface proche si visible publiquement ;
* titre proche.

Ces indices ne suffisent pas a prouver qu'il s'agit de la meme annonce.
AkarFinder parle donc uniquement de :

* `Résultat similaire possible`
* `Comparer les sources avant de contacter`

## 3. Signaux utilises

V1 compare uniquement les resultats d'une meme reponse.

Signaux autorises :

* meme ville probable ;
* meme quartier probable ;
* meme transaction type ;
* meme property type ;
* prix proche si deja visible dans le resultat ;
* surface proche si deja visible dans le resultat ;
* titre proche ;
* meme source ou source differente a comparer.

## 4. Signaux interdits

Jamais utilises :

* contact ;
* WhatsApp ;
* email ;
* galerie ;
* image ;
* donnees `market-reference` ;
* `value_low`, `value_median`, `value_high` ;
* `evidence_ref` ;
* `cache_key` ;
* score numerique public.

## 5. Wording public autorise

* `Résultat similaire possible`
* `Comparer les sources avant de contacter`
* `Informations proches d’un autre résultat`
* `À vérifier sur la source originale`

## 6. Wording public interdit

* `Doublon confirmé`
* `Annonce dupliquée`
* `Annonce copiée`
* `Arnaque`
* `Annonce suspecte`
* `Annonce fiable`
* `Annonce vérifiée`
* `Score de similarité`
* `Score de fiabilité`

## 7. Regles Gateway

Cette mission ne change pas la doctrine Gateway :

* resultat web externe ;
* apercu limite ;
* source originale obligatoire ;
* aucun contact ;
* aucune galerie ;
* aucune page interne `/listings` creee ;
* aucun changement de ranking.

## 8. Donnees non utilisees

La similarite publique ne depend pas :

* du cache Gateway ;
* de Supabase ;
* d'une migration ;
* d'un dataset prix interne ;
* d'un score numerique expose ;
* d'un hash interne expose.

## 9. Tests de securite

La suite couvre :

* cas positif prudent ;
* faux positifs a rejeter ;
* source differente a comparer ;
* zero resultat sans crash ;
* absence d'exposition de `similarity_score` ;
* absence d'exposition de `similarity_group_id` ;
* absence d'utilisation contact / image / galerie ;
* absence de wording interdit.

## 10. Limites V1

* comparaison limitee a une meme reponse ;
* moteur deterministe simple ;
* pas de preuve de doublon ;
* pas de comparaison inter-requetes ;
* pas de page de comparaison dediee ;
* pas de score visible publiquement.

## 11. Prochaines etapes

* observer le rendu avec plus de resultats reels quand le provider est moins limite ;
* decider si le checkpoint de comparaison doit etre enrichi ;
* seulement apres validation production, considerer une checklist publique de decision.
