import type { LivingHereModel } from "@/lib/geo/living-here";
import {
  buildListingExperienceSummary,
  type P5ListingSummaryKey,
} from "@/lib/property-detail/listing-experience-summary";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

const cardAccent: Record<P5ListingSummaryKey, string> = {
  confidence: "border-emerald-200/80 bg-emerald-50/35",
  market: "border-blue-200/80 bg-blue-50/35",
  living: "border-cyan-200/80 bg-cyan-50/35",
};

export function ListingExperienceSummary({
  detail,
  marketComparables = null,
  livingHere = null,
}: {
  detail: PublicPropertyDetailV2;
  marketComparables?: MarketComparableSet | null;
  livingHere?: LivingHereModel | null;
}) {
  const cards = buildListingExperienceSummary({ detail, marketComparables, livingHere });

  return (
    <section
      data-p5-listing-hierarchy="active"
      className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,38,68,0.055)] sm:p-5"
      aria-label="Repères essentiels de l’annonce"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[#0B63CE]">Lecture essentielle</p>
          <h2 className="mt-1 text-[1rem] font-black tracking-[-0.025em] text-[#0B2545]">Les repères utiles avant le détail</h2>
        </div>
        <p className="max-w-[360px] text-[10.5px] font-semibold leading-4 text-slate-500">
          Données disponibles uniquement. Aucun score, prix ou contexte n’est complété par supposition.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            data-p5-listing-summary={card.key}
            className={`min-w-0 rounded-2xl border p-4 ${cardAccent[card.key]}`}
          >
            <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-500">{card.title}</p>
            <p className="mt-2 break-words text-[15px] font-black tracking-[-0.02em] text-[#0B2545]">{card.primary}</p>
            <p className="mt-1.5 text-[11px] font-semibold leading-4 text-slate-500">{card.secondary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ListingSourceNote({ detail }: { detail: PublicPropertyDetailV2 }) {
  return (
    <section
      data-p5-listing-source-summary="active"
      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5"
      aria-label="Source de l’annonce"
    >
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Source</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[13px] font-black text-[#0B2545]">{detail.provenance.source_name}</p>
          <p className="mt-0.5 text-[10.5px] font-semibold text-slate-500">{detail.provenance.fact_provenance_label}</p>
        </div>
        {detail.provenance.source_url ? (
          <a
            href={detail.provenance.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-[10.5px] font-extrabold text-[#0B63CE] transition hover:border-blue-200 hover:bg-blue-50 motion-reduce:transition-none"
          >
            Voir l’origine
          </a>
        ) : null}
      </div>
    </section>
  );
}
