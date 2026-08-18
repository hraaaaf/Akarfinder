import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";

function formatPricePerM2(value: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value)} DH/m²`;
}

function positionLabel(position: NonNullable<NonNullable<MarketComparableSet["distribution"]>["targetPosition"]>): string {
  if (position === "below_distribution") return "Sous la zone centrale observée";
  if (position === "above_distribution") return "Au-dessus de la zone centrale observée";
  return "Dans la zone centrale observée";
}

export function MarketComparablesSummaryCard({ model }: { model?: MarketComparableSet | null }) {
  if (!model || model.status !== "certified" || !model.distribution || model.comparables.length === 0) return null;
  const distribution = model.distribution;
  const gap = distribution.targetGapToMedianPct ?? 0;
  const markerPct = Math.max(8, Math.min(92, 50 + gap * 1.6));

  return (
    <section
      data-market-comparables-summary="ann-l13"
      className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,38,68,0.075)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9.5px] font-black uppercase tracking-[0.15em] text-[#0B63CE]">Marché observé</p>
          <h2 className="mt-1 text-[1.05rem] font-black tracking-[-0.03em] text-deepblue">Marché & comparables</h2>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">Certifié</span>
      </div>

      {distribution.targetPosition && distribution.targetPricePerM2 != null ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Position du prix</p>
            <p className="text-[10.5px] font-extrabold text-deepblue">
              {gap >= 0 ? "+" : ""}{gap.toLocaleString("fr-MA", { maximumFractionDigits: 1 })} %
            </p>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500">
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B2545] shadow-sm ring-2 ring-white"
              style={{ left: `${markerPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] font-extrabold leading-4 text-deepblue">{positionLabel(distribution.targetPosition)}</p>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Médiane observée</p>
          <p className="mt-1 text-[14px] font-black tracking-[-0.02em] text-deepblue">{formatPricePerM2(distribution.medianPricePerM2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Comparables</p>
          <p className="mt-1 text-[14px] font-black tracking-[-0.02em] text-deepblue">{distribution.comparableStockCount}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-400">Prix affichés observés, pas des prix de transaction.</p>
    </section>
  );
}
