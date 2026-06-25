import Link from "next/link";
import type { CompareSummary as CompareSummaryType } from "@/lib/compare/types";

export function CompareSummary({ summary }: { summary: CompareSummaryType }) {
  return (
    <section className="rounded-[1.5rem] border border-[#eadfca] bg-white p-5 shadow-[0_10px_28px_rgba(7,27,51,0.05)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
            À retenir
          </p>
          <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.035em] text-deepblue">
            Synthèse comparative indicative
          </h2>
        </div>
        <p className="max-w-xl text-[12.5px] leading-6 text-gray-500">{summary.disclaimer}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {summary.cards.map((card) => (
          <div key={card.title} className="rounded-[1.25rem] border border-[#efe3cd] bg-[#fffaf0] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a6a2f]">
              {card.title}
            </p>
            {card.winnerId ? (
              <Link
                href={`/listings/${card.winnerId}`}
                className="mt-2 block text-[1rem] font-extrabold leading-snug text-deepblue underline-offset-4 hover:underline"
              >
                {card.winnerLabel}
              </Link>
            ) : (
              <p className="mt-2 text-[1rem] font-extrabold leading-snug text-deepblue">
                {card.winnerLabel}
              </p>
            )}
            <p className="mt-2 text-[13px] leading-6 text-gray-600">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-[#eadfca] bg-[#f8f5ed] p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
          Points à vérifier
        </p>
        <ul className="mt-3 space-y-2 text-[13.5px] leading-6 text-gray-600">
          {summary.pointsToVerify.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
