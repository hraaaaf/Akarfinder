import Link from "next/link";
import { ui } from "@/components/ui/design-system";
import type { CompareSummary as CompareSummaryType } from "@/lib/compare/types";

export function CompareSummary({ summary }: { summary: CompareSummaryType }) {
  return (
    <section className={`${ui.surfacePremium} p-5`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={ui.eyebrow}>À retenir</p>
          <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">
            Synthèse comparative indicative
          </h2>
        </div>
        <p className="max-w-xl text-[12.5px] leading-6 text-slate-500">{summary.disclaimer}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {summary.cards.map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">{card.title}</p>
            {card.winnerId ? (
              <Link
                href={`/listings/${card.winnerId}`}
                className="mt-2 block text-[1rem] font-extrabold leading-snug text-[#0B1F3A] underline-offset-4 hover:underline"
              >
                {card.winnerLabel}
              </Link>
            ) : (
              <p className="mt-2 text-[1rem] font-extrabold leading-snug text-[#0B1F3A]">{card.winnerLabel}</p>
            )}
            <p className="mt-2 text-[13px] leading-6 text-slate-600">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Points à vérifier</p>
        <ul className="mt-3 space-y-2 text-[13.5px] leading-6 text-slate-600">
          {summary.pointsToVerify.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
