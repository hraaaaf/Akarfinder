import { ChartNoAxesCombined, Layers3, ShieldCheck, TriangleAlert } from "lucide-react";
import { buildAkarInsightModel, type AkarInsightKey } from "@/lib/property-detail/akar-insight";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

const ICONS: Record<AkarInsightKey, typeof ChartNoAxesCombined> = {
  market: ChartNoAxesCombined,
  multisource: Layers3,
  attention: TriangleAlert,
};

export function AkarInsightCard({ detail }: { detail: PublicPropertyDetailV2 }) {
  const model = buildAkarInsightModel(detail);
  const hasContent = model.score != null || model.scoreLabel != null || model.coverageLabel != null || model.items.length > 0;
  if (!hasContent) return null;

  return (
    <section
      data-akar-insight-card="ann-l4"
      data-akar-intelligence-version={model.version}
      data-akar-truth-contract-version={model.truthContractVersion}
      className="overflow-hidden rounded-[24px] border border-[#c9def4] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_100%)] px-5 py-5 shadow-[0_16px_40px_rgba(11,99,206,0.08)] sm:px-6 sm:py-6"
      aria-labelledby="akar-insight-heading"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            <ShieldCheck size={14} aria-hidden="true" /> AkarFinder Intelligence
          </p>
          <h2 id="akar-insight-heading" className="mt-1 text-[1.3rem] font-extrabold tracking-[-0.035em] text-deepblue sm:text-[1.45rem]">Lecture du dossier</h2>
          {model.scoreLabel ? <p data-akar-score-label className="mt-2 text-[13.5px] font-semibold leading-6 text-slate-700">{model.scoreLabel}</p> : null}
          {model.coverageLabel ? <p data-akar-coverage className="mt-1 text-[11.5px] font-semibold text-slate-500">{model.coverageLabel}</p> : null}
        </div>
        {model.score != null ? (
          <div data-akar-score className="shrink-0 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-right shadow-[0_8px_20px_rgba(11,37,69,0.06)] backdrop-blur-sm">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">AkarScore</p>
            <p className="mt-1 text-[1.9rem] font-black leading-none tracking-[-0.05em] text-deepblue sm:text-[2.2rem]">{model.score}<span className="text-[0.9rem] font-extrabold text-slate-400">/100</span></p>
          </div>
        ) : null}
      </div>
      {model.items.length > 0 ? (
        <dl data-akar-insight-items className="mt-5 divide-y divide-[#d5e6f6] border-t border-[#d5e6f6]">
          {model.items.map((item) => {
            const Icon = ICONS[item.key];
            const warning = item.key === "attention";
            return (
              <div key={item.key} data-akar-insight-item={item.key} className="grid grid-cols-[22px_92px_minmax(0,1fr)] gap-2 py-3 sm:grid-cols-[22px_110px_minmax(0,1fr)]">
                <Icon size={16} aria-hidden="true" className={warning ? "mt-0.5 text-amber-700" : "mt-0.5 text-[#0B63CE]"} />
                <dt className={`text-[10px] font-extrabold uppercase tracking-[0.08em] ${warning ? "text-amber-800" : "text-slate-500"}`}>{item.label}</dt>
                <dd className={`min-w-0 break-words text-[13px] font-semibold leading-5 ${warning ? "text-amber-900" : "text-slate-700"}`}>{item.value}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      <p data-akar-engine-version className="mt-4 border-t border-[#d5e6f6] pt-3 text-[9.5px] font-semibold text-slate-400">
        Intelligence v{model.version} · Contrat v{model.truthContractVersion}
      </p>
    </section>
  );
}
