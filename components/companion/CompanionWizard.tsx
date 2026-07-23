"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from "lucide-react";
import { planCompanionQuestion } from "@/lib/companion-v1/question-planner";
import {
  createCompanionSession,
  type CompanionEvent,
  type CompanionPreferenceAnswer,
  type CompanionSession,
} from "@/lib/companion-v1/state-machine";
import { companionProfileToSearchParams } from "@/lib/companion-v1/search-entry";
import type {
  IntendedUse,
  NeighborhoodPreferenceKey,
  SearchObjective,
} from "@/lib/search-profile-v2/types";

const OBJECTIVES: Array<{ value: SearchObjective; label: string }> = [
  { value: "buy", label: "Acheter" },
  { value: "rent", label: "Louer" },
  { value: "invest", label: "Investir" },
  { value: "new_build", label: "Acheter dans le neuf" },
  { value: "explore", label: "Explorer" },
];

const USES: Array<{ value: IntendedUse; label: string }> = [
  { value: "primary_residence", label: "Résidence principale" },
  { value: "secondary_residence", label: "Résidence secondaire" },
  { value: "family_housing", label: "Logement familial" },
  { value: "long_term_rental_investment", label: "Location longue durée" },
  { value: "short_term_rental_investment", label: "Location courte durée" },
  { value: "pied_a_terre", label: "Pied-à-terre" },
  { value: "student_housing", label: "Logement étudiant" },
  { value: "retirement", label: "Retraite" },
];

const PROPERTY_TYPES = [
  { value: "Appartement", label: "Appartement" },
  { value: "Villa", label: "Villa" },
  { value: "Terrain", label: "Terrain" },
  { value: "Bureau", label: "Bureau" },
] as const;

const PREFERENCES: Array<{
  key: NeighborhoodPreferenceKey;
  label: string;
  direction: "prefer_high" | "prefer_low";
}> = [
  { key: "calmness", label: "Calme", direction: "prefer_high" },
  { key: "family_fit", label: "Vie familiale", direction: "prefer_high" },
  { key: "walkability", label: "Vie à pied", direction: "prefer_high" },
  { key: "commerce_access", label: "Commerces proches", direction: "prefer_high" },
  { key: "school_access", label: "Écoles accessibles", direction: "prefer_high" },
  { key: "public_transport", label: "Transports publics", direction: "prefer_high" },
  { key: "greenery", label: "Espaces verts", direction: "prefer_high" },
  { key: "coastal_lifestyle", label: "Proximité mer", direction: "prefer_high" },
  { key: "tourism_intensity", label: "Peu touristique", direction: "prefer_low" },
  { key: "development_momentum", label: "Potentiel de développement", direction: "prefer_high" },
];

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function projectName(session: CompanionSession): string {
  const objective = session.profile.objective?.value;
  const city = session.profile.location.preferred_cities[0];
  const objectiveLabel: Record<string, string> = {
    buy: "Achat",
    rent: "Location",
    invest: "Investissement",
    new_build: "Neuf",
    explore: "Exploration",
    compare: "Comparaison",
  };
  return [objective ? objectiveLabel[objective] ?? "Projet" : "Projet", city].filter(Boolean).join(" · ");
}

function ChoiceButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active === true}
      className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
        active
          ? "border-[#0B63CE] bg-[#EAF3FF] text-[#084FA8] shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#93C5FD] hover:bg-blue-50/60"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        {children}
        {active ? <Check size={16} aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

export function CompanionWizard() {
  const router = useRouter();
  const [session, setSession] = useState<CompanionSession>(() => createCompanionSession());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uses, setUses] = useState<IntendedUse[]>([]);
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minSurface, setMinSurface] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<NeighborhoodPreferenceKey[]>([]);
  const [tourismTolerance, setTourismTolerance] = useState<number | null>(4);

  const question = useMemo(() => planCompanionQuestion(session), [session]);

  async function transition(event: CompanionEvent) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/companion/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session, event }),
      });
      const payload = (await response.json()) as { session?: CompanionSession; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "TRANSITION_FAILED");
      setSession(payload.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }

  async function startSearch() {
    setPending(true);
    setError(null);
    const params = companionProfileToSearchParams(session.profile);

    // Never silently discard a completed guided project. Guests keep a local
    // recovery snapshot; authenticated users also persist it in Mon Projet.
    try {
      window.sessionStorage.setItem(
        "akarfinder-pending-project-v2",
        JSON.stringify({ profile: session.profile, companion_session: session }),
      );
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }

    try {
      const response = await fetch("/api/me/continuity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_project",
          name: projectName(session),
          profile: session.profile,
          companion_session: session,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as { result?: { id?: string } };
        if (payload.result?.id) params.set("project_id", payload.result.id);
      } else if (response.status !== 401) {
        console.warn("[companion] project persistence unavailable", response.status);
      }
    } catch (cause) {
      console.warn("[companion] project persistence failed; continuing to search", cause);
    }

    router.push(`/search?${params.toString()}`);
  }

  const shell = (content: React.ReactNode) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
            Étape {Math.min(session.revision + 1, 11)} · Compagnon AkarFinder
          </div>
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[#071B33] sm:text-2xl">{question.prompt}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{question.rationale}</p>
        </div>
      </div>
      {content}
      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );

  if (session.state === "ENTRY") {
    return shell(
      <button
        type="button"
        disabled={pending}
        onClick={() => transition({ type: "start" })}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#084FA8] disabled:opacity-60"
      >
        {pending ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
        Commencer
      </button>
    );
  }

  if (session.state === "OBJECTIF") {
    return shell(
      <div className="grid gap-3 sm:grid-cols-2">
        {OBJECTIVES.map((item) => (
          <ChoiceButton key={item.value} onClick={() => transition({ type: "answer_objective", objective: item.value })}>{item.label}</ChoiceButton>
        ))}
      </div>
    );
  }

  if (session.state === "USAGE") {
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          {USES.map((item) => (
            <ChoiceButton key={item.value} active={uses.includes(item.value)} onClick={() => setUses((current) => toggleValue(current, item.value))}>{item.label}</ChoiceButton>
          ))}
        </div>
        <button type="button" disabled={!uses.length || pending} onClick={() => transition({ type: "answer_usage", intended_uses: uses })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">
          Continuer <ArrowRight size={16} />
        </button>
      </>
    );
  }

  if (session.state === "LOCALISATION") {
    return shell(
      <div className="max-w-xl">
        <label className="text-sm font-bold text-slate-700" htmlFor="companion-city">Ville ou zone principale</label>
        <input id="companion-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ex. Casablanca, Rabat, Marrakech..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#60A5FA]" />
        <button type="button" disabled={!city.trim() || pending} onClick={() => transition({ type: "answer_location", cities: [city.trim()] })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">Continuer <ArrowRight size={16} /></button>
      </div>
    );
  }

  if (session.state === "BUDGET") {
    const renting = session.profile.objective?.value === "rent";
    return shell(
      <div className="max-w-xl">
        <label className="text-sm font-bold text-slate-700" htmlFor="companion-budget">{renting ? "Budget mensuel maximum (DH)" : "Budget d'achat maximum (DH)"}</label>
        <input id="companion-budget" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))} placeholder={renting ? "Ex. 12000" : "Ex. 1800000"} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#60A5FA]" />
        <button type="button" disabled={!Number(budget) || pending} onClick={() => transition(renting ? { type: "answer_budget", rent_monthly_max_mad: Number(budget) } : { type: "answer_budget", purchase_max_mad: Number(budget) })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">Continuer <ArrowRight size={16} /></button>
      </div>
    );
  }

  if (session.state === "TYPE") {
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROPERTY_TYPES.map((item) => <ChoiceButton key={item.value} active={propertyTypes.includes(item.value)} onClick={() => setPropertyTypes((current) => toggleValue(current, item.value))}>{item.label}</ChoiceButton>)}
        </div>
        <button type="button" disabled={!propertyTypes.length || pending} onClick={() => transition({ type: "answer_type", property_types: propertyTypes })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40">Continuer <ArrowRight size={16} /></button>
      </>
    );
  }

  if (session.state === "CONTRAINTES_ABSOLUES") {
    return shell(
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Surface minimale (m²)<input inputMode="numeric" value={minSurface} onChange={(event) => setMinSurface(event.target.value.replace(/[^0-9]/g, ""))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label>
          <label className="text-sm font-bold text-slate-700">Chambres minimum<input inputMode="numeric" value={minBedrooms} onChange={(event) => setMinBedrooms(event.target.value.replace(/[^0-9]/g, ""))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[{ value: "parking", label: "Parking indispensable" }, { value: "elevator", label: "Ascenseur indispensable" }].map((item) => (
            <ChoiceButton key={item.value} active={requiredFeatures.includes(item.value)} onClick={() => setRequiredFeatures((current) => toggleValue(current, item.value))}>{item.label}</ChoiceButton>
          ))}
        </div>
        <button type="button" disabled={pending} onClick={() => transition({ type: "answer_constraints", min_surface_m2: minSurface ? Number(minSurface) : null, min_bedrooms: minBedrooms ? Number(minBedrooms) : null, required_features: requiredFeatures })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Continuer <ArrowRight size={16} /></button>
      </>
    );
  }

  if (session.state === "PREFERENCES") {
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          {PREFERENCES.map((item) => <ChoiceButton key={item.key} active={preferences.includes(item.key)} onClick={() => setPreferences((current) => toggleValue(current, item.key))}>{item.label}</ChoiceButton>)}
        </div>
        <button type="button" disabled={pending} onClick={() => {
          const answers: CompanionPreferenceAnswer[] = preferences.map((key) => {
            const definition = PREFERENCES.find((item) => item.key === key)!;
            return { key, direction: definition.direction, importance: "high" };
          });
          transition({ type: "answer_preferences", preferences: answers });
        }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Continuer <ArrowRight size={16} /></button>
      </>
    );
  }

  if (session.state === "PRIORISATION") {
    return shell(
      <>
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Vos préférences sélectionnées seront prioritaires dans l'ordre où vous les avez choisies. Elles restent des préférences, pas des éliminations automatiques.</p>
        <button type="button" disabled={pending} onClick={() => transition({ type: "answer_priorities", priorities: preferences })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Valider les priorités <ArrowRight size={16} /></button>
      </>
    );
  }

  if (session.state === "COMPROMIS") {
    return shell(
      <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ value: 2, label: "Très faible" }, { value: 4, label: "Faible à modérée" }, { value: 6, label: "Modérée" }].map((item) => <ChoiceButton key={item.value} active={tourismTolerance === item.value} onClick={() => setTourismTolerance(item.value)}>{item.label}</ChoiceButton>)}
        </div>
        <button type="button" disabled={pending} onClick={() => transition({ type: "answer_compromise", tourism_intensity_max: tourismTolerance })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Continuer <ArrowRight size={16} /></button>
      </>
    );
  }

  if (session.state === "PROFIL_RECAP") {
    const profile = session.profile;
    return shell(
      <>
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <div><strong>Objectif :</strong> {profile.objective?.value ?? "—"}</div>
          <div><strong>Ville :</strong> {profile.location.preferred_cities.join(", ") || "—"}</div>
          <div><strong>Types :</strong> {profile.property.property_types.join(", ") || "—"}</div>
          <div><strong>Préférences :</strong> {profile.neighborhood_preferences.length}</div>
          <div><strong>Surface min. :</strong> {profile.property.min_surface_m2 ?? "—"}</div>
          <div><strong>Chambres min. :</strong> {profile.property.min_bedrooms ?? "—"}</div>
        </div>
        <button type="button" disabled={pending} onClick={() => transition({ type: "confirm_profile" })} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Confirmer mon projet <Check size={16} /></button>
      </>
    );
  }

  if (session.state === "RECHERCHE") {
    return shell(
      <>
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">Votre projet est structuré. AkarFinder peut maintenant lancer la recherche directe avec vos contraintes explicites ; le Fit personnalisé s'applique lorsqu'une donnée comparable est réellement disponible.</p>
        <button type="button" disabled={pending} onClick={startSearch} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          {pending ? "Enregistrement du projet…" : "Voir les résultats"}
        </button>
      </>
    );
  }

  return shell(
    <button type="button" onClick={() => router.push("/")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><ArrowLeft size={16} />Retour à l'accueil</button>
  );
}
