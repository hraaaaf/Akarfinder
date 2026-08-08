import { Compass, ExternalLink } from "lucide-react";
import type { CertifiedSimilarNeighborhoodsModel } from "@/lib/ux/certified-similar-neighborhoods";

export function CertifiedSimilarNeighborhoodsPanel({ model }: { model: CertifiedSimilarNeighborhoodsModel }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Quartiers similaires</p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">Des quartiers aux prix proches</h2>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]"><Compass size={17} aria-hidden="true" /></span>
        </div>
      </div>

      {model.status === "available" ? (
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">Quartier comparé</p>
            <p className="mt-1 text-[15px] font-extrabold text-foreground">{model.selectedNeighborhood}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{model.selectedPublishedPricePerM2?.toLocaleString("fr-MA")} MAD/m²</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {model.candidates.map((candidate) => (
              <article key={candidate.key} className="rounded-xl border border-border/12 bg-surface/60 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[14px] font-extrabold text-foreground">{candidate.neighborhood}</p>
                <p className="mt-1 text-[12px] font-bold text-foreground">{candidate.publishedPricePerM2.toLocaleString("fr-MA")} MAD/m²</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">Écart de prix : {candidate.priceGapPct.toLocaleString("fr-MA", { maximumFractionDigits: 1 })} %</p>
                <p className="mt-2 text-[10.5px] text-muted-foreground">{candidate.visibleCanonicalProperties.toLocaleString("fr-MA")} annonce(s) visible(s)</p>
                <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-bronze-500 underline underline-offset-3">Voir la source <ExternalLink size={11} aria-hidden="true" /></a>
              </article>
            ))}
          </div>

          <p className="rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">{model.disclosure}</p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] font-extrabold text-foreground">Pas assez de données pour comparer</p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{model.reason}</p>
        </div>
      )}
    </aside>
  );
}
