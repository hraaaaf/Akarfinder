"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { BuyerProfile } from "@/lib/onboarding/types";
import { computeLeadTemperature, getTemperatureDisplay } from "@/lib/onboarding/lead-temperature";

const PROJECT_LABELS: Record<string, string> = {
  acheter: "Achat",
  louer: "Location",
  neuf: "Programme neuf",
  investir: "Investissement",
  mre: "Achat MRE",
};

const TIMING_LABELS: Record<string, string> = {
  urgent: "Urgent",
  "1-3mois": "1 à 3 mois",
  "3-6mois": "3 à 6 mois",
  veille: "Simple veille",
};

const PROPERTY_LABELS: Record<string, string> = {
  appartement: "Appartement",
  villa: "Villa",
  terrain: "Terrain",
  studio: "Studio",
  bureau: "Bureau",
  maison: "Maison",
};

function formatBudget(value?: number, currency?: string): string {
  if (!value) return "—";
  const cur = currency ?? "MAD";
  return `${value.toLocaleString("fr-FR")} ${cur}`;
}

type SummaryRowProps = { label: string; value: string };
function SummaryRow({ label, value }: SummaryRowProps) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/15 dark:border-white/10 last:border-0">
      <span className="text-[12.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-[14px] font-bold text-foreground text-right">{value}</span>
    </div>
  );
}

type SubmissionResult = { ok: true; leadId: string } | { ok: false; error: string } | null;

type Props = { profile: BuyerProfile; onRestart: () => void; submissionResult?: SubmissionResult };

export function BuyerProfileSummary({ profile, onRestart, submissionResult }: Props) {
  const result = computeLeadTemperature(profile);
  const display = getTemperatureDisplay(result.temperature);

  const zoneLabel = [profile.city, profile.neighborhood].filter(Boolean).join(", ") || "—";
  const budgetLabel = formatBudget(profile.budgetTotal, profile.currency);
  const apportLabel = profile.apport ? formatBudget(profile.apport, profile.currency) : "—";
  const creditLabel = profile.needsCredit === true ? "Oui" : profile.needsCredit === false ? "Non" : "—";
  const propertyLabel = profile.propertyType ? PROPERTY_LABELS[profile.propertyType] ?? profile.propertyType : "—";
  const surfaceLabel = profile.surface ? `${profile.surface} m²` : "—";
  const bedroomsLabel = profile.bedrooms ? `${profile.bedrooms} ch.` : "—";
  const conditionLabel = profile.condition === "neuf" ? "Neuf" : profile.condition === "ancien" ? "Ancien" : profile.condition ? "Peu importe" : "—";
  const timingLabel = profile.timing ? TIMING_LABELS[profile.timing] ?? profile.timing : "—";
  const isMRE = profile.project === "mre";

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Header */}
      <div className="mb-5 text-center">
        <span className="inline-block rounded-full border border-bronze-500/40 bg-bronze-700/10 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
          Dossier acheteur indicatif
        </span>
        <h2 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2rem]">
          Votre profil de recherche
        </h2>
        <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">
          Récapitulatif indicatif — à confirmer avec votre banque et votre conseiller.
        </p>
      </div>

      {/* Temperature badge */}
      <div className={`mb-5 flex items-center gap-3 rounded-[1.2rem] border p-4 ${display.bgClass} ${display.borderClass}`}>
        <span className="text-[1.6rem]" aria-hidden="true">{display.emoji}</span>
        <div>
          <p className={`text-[13px] font-extrabold ${display.textClass}`}>
            {result.label}
          </p>
          <p className={`text-[12.5px] ${display.textClass} opacity-80`}>
            {result.reason}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-[1.6rem] border border-border/20 dark:border-white/10 bg-card p-6 shadow-[0_12px_38px_rgba(7,27,51,0.08)] dark:shadow-[0_12px_38px_rgba(0,0,0,0.3)] sm:p-8">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
          Synthèse indicative
        </p>

        {profile.project ? (
          <SummaryRow label="Projet" value={PROJECT_LABELS[profile.project] ?? profile.project} />
        ) : null}
        <SummaryRow label="Zone" value={zoneLabel} />
        <SummaryRow label="Budget estimatif" value={budgetLabel} />
        <SummaryRow label="Apport" value={apportLabel} />
        <SummaryRow label="Crédit" value={creditLabel} />
        <SummaryRow label="Type de bien" value={propertyLabel} />
        <SummaryRow label="Surface" value={surfaceLabel} />
        <SummaryRow label="Chambres" value={bedroomsLabel} />
        <SummaryRow label="État" value={conditionLabel} />
        <SummaryRow label="Horizon" value={timingLabel} />
        {isMRE && profile.country ? (
          <SummaryRow label="Pays de résidence" value={profile.country} />
        ) : null}

        {/* Disclaimer */}
        <div className="mt-5 rounded-xl bg-surface-muted dark:bg-white/[0.04] px-4 py-3.5">
          <p className="text-[12px] leading-5 text-muted-foreground">
            Ce dossier est <strong>indicatif</strong> et ne constitue pas une préqualification bancaire,
            un crédit accordé, ni un engagement de financement.
            À confirmer avec votre banque avant toute décision.
          </p>
        </div>
      </div>

      {/* Submission result banner */}
      {submissionResult?.ok === true ? (
        <div className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-bold leading-5 text-emerald-800">
              Votre dossier acheteur indicatif a été enregistré.
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-emerald-700">
              Un conseiller ou partenaire pourra vous recontacter après validation.
              Aucune préqualification bancaire n&apos;est effectuée.
            </p>
          </div>
        </div>
      ) : submissionResult?.ok === false ? (
        <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="text-[13px] font-bold text-amber-800">
            Dossier enregistré localement uniquement.
          </p>
          <p className="mt-0.5 text-[12px] text-amber-700">
            {submissionResult.error} Vos informations restent visibles ci-dessus.
          </p>
        </div>
      ) : profile.phone && profile.consentContact ? (
        <div className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <CheckCircle2 size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="text-[13px] leading-5 text-emerald-800">
            Coordonnées enregistrées localement. Aucune transmission sans accord explicite d&apos;un conseiller.
          </p>
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Link
          href="/search"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(7,27,51,0.22)] transition hover:bg-[#0d2a4d]"
        >
          Voir les biens compatibles
          <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-xl border border-border/20 dark:border-white/12 bg-card dark:bg-white/[0.04] px-6 py-3 text-[14px] font-bold text-foreground transition hover:bg-surface-muted dark:hover:bg-white/[0.08]"
        >
          Recommencer le profil
        </button>
      </div>
    </div>
  );
}
