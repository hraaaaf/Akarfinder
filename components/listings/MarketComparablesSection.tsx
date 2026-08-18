import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";

function formatMad(value: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value)} DH`;
}

function formatPricePerM2(value: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value)} DH/m²`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function positionLabel(position: NonNullable<NonNullable<MarketComparableSet["distribution"]>["targetPosition"]>): string {
  if (position === "below_distribution") return "Sous la zone centrale observée";
  if (position === "above_distribution") return "Au-dessus de la zone centrale observée";
  return "Dans la zone centrale observée";
}

export function MarketComparablesSection({ model }: { model?: MarketComparableSet | null }) {
  if (!model || model.status !== "certified" || !model.distribution || model.comparables.length === 0) return null;
  const distribution = model.distribution;
  const observedAt = formatDate(model.observedAt);

  return (
    <section data-market-comparables="ann-l8" className="my-7 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0B63CE]">Marché observé</p>
          <h2 className="mt-1 text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">Marché & comparables</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-slate-500">
            {model.scope === "neighborhood"
              ? "Comparables vérifiés dans le même quartier lorsque l’échantillon est suffisant."
              : "Échantillon ville utilisé faute d’un nombre suffisant de comparables vérifiés dans le quartier."}
          </p>
        </div>
        <div className="text-right text-[10.5px] font-semibold text-slate-400">
          <p>{model.scope === "neighborhood" ? "Périmètre : quartier" : "Périmètre : ville"}</p>
          {observedAt ? <p>Dernière observation : {observedAt}</p> : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Médiane observée</dt>
          <dd className="mt-1 text-[17px] font-extrabold text-deepblue">{formatPricePerM2(distribution.medianPricePerM2)}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Zone centrale P25–P75</dt>
          <dd className="mt-1 text-[14px] font-extrabold text-deepblue">
            {formatPricePerM2(distribution.p25PricePerM2)} – {formatPricePerM2(distribution.p75PricePerM2)}
          </dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
          <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Comparables observés</dt>
          <dd className="mt-1 text-[17px] font-extrabold text-deepblue">{distribution.comparableStockCount}</dd>
        </div>
      </dl>

      {distribution.targetPosition && distribution.targetPricePerM2 != null ? (
        <div data-market-position="certified" className="mt-3 rounded-2xl border border-[#0B63CE]/15 bg-[#eef6ff] px-4 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B63CE]">Position du prix demandé</p>
          <p className="mt-1 text-[13.5px] font-extrabold text-deepblue">{positionLabel(distribution.targetPosition)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatPricePerM2(distribution.targetPricePerM2)}
            {distribution.targetGapToMedianPct != null
              ? ` · ${distribution.targetGapToMedianPct >= 0 ? "+" : ""}${distribution.targetGapToMedianPct.toLocaleString("fr-MA", { maximumFractionDigits: 1 })} % vs médiane`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {model.comparables.map((comparable) => (
          <article key={comparable.propertyClusterId} data-market-comparable-card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(7,27,51,0.05)]">
            <p className="text-[15px] font-extrabold text-deepblue">{formatMad(comparable.displayedPriceMad)}</p>
            <p className="mt-1 text-[12px] font-bold text-slate-600">
              {new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(comparable.surfaceM2)} m² · {formatPricePerM2(comparable.pricePerM2)}
            </p>
            <p className="mt-2 text-[10.5px] leading-4 text-slate-400">
              Observé le {formatDate(comparable.observedAt) ?? "date indisponible"} · {comparable.sourceCount} source{comparable.sourceCount > 1 ? "s" : ""}
            </p>
            <p className="mt-1 truncate text-[10.5px] font-semibold text-slate-400" title={comparable.sourceAttribution.join(", ")}>
              {comparable.sourceAttribution.join(" · ")}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-3 text-[10.5px] leading-4 text-slate-400">
        Échantillon issu de propriétés regroupées et observées dans Market Index. Les prix sont des prix affichés observés, pas des prix de transaction. Ce bloc n’est ni une estimation certifiée du bien ni une garantie de valeur.
      </p>
    </section>
  );
}
