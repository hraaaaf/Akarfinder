"use client";

import { useState } from "react";
import { OnboardingStepCard } from "./OnboardingStepCard";
import { BuyerProfileSummary } from "./BuyerProfileSummary";
import type {
  BuyerProfile,
  ProjectType,
  PropertyType,
  TimingType,
  MRECurrency,
  PropertyCondition,
} from "@/lib/onboarding/types";
import type { LeadApiResponse } from "@/lib/leads/types";

const TOTAL_STEPS = 6;

// ── Reusable chip button ──────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-3 text-[14px] font-bold transition active:scale-[0.97] ${
        selected
          ? "border-deepblue bg-deepblue text-white shadow-[0_4px_14px_rgba(7,27,51,0.22)] dark:border-bronze-500/50 dark:bg-bronze-500/15 dark:text-bronze-200"
          : "border-border/20 bg-background text-foreground hover:border-bronze-500/40 hover:bg-surface-muted dark:border-white/12 dark:bg-white/[0.04] dark:text-white/85 dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
      }`}
    >
      {label}
    </button>
  );
}

// ── Text/number input ─────────────────────────────────────────────────────────

function Field({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  id: string;
  type?: "text" | "tel" | "number";
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
        {optional ? <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">(optionnel)</span> : null}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border/20 dark:border-white/12 bg-background dark:bg-white/[0.06] px-4 py-3 text-[14px] text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/35 outline-none focus:border-bronze-400/70 focus:ring-2 focus:ring-bronze-400/15 dark:[color-scheme:dark] transition"
      />
    </div>
  );
}

// ── Step 1 — Projet ───────────────────────────────────────────────────────────

const PROJECTS: { value: ProjectType; label: string; desc: string }[] = [
  { value: "acheter", label: "Acheter", desc: "Résidence principale ou secondaire" },
  { value: "louer", label: "Louer", desc: "Courte ou longue durée" },
  { value: "neuf", label: "Programme neuf", desc: "VEFA ou livraison prochaine" },
  { value: "investir", label: "Investir", desc: "Rendement locatif ou patrimonial" },
  { value: "mre", label: "MRE", desc: "Achat depuis l'étranger" },
];

function Step1Projet({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {PROJECTS.map(({ value, label, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange({ project: value })}
          className={`rounded-xl border-2 p-4 text-left transition active:scale-[0.98] ${
            profile.project === value
              ? "border-deepblue bg-deepblue text-white shadow-[0_4px_14px_rgba(7,27,51,0.22)] dark:border-bronze-500/50 dark:bg-bronze-500/15"
              : "border-border/20 bg-background hover:border-bronze-500/40 hover:bg-surface-muted dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
          }`}
        >
          <p className={`text-[15px] font-extrabold ${profile.project === value ? "text-white dark:text-bronze-200" : "text-foreground"}`}>
            {label}
          </p>
          <p className={`mt-0.5 text-[12px] ${profile.project === value ? "text-white/75 dark:text-bronze-300/80" : "text-muted-foreground"}`}>
            {desc}
          </p>
        </button>
      ))}
    </div>
  );
}

// ── Step 2 — Zone ─────────────────────────────────────────────────────────────

function Step2Zone({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Ville"
        id="ob-city"
        placeholder="Casablanca, Rabat, Marrakech…"
        value={profile.city ?? ""}
        onChange={(v) => onChange({ city: v })}
      />
      <Field
        label="Quartier"
        id="ob-neighborhood"
        placeholder="Maârif, Agdal, Guéliz…"
        value={profile.neighborhood ?? ""}
        onChange={(v) => onChange({ neighborhood: v })}
        optional
      />
      <Field
        label="Zones acceptées"
        id="ob-zones"
        placeholder="Ex: Ain Diab, Californie…"
        value={profile.acceptedZones ?? ""}
        onChange={(v) => onChange({ acceptedZones: v })}
        optional
      />
    </div>
  );
}

// ── Step 3 — Budget ───────────────────────────────────────────────────────────

const MRE_CURRENCIES: MRECurrency[] = ["MAD", "EUR", "USD", "GBP", "CAD", "SAR", "AED"];

function Step3Budget({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  const isMRE = profile.project === "mre";

  return (
    <div className="space-y-4">
      {isMRE ? (
        <div>
          <label className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Devise
          </label>
          <div className="flex flex-wrap gap-2">
            {MRE_CURRENCIES.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={profile.currency === c}
                onClick={() => onChange({ currency: c })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <Field
        label={`Budget total ${isMRE && profile.currency ? `(${profile.currency})` : "(MAD)"}`}
        id="ob-budget"
        type="number"
        placeholder="Ex: 1500000"
        value={profile.budgetTotal != null ? String(profile.budgetTotal) : ""}
        onChange={(v) => onChange({ budgetTotal: v ? Number(v) : undefined })}
      />
      <Field
        label="Apport disponible"
        id="ob-apport"
        type="number"
        placeholder="Ex: 300000"
        value={profile.apport != null ? String(profile.apport) : ""}
        onChange={(v) => onChange({ apport: v ? Number(v) : undefined })}
        optional
      />

      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground mb-2">
          Besoin de crédit
        </p>
        <div className="flex gap-2.5">
          {(["Oui", "Non"] as const).map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={profile.needsCredit === (opt === "Oui")}
              onClick={() => onChange({ needsCredit: opt === "Oui" })}
            />
          ))}
        </div>
      </div>

      {profile.needsCredit ? (
        <Field
          label="Mensualité cible indicative (MAD)"
          id="ob-monthly"
          type="number"
          placeholder="Ex: 5000"
          value={profile.monthlyCible != null ? String(profile.monthlyCible) : ""}
          onChange={(v) => onChange({ monthlyCible: v ? Number(v) : undefined })}
          optional
        />
      ) : null}

      <p className="text-[11.5px] leading-5 text-muted-foreground">
        Budget estimatif — à confirmer avec votre banque. Aucune préqualification bancaire.
      </p>
    </div>
  );
}

// ── Step 4 — Bien ─────────────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "maison", label: "Maison" },
  { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" },
];

const CONDITIONS: { value: PropertyCondition; label: string }[] = [
  { value: "neuf", label: "Neuf" },
  { value: "ancien", label: "Ancien" },
  { value: "peu-importe", label: "Peu importe" },
];

function Step4Bien({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground mb-2">
          Type de bien
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROPERTY_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={profile.propertyType === value}
              onClick={() => onChange({ propertyType: value })}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Surface (m²)"
          id="ob-surface"
          type="number"
          placeholder="Ex: 90"
          value={profile.surface != null ? String(profile.surface) : ""}
          onChange={(v) => onChange({ surface: v ? Number(v) : undefined })}
          optional
        />
        <Field
          label="Chambres"
          id="ob-bedrooms"
          type="number"
          placeholder="Ex: 3"
          value={profile.bedrooms != null ? String(profile.bedrooms) : ""}
          onChange={(v) => onChange({ bedrooms: v ? Number(v) : undefined })}
          optional
        />
      </div>

      <div>
        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground mb-2">
          État du bien
        </p>
        <div className="flex flex-wrap gap-2.5">
          {CONDITIONS.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={profile.condition === value}
              onClick={() => onChange({ condition: value })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 5 — Timing ───────────────────────────────────────────────────────────

const TIMINGS: { value: TimingType; label: string; desc: string }[] = [
  { value: "urgent", label: "Urgent", desc: "Je cherche activement maintenant" },
  { value: "1-3mois", label: "1 à 3 mois", desc: "Projet à court terme" },
  { value: "3-6mois", label: "3 à 6 mois", desc: "Projet en préparation" },
  { value: "veille", label: "Simple veille", desc: "Je surveille le marché" },
];

function Step5Timing({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {TIMINGS.map(({ value, label, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange({ timing: value })}
          className={`rounded-xl border-2 p-4 text-left transition active:scale-[0.98] ${
            profile.timing === value
              ? "border-deepblue bg-deepblue text-white shadow-[0_4px_14px_rgba(7,27,51,0.22)] dark:border-bronze-500/50 dark:bg-bronze-500/15"
              : "border-border/20 bg-background hover:border-bronze-500/40 hover:bg-surface-muted dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
          }`}
        >
          <p className={`text-[15px] font-extrabold ${profile.timing === value ? "text-white dark:text-bronze-200" : "text-foreground"}`}>
            {label}
          </p>
          <p className={`mt-0.5 text-[12px] ${profile.timing === value ? "text-white/75 dark:text-bronze-300/80" : "text-muted-foreground"}`}>
            {desc}
          </p>
        </button>
      ))}
    </div>
  );
}

// ── Step 6 — Contact + consent ────────────────────────────────────────────────

function Step6Contact({
  profile,
  onChange,
}: {
  profile: BuyerProfile;
  onChange: (p: Partial<BuyerProfile>) => void;
}) {
  const isMRE = profile.project === "mre";

  return (
    <div className="space-y-4">
      <Field
        label="Nom"
        id="ob-name"
        placeholder="Votre prénom ou nom"
        value={profile.name ?? ""}
        onChange={(v) => onChange({ name: v })}
        optional
      />
      <Field
        label="Téléphone / WhatsApp"
        id="ob-phone"
        type="tel"
        placeholder="+212 6XX XXX XXX"
        value={profile.phone ?? ""}
        onChange={(v) => onChange({ phone: v })}
      />
      {isMRE ? (
        <Field
          label="Pays de résidence"
          id="ob-country"
          placeholder="France, Belgique, Canada…"
          value={profile.country ?? ""}
          onChange={(v) => onChange({ country: v })}
          optional
        />
      ) : null}
      <Field
        label="Message"
        id="ob-message"
        placeholder="Précisions sur votre recherche…"
        value={profile.message ?? ""}
        onChange={(v) => onChange({ message: v })}
        optional
      />

      <div className="space-y-3 rounded-xl bg-surface-muted dark:bg-white/[0.04] p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-border/20 dark:border-white/20 accent-deepblue dark:accent-bronze-500"
            checked={profile.consentContact ?? false}
            onChange={(e) => onChange({ consentContact: e.target.checked })}
          />
          <span className="text-[13px] leading-5 text-foreground/80 dark:text-white/80">
            J&apos;accepte d&apos;être recontacté au sujet de ma recherche.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-border/20 dark:border-white/20 accent-deepblue dark:accent-bronze-500"
            checked={profile.consentIndicatif ?? false}
            onChange={(e) => onChange({ consentIndicatif: e.target.checked })}
          />
          <span className="text-[13px] leading-5 text-foreground/80 dark:text-white/80">
            Je comprends que ce dossier est indicatif et ne constitue pas une préqualification bancaire.
          </span>
        </label>
      </div>
    </div>
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────────

function initialProfileFromIntent(intent?: string): BuyerProfile {
  if (intent === "acheter") return { project: "acheter" };
  if (intent === "louer")   return { project: "louer" };
  return {};
}

type SubmissionResult = { ok: true; leadId: string } | { ok: false; error: string } | null;

export function BuyerOnboardingFlow({
  listingId,
  intent,
  sourcePage,
}: {
  listingId?: string;
  intent?: string;
  sourcePage?: string;
}) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<BuyerProfile>(() => initialProfileFromIntent(intent));
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>(null);

  function update(partial: Partial<BuyerProfile>) {
    setProfile((p) => ({ ...p, ...partial }));
  }

  async function submitLead(finalProfile: BuyerProfile) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: finalProfile,
          source_channel: "onboarding",
          source_page: sourcePage ?? "/onboarding",
          listing_id: listingId,
        }),
      });
      const data: LeadApiResponse = await res.json();
      if (data.ok) {
        setSubmissionResult({ ok: true, leadId: data.lead_id });
      } else {
        setSubmissionResult({ ok: false, error: data.error });
      }
    } catch {
      setSubmissionResult({
        ok: false,
        error: "Connexion impossible au serveur.",
      });
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  }

  function next() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      void submitLead(profile);
    }
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function restart() {
    setProfile(initialProfileFromIntent(intent));
    setStep(1);
    setDone(false);
    setSubmitting(false);
    setSubmissionResult(null);
  }

  if (submitting) {
    return (
      <div className="mx-auto w-full max-w-lg py-16 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-foreground dark:border-white border-t-transparent" aria-label="Enregistrement en cours" />
        <p className="mt-5 text-[14px] font-semibold text-muted-foreground">
          Enregistrement de votre dossier…
        </p>
      </div>
    );
  }

  if (done) {
    return <BuyerProfileSummary profile={profile} onRestart={restart} submissionResult={submissionResult} />;
  }

  const stepProps = {
    step,
    totalSteps: TOTAL_STEPS,
    onBack: step > 1 ? back : undefined,
    onContinue: next,
  };

  if (step === 1) {
    return (
      <OnboardingStepCard
        {...stepProps}
        title="Quel est votre projet ?"
        subtitle="Sélectionnez le type de projet qui correspond à votre situation."
        continueDisabled={!profile.project}
      >
        <Step1Projet profile={profile} onChange={update} />
      </OnboardingStepCard>
    );
  }

  if (step === 2) {
    return (
      <OnboardingStepCard
        {...stepProps}
        title="Quelle zone vous intéresse ?"
        subtitle="Indiquez la ville et le quartier cibles pour votre recherche."
        continueDisabled={!profile.city?.trim()}
      >
        <Step2Zone profile={profile} onChange={update} />
      </OnboardingStepCard>
    );
  }

  if (step === 3) {
    return (
      <OnboardingStepCard
        {...stepProps}
        title="Quel est votre budget ?"
        subtitle="Estimatif indicatif. Aucune préqualification bancaire n'est effectuée."
        continueDisabled={false}
      >
        <Step3Budget profile={profile} onChange={update} />
      </OnboardingStepCard>
    );
  }

  if (step === 4) {
    return (
      <OnboardingStepCard
        {...stepProps}
        title="Quel bien recherchez-vous ?"
        subtitle="Précisez le type de bien, la surface et vos préférences."
        continueDisabled={false}
      >
        <Step4Bien profile={profile} onChange={update} />
      </OnboardingStepCard>
    );
  }

  if (step === 5) {
    return (
      <OnboardingStepCard
        {...stepProps}
        title="Quel est votre horizon ?"
        subtitle="Votre timing aide à qualifier votre dossier de recherche."
        continueDisabled={!profile.timing}
      >
        <Step5Timing profile={profile} onChange={update} />
      </OnboardingStepCard>
    );
  }

  // Step 6
  return (
    <OnboardingStepCard
      {...stepProps}
      title="Vos coordonnées"
      subtitle="Pour recevoir les biens compatibles et être recontacté si vous le souhaitez."
      continueLabel="Créer mon dossier"
      continueDisabled={!profile.consentIndicatif}
    >
      <Step6Contact profile={profile} onChange={update} />
    </OnboardingStepCard>
  );
}
