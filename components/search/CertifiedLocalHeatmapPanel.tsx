import { MapPinned } from "lucide-react";
import type { CertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";

const BAND_CLASS: Record<string, string> = {
  lowest: "bg-emerald-500/15 border-emerald-400/30",
  lower: "bg-lime-500/15 border-lime-400/30",
  middle: "bg-amber-500/15 border-amber-400/30",
  higher: "bg-orange-500/15 border-orange-400/30",
  highest: "bg-rose-500/15 border-rose-400/30",
};

export function CertifiedLocalHeatmapPanel({ model }: { model: CertifiedLocalHeatmapModel }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Carte thermique certifiée</p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">Références locales comparables</h2>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]"><MapPinned size={17} aria-hidden="true" /></span>
        </div>
      </div>

      {model.status === "available" ? (
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {model.zones.map((zone) => (
              <a key={zone.key} href={zone.sourceUrl} target="_blank" rel="noopener noreferrer" className={`rounded-xl border p-3 transition hover:-translate-y-0.5 ${BAND_CLASS[zone.band]}`}>
                <p className="text-[11px] font-bold text-muted-foreground">{zone.neighborhood ?? `${zone.city} · ville`}</p>
                <p className="mt-1 text-[14px] font-extrabold text-foreground">{zone.pricePerM2.toLocaleString("fr-MA")} MAD/m²</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">Référence observée le {zone.observedAt.slice(0, 10)}</p>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
            <span>Plus bas relatif</span><span>→</span><span>Plus élevé relatif</span>
          </div>
          <p className="rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">{model.disclosure}</p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] font-extrabold text-foreground">Carte indisponible</p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{model.reason}</p>
        </div>
      )}
    </aside>
  );
}
