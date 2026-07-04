"use client";

// SEARCH-PROFILE-ONBOARDING-MVP-1 — guided search profile wizard.
// Frontend-only: state is local, persisted to localStorage. No backend,
// no API call, no real contact collected. Everything indicative.

import { useEffect, useState } from "react";
import Link from "next/link";
import { OnboardingStepCard } from "@/components/onboarding/OnboardingStepCard";
import {
  AUDIENCE_OPTIONS,
  EMPTY_SEARCH_PROFILE,
  NEIGHBORHOOD_NEED_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SEARCH_PROFILE_STORAGE_KEY,
  type SearchNeighborhoodNeed,
  type SearchPriority,
  type SearchProfile,
} from "@/lib/search-profile/search-profile-types";
import { buildSearchProfileSummary } from "@/lib/search-profile/search-profile-summary";

const TOTAL_STEPS = 8;

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border-2 px-4 py-3 text-[13.5px] font-bold transition active:scale-[0.97] ${
        selected
          ? "border-deepblue bg-deepblue text-white shadow-[0_4px_14px_rgba(7,27,51,0.22)]"
          : "border-border/20 bg-background text-foreground hover:border-bronze-500/40 hover:bg-surface-muted"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
        <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">(optionnel)</span>
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border/20 bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition focus:border-bronze-400/70 focus:ring-2 focus:ring-bronze-400/15"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return <Chip label={label} selected={value === true} onClick={() => onChange(value !== true)} />;
}

