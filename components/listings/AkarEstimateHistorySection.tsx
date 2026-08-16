import type { AkarEstimateHistoryRuntime } from "@/lib/property-detail/akar-estimate-history-runtime";

function formatMad(value: number): string {
  return `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(value)} DH`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function AkarEstimateHistorySection({ model }: { model?: AkarEstimateHistoryRuntime | null }) {
  if (!model || model.history.status !== "available" || model.history.points.length === 0) return null;

  return (
    <section data-price-history="ann-l9" className="border-b border-slate-200 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0B63CE]">Historique observé</p>
          <h2 className="mt-1 text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">Évolution du prix affiché</h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-slate-500">
            Observations réelles enregistrées par AkarFinder sur les sources attribuées à ce même bien.
          </p>
        </div>
        <p className="text-[10.5px] font-semibold text-slate-400">
          {model.history.observationCount} observation{model.history.observationCount > 1 ? "s" : ""}
        </p>
      </div>

      <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {model.history.points.map((point, index) => (
          <li key={`${point.sourceOfferId}-${point.observedAt}-${point.displayedPriceMad}-${index}`} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
            <div>
              <p className="text-[13px] font-extrabold text-deepblue">{formatMad(point.displayedPriceMad)}</p>
              <p className="mt-0.5 text-[10.5px] font-semibold text-slate-400">Source : {point.sourceName}</p>
            </div>
            <time dateTime={point.observedAt} className="text-[11px] font-bold text-slate-500">
              {formatDate(point.observedAt)}
            </time>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10.5px] leading-4 text-slate-400">
        Il s’agit de prix affichés observés, pas de prix de transaction. Aucune valeur manquante n’est interpolée.
      </p>
    </section>
  );
}
