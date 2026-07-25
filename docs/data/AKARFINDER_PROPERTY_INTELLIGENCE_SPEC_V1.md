# AKARFINDER PROPERTY INTELLIGENCE SPECIFICATION v1

**Statut :** CANONICAL_DESIGN_BASELINE  
**Portée :** Akar Intelligence Layer — propriété canonique  
**Doctrine :** une annonce est une observation ; une propriété est une entité ; l’intelligence est calculée, traçable et révocable.

## 1. Invariants

1. Ne jamais écraser une valeur source.
2. Chaque feature calculée conserve valeur, confiance, méthode, preuves, version et date.
3. `unknown` est une sortie valide et préférable à une inférence faible.
4. Une contradiction réduit la confiance et peut bloquer la publication.
5. Les scores ne consomment que des features admissibles selon leur propre politique.
6. Aucun score ne doit être présenté comme une vérité, une expertise réglementée ou une garantie de rendement.
7. Tout calcul doit être reproductible à partir d’un snapshot d’entrée et d’une version méthodologique.

## 2. Pipeline canonique

OBSERVATION → NORMALIZATION → CANONICALIZATION → FEATURE EXTRACTION → CONFIDENCE → PROPERTY INTELLIGENCE STORE → SCORE ENGINE → DISPLAY ELIGIBILITY → PUBLICATION.

## 3. Familles de features

- identity
- geometry
- distribution
- condition
- standing
- equipment
- environment
- neighborhood
- history
- reliability
- market_value
- intelligence

## 4. Contrat d’une feature

```ts
type PropertyFeatureObservation<T> = {
  propertyId: string;
  featureKey: string;
  value: T | null;
  confidence: number;
  status: "observed" | "inferred" | "unknown" | "conflicted";
  method: string;
  methodologyVersion: string;
  evidence: Array<{ source: string; excerpt?: string; observationId?: string }>;
  inputSnapshot: string;
  generatedAt: string;
};
```

## 5. Niveaux de confiance

- `0.00–0.39` : unusable
- `0.40–0.59` : internal_hint
- `0.60–0.79` : internal_usable
- `0.80–0.94` : public_candidate
- `0.95–1.00` : strongly_supported

Le registre peut imposer un seuil supérieur par feature.

## 6. Résolution des conflits

Priorité indicative :

1. champ partenaire certifié ;
2. attribut structuré de la source ;
3. plusieurs observations concordantes ;
4. description explicite ;
5. titre ;
6. inférence indirecte.

Deux preuves explicites incompatibles produisent `conflicted`, jamais une moyenne silencieuse.

## 7. Scores v1

- ACI — confiance et qualité des données ; certifiable en premier.
- AQI — qualité intrinsèque observable ; ne mesure pas la valeur financière.
- AVI — positionnement prix/qualité relatif ; bloqué sans référence locale fiable.
- AFI — adéquation famille ; contextualisé et non universel.
- AII — potentiel d’usage investissement ; non présenté comme conseil financier.
- ALI — liquidité estimée ; expérimental tant qu’aucun historique transactionnel fiable n’existe.

Chaque score retourne : valeur, intervalle de confiance, couverture des facteurs, version, explications et blockers.

## 8. Gates publics

Une feature ou un score n’est publiable que si :

- méthodologie autorisée ;
- confiance ≥ seuil du registre ;
- absence de conflit non résolu ;
- fraîcheur acceptable ;
- preuve non sensible et affichable ;
- couverture minimale des facteurs du score ;
- validation M4 du batch.

## 9. Hors certification v1

- analyse d’images ;
- luminosité déduite visuellement ;
- qualité de construction sans preuve ;
- rendement locatif garanti ;
- probabilité de vente ;
- coûts de rénovation ;
- sécurité réelle d’un quartier ;
- temps de trajet sans dataset certifié.

Ces éléments peuvent être expérimentés en interne, jamais activés implicitement.

## 10. Definition of Done

La fondation v1 est certifiée si :

- registre canonique versionné ;
- moteur de règles pur et déterministe ;
- moteur de confiance unifié ;
- store additif avec historique ;
- moteurs ACI/AQI avec blockers explicites ;
- tests de négation, contradiction et `unknown` ;
- migration additive et RLS ;
- aucune activation publique automatique.