export function SearchProfileWizard() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<SearchProfile>(EMPTY_SEARCH_PROFILE);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEARCH_PROFILE_STORAGE_KEY);
      if (raw) setProfile({ ...EMPTY_SEARCH_PROFILE, ...JSON.parse(raw) });
    } catch {
      // localStorage unavailable: keep in-memory state only.
    }
  }, []);

  function update(patch: Partial<SearchProfile>) {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(SEARCH_PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  function toggleNeed(need: SearchNeighborhoodNeed) {
    const has = profile.neighborhoodNeeds.includes(need);
    update({
      neighborhoodNeeds: has
        ? profile.neighborhoodNeeds.filter((n) => n !== need)
        : [...profile.neighborhoodNeeds, need],
    });
  }

  function togglePriority(priority: SearchPriority) {
    const has = profile.priorities.includes(priority);
    update({
      priorities: has
        ? profile.priorities.filter((p) => p !== priority)
        : [...profile.priorities, priority],
    });
  }

  const back = step > 1 ? () => setStep(step - 1) : undefined;
  const next = () => setStep(step + 1);
  const isRent = profile.project === "louer";
  const isSale = profile.project === "vendre";

  if (step === 1) {
    return (
      <OnboardingStepCard step={1} totalSteps={TOTAL_STEPS} title="Pour qui cherchez-vous ?" subtitle="Un profil clair aide à mieux cibler la recherche." onContinue={next} continueDisabled={!profile.audience}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {AUDIENCE_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={profile.audience === o.value} onClick={() => update({ audience: o.value })} />
          ))}
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 2) {
    return (
      <OnboardingStepCard step={2} totalSteps={TOTAL_STEPS} title="Quel est votre projet ?" onBack={back} onContinue={next} continueDisabled={!profile.project}>
        <div className="grid grid-cols-2 gap-2.5">
          {PROJECT_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={profile.project === o.value} onClick={() => update({ project: o.value })} />
          ))}
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 3) {
    return (
      <OnboardingStepCard step={3} totalSteps={TOTAL_STEPS} title="Quel type de bien ?" onBack={back} onContinue={next} continueDisabled={!profile.propertyType}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {PROPERTY_TYPE_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={profile.propertyType === o.value} onClick={() => update({ propertyType: o.value })} />
          ))}
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 4) {
    return (
      <OnboardingStepCard step={4} totalSteps={TOTAL_STEPS} title="Budget et zone" subtitle="Repères indicatifs — rien n'est contractuel." onBack={back} onContinue={next}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ville" id="sp-city" value={profile.city} onChange={(v) => update({ city: v })} placeholder="Casablanca" />
            <Field label="Quartier" id="sp-neighborhood" value={profile.neighborhood} onChange={(v) => update({ neighborhood: v })} placeholder="Maârif" />
          </div>
          {isRent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget mensuel (DH)" id="sp-monthly" type="number" value={profile.monthlyBudget} onChange={(v) => update({ monthlyBudget: v })} placeholder="8 000" />
              <Field label="Date d'entrée souhaitée" id="sp-movein" value={profile.moveInDate} onChange={(v) => update({ moveInDate: v })} placeholder="Septembre 2026" />
              <Field label="Durée envisagée" id="sp-duration" value={profile.rentalDuration} onChange={(v) => update({ rentalDuration: v })} placeholder="12 mois" />
              <div className="flex items-end"><Toggle label="Meublé" value={profile.furnished} onChange={(v) => update({ furnished: v })} /></div>
            </div>
          ) : isSale ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Surface (m²)" id="sp-salesurface" type="number" value={profile.saleSurface} onChange={(v) => update({ saleSurface: v })} placeholder="95" />
              <Field label="État du bien" id="sp-salecondition" value={profile.saleCondition} onChange={(v) => update({ saleCondition: v })} placeholder="Bon état" />
              <Field label="Horizon de vente" id="sp-salehorizon" value={profile.saleHorizon} onChange={(v) => update({ saleHorizon: v })} placeholder="3 à 6 mois" />
              <div className="flex items-end"><Toggle label="Besoin d'une agence" value={profile.saleNeedsAgency} onChange={(v) => update({ saleNeedsAgency: v })} /></div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget total (DH)" id="sp-budget" type="number" value={profile.budgetTotal} onChange={(v) => update({ budgetTotal: v })} placeholder="1 500 000" />
              <Field label="Apport (DH)" id="sp-down" type="number" value={profile.downPayment} onChange={(v) => update({ downPayment: v })} placeholder="300 000" />
              <Field label="Délai d'achat" id="sp-horizon" value={profile.purchaseHorizon} onChange={(v) => update({ purchaseHorizon: v })} placeholder="6 à 12 mois" />
              <div className="flex items-end"><Toggle label="Crédit prévu" value={profile.creditPlanned} onChange={(v) => update({ creditPlanned: v })} /></div>
            </div>
          )}
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 5) {
    return (
      <OnboardingStepCard step={5} totalSteps={TOTAL_STEPS} title="Critères du bien" subtitle="Tout est optionnel." onBack={back} onContinue={next}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Surface min. (m²)" id="sp-minsurface" type="number" value={profile.minSurface} onChange={(v) => update({ minSurface: v })} placeholder="80" />
            <Field label="Chambres" id="sp-bedrooms" type="number" value={profile.bedrooms} onChange={(v) => update({ bedrooms: v })} placeholder="3" />
            <Field label="Salles de bain" id="sp-bathrooms" type="number" value={profile.bathrooms} onChange={(v) => update({ bathrooms: v })} placeholder="2" />
            <Field label="Étage" id="sp-floor" value={profile.floor} onChange={(v) => update({ floor: v })} placeholder="4ème" />
            <Field label="Orientation" id="sp-orientation" value={profile.orientation} onChange={(v) => update({ orientation: v })} placeholder="Sud-Est" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Toggle label="Ascenseur" value={profile.elevator} onChange={(v) => update({ elevator: v })} />
            <Toggle label="Parking" value={profile.parking} onChange={(v) => update({ parking: v })} />
            <Toggle label="Terrasse" value={profile.terrace} onChange={(v) => update({ terrace: v })} />
            <Toggle label="Résidence sécurisée" value={profile.securedResidence} onChange={(v) => update({ securedResidence: v })} />
            <Toggle label="Travaux acceptés" value={profile.worksAccepted} onChange={(v) => update({ worksAccepted: v })} />
          </div>
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 6) {
    return (
      <OnboardingStepCard step={6} totalSteps={TOTAL_STEPS} title="Exigences quartier" subtitle="Sélectionnez ce qui compte autour du bien." onBack={back} onContinue={next}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {NEIGHBORHOOD_NEED_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={profile.neighborhoodNeeds.includes(o.value)} onClick={() => toggleNeed(o.value)} />
          ))}
        </div>
      </OnboardingStepCard>
    );
  }

  if (step === 7) {
    return (
      <OnboardingStepCard step={7} totalSteps={TOTAL_STEPS} title="Vos priorités" subtitle="Ce qui compte le plus pour arbitrer." onBack={back} onContinue={() => setStep(8)} continueLabel="Voir mon profil">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PRIORITY_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} selected={profile.priorities.includes(o.value)} onClick={() => togglePriority(o.value)} />
          ))}
        </div>
      </OnboardingStepCard>
    );
  }

  const summary = buildSearchProfileSummary(profile);

  return (
    <OnboardingStepCard step={8} totalSteps={TOTAL_STEPS} title="Votre profil de recherche" subtitle="Résumé indicatif et non contractuel — modifiable à tout moment." onBack={back}>
      <div className="grid gap-3">
        {summary.lines.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {summary.lines.map((line) => (
              <div key={line.label} className="rounded-xl border border-border/20 bg-surface-muted/40 p-3.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{line.label}</p>
                <p className="mt-1 text-[13.5px] font-extrabold text-foreground">{line.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Profil encore vide — revenez en arrière pour renseigner vos critères.</p>
        )}

        {summary.essentials.length > 0 ? (
          <div className="rounded-xl border border-border/20 p-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-bronze-700">Critères essentiels</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {summary.essentials.map((item) => (
                <li key={item} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-foreground/80">{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-border/20 p-3.5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-bronze-700">Points à vérifier</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {summary.checkpoints.map((item) => (
              <li key={item} className="text-[12.5px] text-muted-foreground">• {item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-2 grid gap-2.5">
          <Link href={summary.searchHref} className="w-full rounded-xl bg-deepblue px-6 py-3.5 text-center text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.22)] transition hover:bg-[#0d2a4d]">
            Voir les résultats
          </Link>
          <Link href="/demo/louer" className="w-full rounded-xl border border-border/25 bg-background px-6 py-3.5 text-center text-[14px] font-extrabold text-foreground transition hover:border-bronze-500/40">
            Créer une alerte (démo)
          </Link>
          <Link href="/contact" className="w-full rounded-xl border border-border/25 bg-background px-6 py-3.5 text-center text-[14px] font-extrabold text-foreground transition hover:border-bronze-500/40">
            Demander un accompagnement
          </Link>
        </div>
      </div>
    </OnboardingStepCard>
  );
}
