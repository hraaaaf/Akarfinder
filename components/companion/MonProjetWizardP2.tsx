"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Home, Search, Sparkles } from "lucide-react";

import { companionProfileToSearchParams } from "@/lib/companion-v1/search-entry";
import {
  createCompanionSession,
  type CompanionEvent,
  type CompanionPreferenceAnswer,
  type CompanionSession,
} from "@/lib/companion-v1/state-machine";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import type { IntendedUse, NeighborhoodPreferenceKey, SearchObjective } from "@/lib/search-profile-v2/types";

const STEP_LABELS = ["Mon besoin", "Mon quotidien", "Mes priorités"] as const;

const OBJECTIVES: Array<{ value: SearchObjective; label: string }> = [
  { value: "buy", label: "Acheter" },
  { value: "rent", label: "Louer" },
  { value: "invest", label: "Investir" },
  { value: "new_build", label: "Neuf" },
  { value: "explore", label: "Explorer" },
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
  { key: "commerce_access", label: "Commerces", direction: "prefer_high" },
  { key: "school_access", label: "Écoles", direction: "prefer_high" },
  { key: "public_transport", label: "Transports", direction: "prefer_high" },
  { key: "greenery", label: "Espaces verts", direction: "prefer_high" },
  { key: "coastal_lifestyle", label: "Proximité mer", direction: "prefer_high" },
  { key: "centrality", label: "Centralité", direction: "prefer_high" },
  { key: "car_accessibility", label: "Accès voiture", direction: "prefer_high" },
];

