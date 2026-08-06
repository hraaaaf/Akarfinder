"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Home,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { companionProfileToSearchParams } from "@/lib/companion-v1/search-entry";
import {
  createCompanionSession,
  type CompanionEvent,
  type CompanionPreferenceAnswer,
  type CompanionSession,
} from "@/lib/companion-v1/state-machine";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import type {
  IntendedUse,
  NeighborhoodPreferenceKey,
  SearchObjective,
} from "@/lib/search-profile-v2/types";

const TOTAL_STEPS = 8;
const STEP_LABELS = [
  "Votre projet",
  "Zone et budget",
  "Le bien recherché",
  "Votre quotidien",
  "Vos priorités",
  "Vos compromis",
  "Récapitulatif",
  "Lancer la recherche",
] as const;

const OBJECTIVES: Array<{ value: SearchObjective; label: string; detail: string; icon: typeof Home }> = [
  { value: "buy", label: "Acheter", detail: "Pour y vivre ou préparer un projet patrimonial", icon: Home },
  { value: "rent", label: "Louer", detail: "Trouver un logement adapté à votre quotidien", icon: Building2 },
  { value: "invest", label: "Investir", detail: "Structurer vos critères sans rendement promis", icon: WalletCards },
  { value: "new_build", label: "Acheter dans le neuf", detail: "Explorer les programmes et biens neufs", icon: Sparkles },
  { value: "explore", label: "Je précise encore mon projet", detail: "Commencer sans décision définitive", icon: Search },
];

const USES: Array<{ value: IntendedUse; label: string; objectives: SearchObjective[] }> = [
  { value: "primary_residence", label: "Résidence principale", objectives: ["buy", "new_build", "explore"] },
  { value: "secondary_residence", label: "Résidence secondaire", objectives: ["buy", "new_build", "explore"] },
  { value: "family_housing", label: "Logement familial", objectives: ["buy", "rent", "new_build", "explore"] },
  { value: "long_term_rental_investment", label: "Location longue durée", objectives: ["invest"] },
  { value: "pied_a_terre", label: "Pied-à-terre", objectives: ["buy", "rent", "new_build", "explore"] },
  { value: "student_housing", label: "Logement étudiant", objectives: ["rent", "invest", "explore"] },
  { value: "retirement", label: "Projet retraite", objectives: ["buy", "new_build", "explore"] },
];

