// NEIGHBORHOOD-EXPERIENCE-SHOWCASE-1
// Fictional "around the property" / sector / market-position / information-
// level blocks for the demo pages. Everything here is illustrative and
// non-contractual — no reliability score, no official estimate, no precise
// travel time. Kept intentionally vague ("dans le secteur", "à proximité")
// since the underlying data is not real/computed.
import { Store, School, Route, Trees, Bus, TrendingUp, ClipboardCheck } from "lucide-react";
import type { DemoMarketPositionLabel, DemoInfoLevel } from "@/lib/demo/demo-data";

const SURROUNDING_ICONS = {
  shop: Store,
  school: School,
  road: Route,
  tree: Trees,
  bus: Bus,
};

const MARKET_POSITION_COLOR: Record<DemoMarketPositionLabel, string> = {
  "Repère indicatif bas": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "Aligné marché": "text-[#0B63CE] bg-[#0B63CE]/10 border-[#0B63CE]/25",
  "Repère indicatif haut": "text-amber-600 bg-amber-50 border-amber-200",
  "Fortement au-dessus": "text-red-600 bg-red-50 border-red-200",
  "Données insuffisantes": "text-slate-500 bg-slate-100 border-slate-200",
};

const INFO_LEVEL_COLOR: Record<DemoInfoLevel, string> = {
  "Information complète": "text-emerald-600 bg-emerald-50 border-emerald-200",
  "Information partielle": "text-amber-600 bg-amber-50 border-amber-200",
  "Information limitée": "text-orange-600 bg-orange-50 border-orange-200",
  "À compléter": "text-slate-500 bg-slate-100 border-slate-200",
};

type NeighborhoodExperienceProps = {
  surroundings: ReadonlyArray<{ icon: keyof typeof SURROUNDING_ICONS; label: string }>;
  sectorTags: ReadonlyArray<string>;
  sectorNote: string;
  marketPosition?: { label: DemoMarketPositionLabel; note: string };
  infoLevel?: { level: DemoInfoLevel; checks: ReadonlyArray<{ label: string; present: boolean }> };
  positioning?: string;
  targetAudience?: ReadonlyArray<string>;
  className?: string;
};

export function NeighborhoodExperience({
  surroundings,
  sectorTags,
  sectorNote,
  marketPosition,
  infoLevel,
  positioning,
  targetAudience,
  className = "",
}: NeighborhoodExperienceProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>
      {/* A. Autour du bien */}
      <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Autour du bien</p>
        <ul className="mt-3 space-y-2">
          {surroundings.map((s) => {
            const Icon = SURROUNDING_ICONS[s.icon];
            return (
              <li key={s.label} className="flex items-center gap-2.5 text-[12.5px] text-slate-600">
                <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0B63CE]/10 text-[#0B63CE]">
                  <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
                </span>
                {s.label}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[10.5px] text-slate-400">Repères indicatifs — exemple fictif, lecture indicative.</p>
      </div>

      {/* B. Aperçu du secteur */}
      <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Aperçu du secteur</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sectorTags.map((tag) => (
            <span key={tag} className="rounded-full border border-[#e4e9f2] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-slate-500">{sectorNote}</p>
      </div>

      {/* C. Repères de marché */}
      {marketPosition ? (
        <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#0B63CE]" aria-hidden="true" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Repères de marché</p>
          </div>
          <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-extrabold ${MARKET_POSITION_COLOR[marketPosition.label]}`}>
            {marketPosition.label}
          </span>
          <p className="mt-3 text-[12px] leading-5 text-slate-500">{marketPosition.note}</p>
        </div>
      ) : null}

      {/* D. Niveau d'information disponible */}
      {infoLevel ? (
        <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={14} className="text-[#0B63CE]" aria-hidden="true" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Niveau d&apos;information disponible</p>
          </div>
          <span className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-extrabold ${INFO_LEVEL_COLOR[infoLevel.level]}`}>
            {infoLevel.level}
          </span>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {infoLevel.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.present ? "bg-emerald-500" : "bg-slate-300"}`} />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* E. Bloc promoteur (positionnement + public cible) */}
      {positioning ? (
        <div className="rounded-2xl border border-[#e4e9f2] bg-white p-5 sm:col-span-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Lecture du positionnement</p>
          <p className="mt-3 text-[12.5px] leading-5 text-slate-500">{positioning}</p>
          {targetAudience && targetAudience.length > 0 ? (
            <>
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-400">Public cible possible (exemple)</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {targetAudience.map((a) => (
                  <span key={a} className="rounded-full border border-[#e4e9f2] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {a}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
