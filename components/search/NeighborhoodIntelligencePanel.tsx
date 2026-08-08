import { Building2, Database, Info, MapPinned, ShieldCheck } from "lucide-react";
import type { NeighborhoodIntelligenceModel } from "@/lib/ux/neighborhood-intelligence";

function formatMadPerM2(value: number): string {
  return `${value.toLocaleString("fr-MA")} MAD/m²`;
}

export function NeighborhoodIntelligencePanel({ model }: { model: NeighborhoodIntelligenceModel }) {
  const available = model.status === "available";

  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">
              Le quartier en chiffres
            </p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">
              Ce que montrent les résultats
            </h2>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]">
            <MapPinned size={17} aria-hidden="true" />
          </span>
        </div>
      </div>

      {available ? (
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[12px] font-bold text-muted-foreground">{model.scopeLabel}</p>
            <p className="mt-1 text-[1.5rem] font-extrabold tracking-[-0.04em] text-foreground">
              {model.canonicalPropertyCount.toLocaleString("fr-MA")} annonce{model.canonicalPropertyCount > 1 ? "s" : ""} distincte{model.canonicalPropertyCount > 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">Après regroupement des annonces similaires</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Prix renseigné</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">
                {model.disclosedPriceCount}/{model.canonicalPropertyCount}
              </p>
            </div>
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Position exacte</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">
                {model.exactGeoCount}/{model.canonicalPropertyCount}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Prix médian affiché</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">
                {model.displayedMedianPricePerM2 != null ? formatMadPerM2(model.displayedMedianPricePerM2) : "Non calculable"}
              </p>
            </div>
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Repère de prix</p>
              <p className="mt-1 text-[12px] font-extrabold text-foreground">
                {model.publishedReferencePricePerM2 != null ? formatMadPerM2(model.publishedReferencePricePerM2) : "Non disponible"}
              </p>
              <p className="mt-1 text-[10.5px] font-semibold text-muted-foreground">Confiance : {model.publishedReferenceConfidence}</p>
            </div>
          </div>

          {model.propertyMix.length > 0 ? (
            <div className="rounded-xl border border-border/12 bg-surface/60 p-3 dark:border-white/8 dark:bg-white/[0.03]">
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                <Building2 size={12} aria-hidden="true" /> Types de biens
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {model.propertyMix.map((item) => (
                  <span key={item.propertyType} className="rounded-full border border-border/15 px-2.5 py-1 text-[10.5px] font-bold text-foreground/75 dark:border-white/10">
                    {item.propertyType} · {item.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 border-t border-border/12 pt-4 text-[11px] leading-5 text-muted-foreground dark:border-white/8">
            <p className="flex gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" /><span>{model.disclosure}</span></p>
            <p className="flex gap-2"><Database size={14} className="mt-0.5 shrink-0 text-bronze-500" aria-hidden="true" /><span>Les annonces reconnues comme similaires ne sont comptées qu’une fois.</span></p>
          </div>

          <div className="rounded-xl border border-dashed border-border/15 px-3 py-3 dark:border-white/10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Données non disponibles</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{model.unavailableInsights.join(" · ")}</p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] font-extrabold text-foreground">
            {model.status === "insufficient_scope" ? "Choisissez une ville" : "Aucune annonce visible"}
          </p>
          <p className="mt-2 flex gap-2 text-[12px] leading-5 text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Ces informations apparaissent lorsqu’une zone précise contient suffisamment de résultats.</span>
          </p>
        </div>
      )}
    </aside>
  );
}