const PREFERENCES: Array<{ key: NeighborhoodPreferenceKey; label: string; direction: "prefer_high" | "prefer_low" }> = [
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

function toggle<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function objectiveLabel(value: SearchObjective | null) {
  return OBJECTIVES.find((item) => item.value === value)?.label ?? "Projet à préciser";
}

function projectName(session: CompanionSession) {
  const objective = session.profile.objective?.value;
  const city = session.profile.location.preferred_cities[0];
  return [objective ? objectiveLabel(objective) : "Mon Projet", city].filter(Boolean).join(" · ");
}

function ChoiceButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border p-4 text-left transition ${active ? "border-[#0B63CE] bg-[#EAF3FF] text-[#084FA8] shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-[#93C5FD] hover:bg-blue-50/50"}`}
    >
      <span className="flex items-center justify-between gap-3 text-sm font-extrabold">{children}{active ? <Check size={16} aria-hidden="true" /> : null}</span>
    </button>
  );
}

export function MonProjetWizardP1A() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [session, setSession] = useState<CompanionSession>(() => createCompanionSession());
  const [objective, setObjective] = useState<SearchObjective | null>(null);
  const [uses, setUses] = useState<IntendedUse[]>([]);
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetUnknown, setBudgetUnknown] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minSurface, setMinSurface] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<NeighborhoodPreferenceKey[]>([]);
  const [priorities, setPriorities] = useState<NeighborhoodPreferenceKey[]>([]);
  const [centralityCalm, setCentralityCalm] = useState<"calm" | "balanced" | "central">("balanced");
  const [surfaceLocation, setSurfaceLocation] = useState<"surface" | "balanced" | "location">("balanced");
  const [showMorePreferences, setShowMorePreferences] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me/continuity", { method: "GET" })
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  const allowedUses = useMemo(() => objective ? USES.filter((item) => item.objectives.includes(objective)) : [], [objective]);
  const allowedPropertyTypes = useMemo(() => {
    if (objective === "rent") return OPTION_A_PROPERTY_TYPES.filter((item) => item.value !== "Terrain");
    return OPTION_A_PROPERTY_TYPES;
  }, [objective]);
  const visiblePreferences = showMorePreferences ? PREFERENCES : PREFERENCES.slice(0, 6);

  async function runEvents(base: CompanionSession, events: CompanionEvent[]) {
    let current = base;
    for (const event of events) {
      const response = await fetch("/api/companion/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: current, event }),
      });
      const payload = await response.json() as { session?: CompanionSession; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "TRANSITION_FAILED");
      current = payload.session;
    }
    return current;
  }

  async function applyEvents(events: CompanionEvent[]) {
    setPending(true);
    setError(null);
    try {
      const current = await runEvents(session, events);
      setSession(current);
      setStep((value) => Math.min(TOTAL_STEPS, value + 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }

  function eventsBeforeStep(targetStep: number): CompanionEvent[] {
    const events: CompanionEvent[] = [];
    if (targetStep >= 2 && objective) events.push({ type: "start" }, { type: "answer_objective", objective }, { type: "answer_usage", intended_uses: uses });
    if (targetStep >= 3) events.push({ type: "answer_location", cities: [city.trim()] }, objective === "rent" ? { type: "answer_budget", rent_monthly_max_mad: budgetUnknown ? null : Number(budget) } : { type: "answer_budget", purchase_max_mad: budgetUnknown ? null : Number(budget) });
    if (targetStep >= 4) events.push({ type: "answer_type", property_types: propertyTypes }, { type: "answer_constraints", min_surface_m2: minSurface ? Number(minSurface) : null, min_bedrooms: minBedrooms ? Number(minBedrooms) : null, required_features: requiredFeatures });
    if (targetStep >= 5) {
      const answers: CompanionPreferenceAnswer[] = preferences.map((key) => {
        const definition = PREFERENCES.find((item) => item.key === key)!;
        return { key, direction: definition.direction, importance: "high" };
      });
      events.push({ type: "answer_preferences", preferences: answers });
    }
    if (targetStep >= 6) events.push({ type: "answer_priorities", priorities });
    if (targetStep >= 7) events.push({ type: "answer_compromise", tourism_intensity_max: centralityCalm === "calm" ? 2 : centralityCalm === "balanced" ? 4 : 6 });
    if (targetStep >= 8) events.push({ type: "confirm_profile" });
    return events;
  }

  async function goBack() {
    if (step === 1 || pending) return;
    const targetStep = step - 1;
    setPending(true);
    setError(null);
    try {
      const rebuilt = await runEvents(createCompanionSession(), eventsBeforeStep(targetStep));
      setSession(rebuilt);
      setStep(targetStep);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }

  async function launchSearch() {
    setPending(true);
    setError(null);
    const params = companionProfileToSearchParams(session.profile);
    try {
      window.sessionStorage.setItem("akarfinder-pending-project-v2", JSON.stringify({ profile: session.profile, companion_session: session }));
    } catch {
      // Temporary browser continuity is optional.
    }
    try {
      const response = await fetch("/api/me/continuity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_project", name: projectName(session), profile: session.profile, companion_session: session }),
      });
      if (response.ok) {
        const payload = await response.json() as { result?: { id?: string } };
        if (payload.result?.id) params.set("project_id", payload.result.id);
      }
    } catch {
      // Search must remain available when persistence is unavailable.
    }
    router.push(`/search?${params.toString()}`);
  }

  const selectedBudget = session.profile.objective?.value === "rent" ? session.profile.budget.rent_monthly_max_mad : session.profile.budget.purchase_max_mad;
  const summary = `${objectiveLabel(session.profile.objective?.value ?? null)}${session.profile.location.preferred_cities[0] ? ` à ${session.profile.location.preferred_cities[0]}` : ""}${session.profile.property.property_types.length ? `, pour ${session.profile.property.property_types.join(" ou ").toLowerCase()}` : ""}${selectedBudget ? `, jusqu’à ${selectedBudget.toLocaleString("fr-FR")} DH${session.profile.objective?.value === "rent" ? "/mois" : ""}` : ", budget encore à préciser"}.`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Mon Projet · environ 2 minutes</p>
            <p className="mt-1 text-sm font-extrabold text-[#071B33]">Étape {step} sur {TOTAL_STEPS} · {STEP_LABELS[step - 1]}</p>
          </div>
          {step > 1 ? <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600"><ArrowLeft size={14} />Retour</button> : null}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0B63CE] transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} /></div>
      </div>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:p-8">
        {step === 1 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Votre projet</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33] sm:text-5xl">Que cherchez-vous à accomplir ?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">Choisissez votre objectif principal. Vous pourrez modifier chaque critère avant de lancer la recherche.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{OBJECTIVES.map(({ value, label, detail, icon: Icon }) => <button key={value} type="button" onClick={() => { setObjective(value); setUses([]); }} className={`rounded-2xl border p-5 text-left transition ${objective === value ? "border-[#0B63CE] bg-[#EAF3FF]" : "border-slate-200 hover:border-[#93C5FD]"}`}><Icon size={20} className="text-[#0B63CE]" /><span className="mt-4 block text-base font-extrabold text-[#071B33]">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></button>)}</div>
          {objective ? <div className="mt-7"><p className="mb-3 text-sm font-extrabold text-[#071B33]">Quel usage correspond le mieux ?</p><div className="grid gap-3 sm:grid-cols-2">{allowedUses.map((item) => <ChoiceButton key={item.value} active={uses.includes(item.value)} onClick={() => setUses((current) => toggle(current, item.value))}>{item.label}</ChoiceButton>)}</div></div> : null}
          <button type="button" disabled={!objective || !uses.length || pending} onClick={() => applyEvents([{ type: "start" }, { type: "answer_objective", objective: objective! }, { type: "answer_usage", intended_uses: uses }])} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 2 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Zone et budget</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Où cherchez-vous, et avec quel budget ?</h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="text-sm font-extrabold text-slate-700"><span className="inline-flex items-center gap-2"><MapPin size={16} />Ville ou zone principale</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Rabat, Casablanca, Hay Riad…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label><label className="text-sm font-extrabold text-slate-700"><span className="inline-flex items-center gap-2"><WalletCards size={16} />{objective === "rent" ? "Budget mensuel maximum" : "Budget d’achat maximum"}</span><input disabled={budgetUnknown} inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))} placeholder={objective === "rent" ? "12 000 DH" : "1 800 000 DH"} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none disabled:bg-slate-50 disabled:text-slate-400" /></label></div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"><input type="checkbox" checked={budgetUnknown} onChange={(event) => { setBudgetUnknown(event.target.checked); if (event.target.checked) setBudget(""); }} />Je ne sais pas encore</label>
          <button type="button" disabled={!city.trim() || (!budgetUnknown && !Number(budget)) || pending} onClick={() => applyEvents([{ type: "answer_location", cities: [city.trim()] }, objective === "rent" ? { type: "answer_budget", rent_monthly_max_mad: budgetUnknown ? null : Number(budget) } : { type: "answer_budget", purchase_max_mad: budgetUnknown ? null : Number(budget) }])} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 3 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Le bien recherché</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Quels biens et contraintes sont vraiment importants ?</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{allowedPropertyTypes.map((item) => <button type="button" key={item.value} onClick={() => setPropertyTypes((current) => toggle(current, item.value))} className={`overflow-hidden rounded-2xl border p-2.5 text-left ${propertyTypes.includes(item.value) ? "border-[#0B63CE] bg-[#EAF3FF]" : "border-slate-200"}`}><div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-50"><PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative /></div><span className="mt-2 block px-1 text-xs font-extrabold">{item.pluralLabel}</span></button>)}</div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Surface minimale (m²)<input inputMode="numeric" value={minSurface} onChange={(event) => setMinSurface(event.target.value.replace(/[^0-9]/g, ""))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label><label className="text-sm font-bold text-slate-700">Chambres minimum<input inputMode="numeric" value={minBedrooms} onChange={(event) => setMinBedrooms(event.target.value.replace(/[^0-9]/g, ""))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ value: "parking", label: "Parking indispensable" }, { value: "elevator", label: "Ascenseur indispensable" }].map((item) => <ChoiceButton key={item.value} active={requiredFeatures.includes(item.value)} onClick={() => setRequiredFeatures((current) => toggle(current, item.value))}>{item.label}</ChoiceButton>)}</div>
          <button type="button" disabled={!propertyTypes.length || pending} onClick={() => applyEvents([{ type: "answer_type", property_types: propertyTypes }, { type: "answer_constraints", min_surface_m2: minSurface ? Number(minSurface) : null, min_bedrooms: minBedrooms ? Number(minBedrooms) : null, required_features: requiredFeatures }])} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 4 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Votre quotidien</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Qu’est-ce qui compte autour du bien ?</h2><p className="mt-3 text-sm leading-6 text-slate-500">Ces préférences seront utilisées uniquement lorsque les données de quartier sont disponibles. Elles ne masqueront pas automatiquement les autres résultats.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{visiblePreferences.map((item) => <ChoiceButton key={item.key} active={preferences.includes(item.key)} onClick={() => setPreferences((current) => toggle(current, item.key))}>{item.label}</ChoiceButton>)}</div>
          <button type="button" onClick={() => setShowMorePreferences((value) => !value)} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#0B63CE]">{showMorePreferences ? "Réduire" : "Voir plus"}<ChevronDown size={15} className={showMorePreferences ? "rotate-180" : ""} /></button>
          <button type="button" disabled={pending} onClick={() => { const answers: CompanionPreferenceAnswer[] = preferences.map((key) => { const definition = PREFERENCES.find((item) => item.key === key)!; return { key, direction: definition.direction, importance: "high" }; }); void applyEvents([{ type: "answer_preferences", preferences: answers }]); }} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 5 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Vos priorités</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Choisissez jusqu’à trois priorités majeures.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Elles guideront le classement lorsque les informations comparables existent.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{preferences.map((key) => { const item = PREFERENCES.find((entry) => entry.key === key)!; return <ChoiceButton key={key} active={priorities.includes(key)} onClick={() => setPriorities((current) => current.includes(key) ? current.filter((value) => value !== key) : current.length < 3 ? [...current, key] : current)}>{priorities.includes(key) ? `${priorities.indexOf(key) + 1}. ` : ""}{item.label}</ChoiceButton>; })}</div>
          {!preferences.length ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Vous n’avez sélectionné aucune préférence. Vous pouvez continuer sans priorité.</p> : null}
          <button type="button" disabled={pending || (preferences.length > 0 && priorities.length === 0)} onClick={() => applyEvents([{ type: "answer_priorities", priorities }])} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 6 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Vos compromis</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Où êtes-vous prêt à faire un compromis ?</h2>
          <div className="mt-7 space-y-6"><div><p className="mb-3 text-sm font-extrabold">Centralité ou calme</p><div className="grid gap-3 sm:grid-cols-3">{[{ value: "calm", label: "Priorité au calme" }, { value: "balanced", label: "Équilibre" }, { value: "central", label: "Priorité à la centralité" }].map((item) => <ChoiceButton key={item.value} active={centralityCalm === item.value} onClick={() => setCentralityCalm(item.value as typeof centralityCalm)}>{item.label}</ChoiceButton>)}</div></div><div><p className="mb-3 text-sm font-extrabold">Surface ou localisation</p><div className="grid gap-3 sm:grid-cols-3">{[{ value: "surface", label: "Plus de surface" }, { value: "balanced", label: "Équilibre" }, { value: "location", label: "Meilleure localisation" }].map((item) => <ChoiceButton key={item.value} active={surfaceLocation === item.value} onClick={() => setSurfaceLocation(item.value as typeof surfaceLocation)}>{item.label}</ChoiceButton>)}</div></div></div>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Ces choix restent des indications explicites. Ils ne produisent aucune prédiction et n’éliminent aucun bien silencieusement.</p>
          <button type="button" disabled={pending} onClick={() => applyEvents([{ type: "answer_compromise", tourism_intensity_max: centralityCalm === "calm" ? 2 : centralityCalm === "balanced" ? 4 : 6 }])} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Continuer <ArrowRight size={16} /></button>
        </> : null}

        {step === 7 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Récapitulatif</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Voici le projet que vous avez structuré.</h2><p className="mt-5 rounded-2xl bg-[#EAF3FF] p-5 text-base font-bold leading-7 text-[#084FA8]">{summary}</p>
          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-2"><div><strong>Usage :</strong> {session.profile.intended_uses?.value?.length ? session.profile.intended_uses.value.length : 0} sélectionné(s)</div><div><strong>Types :</strong> {session.profile.property.property_types.join(", ") || "—"}</div><div><strong>Surface min. :</strong> {session.profile.property.min_surface_m2 ? `${session.profile.property.min_surface_m2} m²` : "Non précisée"}</div><div><strong>Chambres :</strong> {session.profile.property.min_bedrooms ?? "Non précisées"}</div><div><strong>Préférences :</strong> {session.profile.neighborhood_preferences.length}</div><div><strong>Priorités :</strong> {session.profile.priorities.length}</div></div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-slate-700"><ArrowLeft size={16} />Modifier mes critères</button><button type="button" disabled={pending} onClick={() => applyEvents([{ type: "confirm_profile" }])} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40">Confirmer Mon Projet <Check size={16} /></button></div>
        </> : null}

        {step === 8 ? <>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={26} /></div><p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Votre projet est prêt</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Lancez une recherche structurée, sans promesse fabriquée.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">Le Fit personnalisé sera calculé uniquement lorsque les données comparables sont disponibles. Sinon, il sera indiqué comme non calculé.</p>
          <div className={`mt-6 rounded-2xl border p-5 text-sm leading-6 ${authenticated ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{authenticated ? "Votre projet sera enregistré dans votre espace et accompagnera cette recherche." : "Votre projet accompagne cette recherche sur cet appareil. Connectez-vous pour le retrouver plus tard."}</div>
          <button type="button" disabled={pending} onClick={launchSearch} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-6 text-sm font-extrabold text-white disabled:opacity-50 sm:w-auto">{pending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}{pending ? "Préparation de la recherche…" : "Lancer ma recherche"}</button>
        </> : null}

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Une étape n’a pas pu être validée. Réessayez sans perdre vos réponses.</p> : null}
      </section>
    </div>
  );
}