function toggle<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Choice({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${active ? "border-[#0B63CE] bg-[#EAF3FF] text-[#084FA8]" : "border-slate-200 bg-white text-slate-700 hover:border-[#93C5FD]"}`}>
      <span className="flex items-center justify-between gap-2">{children}{active ? <Check size={15} /> : null}</span>
    </button>
  );
}

export function MonProjetWizardP2() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [objective, setObjective] = useState<SearchObjective | null>(null);
  const [uses, setUses] = useState<IntendedUse[]>([]);
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetUnknown, setBudgetUnknown] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minSurface, setMinSurface] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [childrenCount, setChildrenCount] = useState("");
  const [remoteWork, setRemoteWork] = useState(false);
  const [anchorLabel, setAnchorLabel] = useState("");
  const [anchorMinutes, setAnchorMinutes] = useState("");
  const [preferences, setPreferences] = useState<NeighborhoodPreferenceKey[]>([]);
  const [priorities, setPriorities] = useState<NeighborhoodPreferenceKey[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedUses = useMemo(() => objective ? USES.filter((item) => item.objectives.includes(objective)) : [], [objective]);
  const allowedPropertyTypes = useMemo(() => objective === "rent" ? OPTION_A_PROPERTY_TYPES.filter((item) => item.value !== "Terrain") : OPTION_A_PROPERTY_TYPES, [objective]);

  async function runEvents(events: CompanionEvent[]) {
    let current = createCompanionSession();
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

  function needEvents(): CompanionEvent[] {
    if (!objective) return [];
    return [
      { type: "start" },
      { type: "answer_objective", objective },
      { type: "answer_usage", intended_uses: uses },
      { type: "answer_location", cities: [city.trim()] },
      objective === "rent"
        ? { type: "answer_budget", rent_monthly_max_mad: budgetUnknown ? null : Number(budget) }
        : { type: "answer_budget", purchase_max_mad: budgetUnknown ? null : Number(budget) },
      { type: "answer_type", property_types: propertyTypes },
      { type: "answer_constraints", min_surface_m2: minSurface ? Number(minSurface) : null, min_bedrooms: minBedrooms ? Number(minBedrooms) : null, required_features: requiredFeatures },
    ];
  }

  function dailyEvents(): CompanionEvent[] {
    const answers: CompanionPreferenceAnswer[] = preferences.map((key) => {
      const item = PREFERENCES.find((definition) => definition.key === key)!;
      return { key, direction: item.direction, importance: "high" };
    });
    const anchors = anchorLabel.trim() ? [{ label: anchorLabel.trim(), city: city.trim() || undefined, max_minutes: anchorMinutes ? Number(anchorMinutes) : undefined }] : [];
    return [
      { type: "answer_context", children_count: childrenCount ? Number(childrenCount) : null, remote_work: remoteWork },
      { type: "answer_anchors", anchors },
      { type: "answer_preferences", preferences: answers },
    ];
  }

  async function nextFromNeed() {
    setPending(true); setError(null);
    try { await runEvents(needEvents()); setStep(2); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED"); }
    finally { setPending(false); }
  }

  async function nextFromDaily() {
    setPending(true); setError(null);
    try { await runEvents([...needEvents(), ...dailyEvents()]); setPriorities((current) => current.filter((item) => preferences.includes(item))); setStep(3); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED"); }
    finally { setPending(false); }
  }

  async function launchSearch() {
    setPending(true); setError(null);
    try {
      const session = await runEvents([
        ...needEvents(),
        ...dailyEvents(),
        { type: "answer_priorities", priorities },
        { type: "answer_compromise" },
        { type: "confirm_profile" },
      ]);
      const params = companionProfileToSearchParams(session.profile);
      try { window.sessionStorage.setItem("akarfinder-pending-project-v2", JSON.stringify({ profile: session.profile, companion_session: session })); } catch {}
      try {
        const response = await fetch("/api/me/continuity", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "create_project", name: `Mon Projet · ${city.trim()}`, profile: session.profile, companion_session: session }),
        });
        if (response.ok) {
          const payload = await response.json() as { result?: { id?: string } };
          if (payload.result?.id) params.set("project_id", payload.result.id);
        }
      } catch {}
      router.push(`/search?${params.toString()}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
      setPending(false);
    }
  }

  const canContinueNeed = Boolean(objective && uses.length && city.trim() && propertyTypes.length && (budgetUnknown || Number(budget)));
  const priorityOptions = preferences.length ? preferences : PREFERENCES.slice(0, 6).map((item) => item.key);

  return (
    <div className="mx-auto max-w-5xl" data-p7-mon-projet data-finder-project-wizard>
      <header className="mb-5 rounded-[24px] border border-[#DCE8F5] bg-white p-4 shadow-[0_12px_40px_rgba(11,31,58,0.05)] sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Finder · Mon Projet</p>
            <p className="mt-1 text-sm font-extrabold text-[#071B33]">{STEP_LABELS[step - 1]} · {step}/3</p>
          </div>
          <Link href="/mon-projet/espace" className="rounded-xl border border-[#DCE8F5] px-3 py-2 text-[11px] font-extrabold text-[#36506F]">Mes projets</Link>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Progression">
          {STEP_LABELS.map((label, index) => <div key={label} className={`h-1.5 rounded-full ${index < step ? "bg-[#0B63CE]" : "bg-slate-100"}`} />)}
        </div>
      </header>

      <section className="rounded-[28px] border border-[#DCE8F5] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
        {step > 1 ? <button type="button" onClick={() => setStep((value) => Math.max(1, value - 1))} className="mb-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600"><ArrowLeft size={14} />Retour</button> : null}

        {step === 1 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mon besoin</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33] sm:text-5xl">Commençons par l’essentiel.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Votre objectif, votre zone et les contraintes qui ne se négocient pas.</p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {OBJECTIVES.map((item) => <Choice key={item.value} active={objective === item.value} onClick={() => { setObjective(item.value); setUses([]); }}>{item.value === "explore" ? <Search size={16} /> : item.value === "new_build" ? <Sparkles size={16} /> : <Home size={16} />}<span className="ml-2">{item.label}</span></Choice>)}
          </div>

          {objective ? <div className="mt-6">
            <p className="mb-2 text-xs font-extrabold text-slate-700">Usage</p>
            <div className="grid gap-2 sm:grid-cols-2">{allowedUses.map((item) => <Choice key={item.value} active={uses.includes(item.value)} onClick={() => setUses((current) => toggle(current, item.value))}>{item.label}</Choice>)}</div>
          </div> : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-extrabold text-slate-700">Ville ou zone<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Rabat, Casablanca, Hay Riad…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" /></label>
            <label className="text-sm font-extrabold text-slate-700">{objective === "rent" ? "Budget mensuel max" : "Budget max"}<input disabled={budgetUnknown} inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/[^0-9]/g, ""))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium disabled:bg-slate-50" /></label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={budgetUnknown} onChange={(event) => { setBudgetUnknown(event.target.checked); if (event.target.checked) setBudget(""); }} />Je ne sais pas encore</label>

          <div className="mt-6">
            <p className="mb-2 text-xs font-extrabold text-slate-700">Type de bien</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{allowedPropertyTypes.map((item) => <Choice key={item.value} active={propertyTypes.includes(item.value)} onClick={() => setPropertyTypes((current) => toggle(current, item.value))}>{item.pluralLabel}</Choice>)}</div>
          </div>

          <details className="mt-5 rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-extrabold text-slate-700">Ajouter mes contraintes essentielles</summary><div className="mt-4 grid gap-3 sm:grid-cols-2"><input inputMode="numeric" value={minSurface} onChange={(event) => setMinSurface(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Surface minimale (m²)" className="rounded-xl border border-slate-200 px-4 py-3" /><input inputMode="numeric" value={minBedrooms} onChange={(event) => setMinBedrooms(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Chambres minimum" className="rounded-xl border border-slate-200 px-4 py-3" /><Choice active={requiredFeatures.includes("parking")} onClick={() => setRequiredFeatures((current) => toggle(current, "parking"))}>Parking indispensable</Choice><Choice active={requiredFeatures.includes("elevator")} onClick={() => setRequiredFeatures((current) => toggle(current, "elevator"))}>Ascenseur indispensable</Choice></div></details>

          <button type="button" disabled={!canContinueNeed || pending} onClick={nextFromNeed} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Mon quotidien <ArrowRight size={16} /></button>
        </> : null}

        {step === 2 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mon quotidien</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Un bon bien doit aussi fonctionner dans votre vraie vie.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Ces éléments orientent le classement. Ils ne deviennent pas des filtres rigides.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-extrabold text-slate-700">Nombre d’enfants<input inputMode="numeric" value={childrenCount} onChange={(event) => setChildrenCount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Optionnel" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" /></label><Choice active={remoteWork} onClick={() => setRemoteWork((value) => !value)}>Je télétravaille régulièrement</Choice></div>
          <div className="mt-6 rounded-2xl bg-[#F7FAFE] p-4"><p className="text-xs font-extrabold text-slate-700">Un lieu important à garder proche</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]"><input value={anchorLabel} onChange={(event) => setAnchorLabel(event.target.value)} placeholder="École, travail, famille…" className="rounded-xl border border-slate-200 bg-white px-4 py-3" /><input inputMode="numeric" value={anchorMinutes} onChange={(event) => setAnchorMinutes(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Minutes max" className="rounded-xl border border-slate-200 bg-white px-4 py-3" /></div></div>
          <p className="mt-6 mb-2 text-xs font-extrabold text-slate-700">Ce qui compte autour du bien</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PREFERENCES.map((item) => <Choice key={item.key} active={preferences.includes(item.key)} onClick={() => setPreferences((current) => toggle(current, item.key))}>{item.label}</Choice>)}</div>
          <button type="button" disabled={pending} onClick={nextFromDaily} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white sm:w-auto">Mes priorités <ArrowRight size={16} /></button>
        </> : null}

        {step === 3 ? <>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mes priorités</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#071B33]">Qu’est-ce qui doit vraiment passer en premier ?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Choisissez jusqu’à 5 priorités. Finder s’en servira pour ordonner les résultats sans supprimer les autres possibilités.</p>
          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">{priorityOptions.map((key) => { const item = PREFERENCES.find((definition) => definition.key === key)!; return <Choice key={key} active={priorities.includes(key)} onClick={() => setPriorities((current) => current.includes(key) ? current.filter((value) => value !== key) : current.length < 5 ? [...current, key] : current)}>{item.label}</Choice>; })}</div>
          <div className="mt-7 rounded-2xl border border-[#DCE8F5] bg-[#F8FBFF] p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Résumé</p><p className="mt-2 text-sm font-bold leading-6 text-[#203A59]">{OBJECTIVES.find((item) => item.value === objective)?.label ?? "Projet"} · {city || "zone à préciser"} · {propertyTypes.join(", ") || "type à préciser"}{budgetUnknown ? " · budget ouvert" : budget ? ` · jusqu’à ${Number(budget).toLocaleString("fr-FR")} DH` : ""}</p></div>
          <button type="button" disabled={!priorities.length || pending} onClick={launchSearch} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto">Voir les biens faits pour mon projet <ArrowRight size={16} /></button>
        </> : null}

        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Impossible de continuer : {error}</p> : null}
      </section>
    </div>
  );
}
