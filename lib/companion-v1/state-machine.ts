import { applySearchProfileEvent, profileIsSearchReady, type SearchProfileEvent } from "@/lib/search-profile-v2/profile-engine";
import { createEmptyDynamicSearchProfileV2, type DynamicSearchProfileV2, type IntendedUse, type NeighborhoodPreferenceKey, type PreferenceDirection, type Importance, type SearchObjective } from "@/lib/search-profile-v2/types";

export const COMPANION_STATE_MACHINE_VERSION = "1.0" as const;

export const COMPANION_STATES = [
  "ENTRY","OBJECTIF","USAGE","LOCALISATION","BUDGET","TYPE","CONTRAINTES_ABSOLUES","PREFERENCES","PRIORISATION","COMPROMIS","PROFIL_RECAP","RECHERCHE","TRI_PAR_ELIMINATION","AFFINAGE","NOUVELLE_RECHERCHE",
] as const;
export type CompanionState = (typeof COMPANION_STATES)[number];

export type CompanionSession = {
  version: typeof COMPANION_STATE_MACHINE_VERSION;
  state: CompanionState;
  profile: DynamicSearchProfileV2;
  revision: number;
  last_transition_at: string;
  eliminated_property_ids: string[];
  last_search_property_ids: string[];
};

export type CompanionPreferenceAnswer = {
  key: NeighborhoodPreferenceKey;
  direction: PreferenceDirection;
  importance: Importance;
  target?: number | null;
};

export type CompanionEvent =
  | { type: "start" }
  | { type: "answer_objective"; objective: SearchObjective }
  | { type: "answer_usage"; intended_uses: IntendedUse[] }
  | { type: "answer_location"; cities: string[] }
  | { type: "answer_budget"; purchase_max_mad?: number | null; rent_monthly_max_mad?: number | null; budget_flex_pct?: number }
  | { type: "answer_type"; property_types: string[] }
  | { type: "answer_constraints"; min_surface_m2?: number | null; min_bedrooms?: number | null; required_features?: string[]; works_accepted?: boolean | null }
  | { type: "answer_preferences"; preferences: CompanionPreferenceAnswer[] }
  | { type: "answer_priorities"; priorities: string[] }
  | { type: "answer_compromise"; tourism_intensity_max?: number | null }
  | { type: "revise_profile" }
  | { type: "confirm_profile" }
  | { type: "search_completed"; property_ids: string[] }
  | { type: "elimination_completed"; eliminated_property_ids: string[] }
  | { type: "refine"; profile_events: SearchProfileEvent[] }
  | { type: "restart_search" };

const EXPECTED_EVENT: Record<CompanionState, CompanionEvent["type"][]> = {
  ENTRY: ["start"],
  OBJECTIF: ["answer_objective"],
  USAGE: ["answer_usage"],
  LOCALISATION: ["answer_location"],
  BUDGET: ["answer_budget"],
  TYPE: ["answer_type"],
  CONTRAINTES_ABSOLUES: ["answer_constraints"],
  PREFERENCES: ["answer_preferences"],
  PRIORISATION: ["answer_priorities"],
  COMPROMIS: ["answer_compromise"],
  PROFIL_RECAP: ["revise_profile", "confirm_profile"],
  RECHERCHE: ["search_completed"],
  TRI_PAR_ELIMINATION: ["elimination_completed"],
  AFFINAGE: ["refine"],
  NOUVELLE_RECHERCHE: ["restart_search"],
};

export function createCompanionSession(now = new Date().toISOString()): CompanionSession {
  return { version: "1.0", state: "ENTRY", profile: createEmptyDynamicSearchProfileV2(now), revision: 0, last_transition_at: now, eliminated_property_ids: [], last_search_property_ids: [] };
}

function ensureExpected(session: CompanionSession, event: CompanionEvent) {
  if (!EXPECTED_EVENT[session.state].includes(event.type)) throw new Error(`COMPANION_INVALID_TRANSITION:${session.state}:${event.type}`);
}

export function transitionCompanionSession(session: CompanionSession, event: CompanionEvent, now = new Date().toISOString()): CompanionSession {
  ensureExpected(session, event);
  const next = structuredClone(session);
  next.revision += 1;
  next.last_transition_at = now;

  switch (event.type) {
    case "start": next.state = "OBJECTIF"; break;
    case "answer_objective": next.profile = applySearchProfileEvent(next.profile, { type: "objective", value: event.objective }, now); next.state = "USAGE"; break;
    case "answer_usage": next.profile = applySearchProfileEvent(next.profile, { type: "uses", values: event.intended_uses }, now); next.state = "LOCALISATION"; break;
    case "answer_location": next.profile = applySearchProfileEvent(next.profile, { type: "cities", values: event.cities }, now); next.state = "BUDGET"; break;
    case "answer_budget": next.profile = applySearchProfileEvent(next.profile, { type: "budget", purchase_max_mad: event.purchase_max_mad, rent_monthly_max_mad: event.rent_monthly_max_mad, budget_flex_pct: event.budget_flex_pct }, now); next.state = "TYPE"; break;
    case "answer_type": next.profile = applySearchProfileEvent(next.profile, { type: "property", property_types: event.property_types }, now); next.state = "CONTRAINTES_ABSOLUES"; break;
    case "answer_constraints": next.profile = applySearchProfileEvent(next.profile, { type: "property", min_surface_m2: event.min_surface_m2, min_bedrooms: event.min_bedrooms, required_features: event.required_features, works_accepted: event.works_accepted }, now); next.state = "PREFERENCES"; break;
    case "answer_preferences":
      for (const preference of event.preferences.slice(0, 20)) next.profile = applySearchProfileEvent(next.profile, { type: "preference", ...preference }, now);
      next.state = "PRIORISATION";
      break;
    case "answer_priorities": next.profile = applySearchProfileEvent(next.profile, { type: "priorities", values: event.priorities }, now); next.state = "COMPROMIS"; break;
    case "answer_compromise":
      if ("tourism_intensity_max" in event) next.profile = applySearchProfileEvent(next.profile, { type: "tourism_tolerance", max: event.tourism_intensity_max ?? null }, now);
      next.state = "PROFIL_RECAP";
      break;
    case "revise_profile": next.state = "OBJECTIF"; break;
    case "confirm_profile": {
      const readiness = profileIsSearchReady(next.profile);
      if (!readiness.ready) throw new Error(`COMPANION_PROFILE_NOT_READY:${readiness.missing.join(",")}`);
      next.state = "RECHERCHE";
      break;
    }
    case "search_completed": next.last_search_property_ids = [...new Set(event.property_ids)]; next.state = "TRI_PAR_ELIMINATION"; break;
    case "elimination_completed": next.eliminated_property_ids = [...new Set([...next.eliminated_property_ids, ...event.eliminated_property_ids])]; next.state = "AFFINAGE"; break;
    case "refine":
      for (const profileEvent of event.profile_events.slice(0, 20)) next.profile = applySearchProfileEvent(next.profile, profileEvent, now);
      next.state = "NOUVELLE_RECHERCHE";
      break;
    case "restart_search": next.state = "RECHERCHE"; break;
  }
  return next;
}

export function expectedCompanionEvents(state: CompanionState): readonly string[] {
  return EXPECTED_EVENT[state];
}
