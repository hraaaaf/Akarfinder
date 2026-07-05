// DEMO-PROMOTER-AGENCY-REALISTIC-MOCKUP-1
// Shared "Expérience quartier" module for partner mockup pages.
// Fictional, indicative scores only — never a safety/verification claim.
import { MapPin } from "lucide-react";

type NeighborhoodScore = {
  label: string;
  value: number; // 0-100, fictional
};

type DemoNeighborhoodExperienceProps = {
  zoneLabel: string;
  scores: NeighborhoodScore[];
  checks: string[];
  className?: string;
};

function barColor(value: number): string {
  if (value >= 65) return "bg-[#0B63CE]";
  if (value >= 50) return "bg-[#5B8DD9]";
  return "bg-amber-400";
}

export function DemoNeighborhoodExperience({
  zoneLabel,
  scores,
  checks,
  className = "",
}: DemoNeighborhoodExperienceProps) {
  return (
    <div className={`rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_12px_34px_rgba(15,35,65,0.07)] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
            Expérience quartier
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-[#0B1F3A]">
            <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
            {zoneLabel}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {scores.map((score) => (
          <div key={score.label}>
            <div className="flex items-baseline justify-between">
              <p className="text-[12.5px] font-bold text-[#0B1F3A]">{score.label}</p>
              <p className="text-[12px] font-extrabold text-[#0B63CE]">{score.value}/100</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef3fa]">
              <div
                className={`h-full rounded-full ${barColor(score.value)}`}
                style={{ width: `${Math.min(Math.max(score.value, 0), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {checks.length > 0 ? (
        <div className="mt-5 rounded-xl bg-[#f8fafc] p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Points à vérifier
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {checks.map((check) => (
              <li key={check} className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-600 ring-1 ring-[#dbe7f6]">
                {check}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-[11px] leading-4 text-slate-400">
        Repères indicatifs pour démonstration. À confirmer sur place.
      </p>
    </div>
  );
}
