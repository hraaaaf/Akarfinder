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

  return (
    <section
      data-market-comparables-summary="ann-l13"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(7,27,51,0.06)]"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0B63CE]">Marché observé</p>
      <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.03em] text-deepblue">Marché & comparables</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Médiane</p>
          <p className="mt-1 text-[14px] font-extrabold text-deepblue">{formatPricePerM2(distribution.medianPricePerM2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Comparables</p>
          <p className="mt-1 text-[14px] font-extrabold text-deepblue">{distribution.comparableStockCount}</p>
        </div>
      </div>
      {distribution.targetPosition && distribution.targetPricePerM2 != null ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">Position du prix</p>
          <p className="mt-1 text-[12.5px] font-extrabold leading-5 text-deepblue">{positionLabel(distribution.targetPosition)}</p>
          {distribution.targetGapToMedianPct != null ? (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {distribution.targetGapToMedianPct >= 0 ? "+" : ""}
              {distribution.targetGapToMedianPct.toLocaleString("fr-MA", { maximumFractionDigits: 1 })} % vs médiane
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 text-[10.5px] leading-4 text-slate-400">Prix affichés observés, pas des prix de transaction.</p>
    </section>
  );
}
