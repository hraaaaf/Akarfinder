import type { CompanionSession } from "./state-machine";

export type CompanionQuestionPlan = {
  id: string;
  state: CompanionSession["state"];
  prompt: string;
  answer_type: "single_choice" | "multi_choice" | "number" | "location" | "constraints" | "profile_recap" | "action";
  options?: Array<{ value: string; label: string }>;
  rationale: string;
};

export function planCompanionQuestion(session: CompanionSession): CompanionQuestionPlan {
  switch (session.state) {
    case "ENTRY": return { id:"entry", state:"ENTRY", prompt:"Commençons votre recherche immobilière.", answer_type:"action", options:[{value:"start",label:"Commencer"}], rationale:"Initialise un nouveau projet de recherche." };
    case "OBJECTIF": return { id:"objective", state:"OBJECTIF", prompt:"Quel est l’objectif principal de cette recherche ?", answer_type:"single_choice", options:[{value:"buy",label:"Acheter"},{value:"rent",label:"Louer"},{value:"invest",label:"Investir"},{value:"new_build",label:"Acheter dans le neuf"},{value:"explore",label:"Explorer"}], rationale:"L’objectif détermine notamment le budget pertinent et la logique de recherche." };
    case "USAGE": return { id:"usage", state:"USAGE", prompt:"Quel usage prévoyez-vous pour ce bien ?", answer_type:"multi_choice", rationale:"L’usage structure les critères sans imposer un persona prédéfini." };
    case "LOCALISATION": return { id:"location", state:"LOCALISATION", prompt:"Dans quelles villes ou zones souhaitez-vous chercher ?", answer_type:"location", rationale:"Définit la zone préférée; la flexibilité sera traitée séparément." };
    case "BUDGET": return { id:"budget", state:"BUDGET", prompt:"Quel budget souhaitez-vous respecter ?", answer_type:"number", rationale:"Le budget devient une contrainte explicite, avec une flexibilité séparée." };
    case "TYPE": return { id:"property_type", state:"TYPE", prompt:"Quels types de biens acceptez-vous ?", answer_type:"multi_choice", rationale:"Évite d’inférer le type de bien depuis le profil personnel." };
    case "CONTRAINTES_ABSOLUES": return { id:"hard_constraints", state:"CONTRAINTES_ABSOLUES", prompt:"Quelles contraintes sont non négociables ?", answer_type:"constraints", rationale:"Sépare les éliminations absolues des simples préférences." };
    case "PREFERENCES": return { id:"preferences", state:"PREFERENCES", prompt:"Qu’est-ce qui compte le plus dans le quartier et le mode de vie ?", answer_type:"multi_choice", rationale:"Alimente les dimensions Neighborhood Intelligence et Property Fit." };
    case "PRIORISATION": return { id:"priorities", state:"PRIORISATION", prompt:"Parmi vos critères, lesquels doivent peser le plus dans le choix final ?", answer_type:"multi_choice", rationale:"Rend les poids explicites et auditables." };
    case "COMPROMIS": {
      const coastal = session.profile.neighborhood_preferences.find((p) => p.key === "coastal_lifestyle" && (p.importance === "high" || p.importance === "must"));
      const avoidTourism = session.profile.neighborhood_preferences.find((p) => p.key === "tourism_intensity" && (p.direction === "prefer_low" || p.direction === "avoid"));
      if (coastal && avoidTourism) return { id:"coast_vs_tourism", state:"COMPROMIS", prompt:"Vous privilégiez la proximité de la mer tout en souhaitant éviter les zones très touristiques. Jusqu’à quel niveau d’activité touristique êtes-vous prêt à faire un compromis ?", answer_type:"single_choice", options:[{value:"2",label:"Très faible uniquement"},{value:"4",label:"Faible à modérée"},{value:"6",label:"Modérée si le quartier reste agréable"}], rationale:"Résout une tension explicite entre deux préférences sans choisir à la place de l’utilisateur." };
      return { id:"general_tradeoff", state:"COMPROMIS", prompt:"Sur quels critères êtes-vous prêt à faire un compromis si aucun bien ne coche tout ?", answer_type:"multi_choice", rationale:"Transforme les préférences en tolérances explicites." };
    }
    case "PROFIL_RECAP": return { id:"profile_recap", state:"PROFIL_RECAP", prompt:"Voici votre projet de recherche. Confirmez-vous ce profil avant de lancer la recherche ?", answer_type:"profile_recap", rationale:"Empêche le moteur de lancer une recherche sur un profil implicite ou incomplet." };
    case "RECHERCHE": return { id:"search", state:"RECHERCHE", prompt:"Recherche structurée en cours à partir de votre profil confirmé.", answer_type:"action", rationale:"Orchestre Neighborhood Intelligence puis Property Fit." };
    case "TRI_PAR_ELIMINATION": return { id:"elimination", state:"TRI_PAR_ELIMINATION", prompt:"Écartons d’abord les biens qui contredisent vos contraintes absolues.", answer_type:"action", rationale:"Les hard mismatches sont traités avant les préférences." };
    case "AFFINAGE": return { id:"refine", state:"AFFINAGE", prompt:"Les meilleurs résultats impliquent encore des compromis. Quel critère souhaitez-vous ajuster ?", answer_type:"constraints", rationale:"Chaque ajustement modifie le SearchProfile avant une nouvelle recherche." };
    case "NOUVELLE_RECHERCHE": return { id:"new_search", state:"NOUVELLE_RECHERCHE", prompt:"Relancer la recherche avec le profil affiné ?", answer_type:"action", options:[{value:"restart_search",label:"Relancer"}], rationale:"Boucle déterministe vers RECHERCHE." };
  }
}
