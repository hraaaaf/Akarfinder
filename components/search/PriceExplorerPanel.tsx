import { BarChart3, ExternalLink, Info, ShieldCheck } from "lucide-react";
import type { PriceExplorerResult } from "@/lib/ux/price-explorer";

function formatMadPerM2(value: number): string {
  return `${value.toLocaleString("fr-MA")} MAD/m²`;
}

export function PriceExplorerPanel({ result }: { result: PriceExplorerResult }) {
  const available = result.status === "available" && result.askingPricePerM2 != null;

  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">
              Explorateur de prix
            </p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">
              Référence locale publiée
            </h2>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]">
            <BarChart3 size={17} aria-hidden="true" />
          </span>
        </div>
      </div>

      {available ? (
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[12px] font-bold text-muted-foreground">
              {result.scope === "neighborhood" && result.neighborhood
                ? `${result.city}, ${result.neighborhood}`
                : result.city}
              {result.propertyType ? ` · ${result.propertyType}` : ""}
            </p>
            <p className="mt-1 text-[1.75rem] font-extrabold tracking-[-0.045em] text-foreground">
              {formatMadPerM2(result.askingPricePerM2!)}
            </p>
            <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">Prix demandé agrégé publié</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Confiance</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">{result.confidence}</p>
            </div>
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Échantillon</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">{result.sampleLabel}</p>
            </div>
          </div>

          {result.rangeLow != null && result.rangeHigh != null ? (
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Fourchette publiée</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">
                {formatMadPerM2(result.rangeLow)} – {formatMadPerM2(result.rangeHigh)}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">
              Dispersion non publiée : aucune fourchette n’est reconstruite artificiellement.
            </p>
          )}

          <div className="space-y-2 border-t border-border/12 pt-4 text-[11px] leading-5 text-muted-foreground dark:border-white/8">
            <p className="flex gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>{result.methodology}</span>
            </p>
            <p className="flex gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-bronze-500" aria-hidden="true" />
              <span>{result.disclosure}</span>
            </p>
          </div>

          {result.sourceUrl ? (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-bronze-500 underline underline-offset-3"
            >
              Voir la référence source <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] font-extrabold text-foreground">Référence indisponible</p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{result.reason}</p>
          <p className="mt-3 rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">
            AkarFinder n’affiche aucune moyenne, fourchette ou confiance lorsque la preuve de publication est insuffisante.
          </p>
        </div>
      )}
    </aside>
  );
}
