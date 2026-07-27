"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import type { Listing } from "@/lib/listings/types";
import type { CertifiedLocalHeatmapModel } from "@/lib/ux/certified-local-heatmap";
import { buildCertifiedNeighborhoodComparisonModel } from "@/lib/ux/certified-neighborhood-comparison";

function formatMadPerM2(value: number | null): string {
  return value == null ? "Non renseigné" : `${value.toLocaleString("fr-MA")} MAD/m²`;
}

export function CertifiedNeighborhoodComparisonPanel({
  heatmap,
  visibleListings,
}: {
  heatmap: CertifiedLocalHeatmapModel;
  visibleListings: Listing[];
}) {
  const availableZones = useMemo(
    () => heatmap.zones.filter((zone) => zone.scope === "neighborhood"),
    [heatmap.zones],
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    setSelectedKeys((current) => {
      const valid = current.filter((key) => availableZones.some((zone) => zone.key === key));
      if (valid.length >= 2) return valid.slice(0, 3);
      return availableZones.slice(0, Math.min(3, availableZones.length)).map((zone) => zone.key);
    });
  }, [availableZones]);

  const model = useMemo(
    () => buildCertifiedNeighborhoodComparisonModel({
      city: heatmap.city,
      zones: heatmap.zones,
      selectedKeys,
      visibleListings,
    }),
    [heatmap.city, heatmap.zones, selectedKeys, visibleListings],
  );

  function toggle(key: string) {
    setSelectedKeys((current) => {
      if (current.includes(key)) return current.filter((candidate) => candidate !== key);
      if (current.length >= 3) return current;
      return [...current, key];
    });
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">Comparateur de quartiers</p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">Comparer des références couvertes</h2>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]"><Scale size={17} aria-hidden="true" /></span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {availableZones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableZones.map((zone) => {
              const selected = selectedKeys.includes(zone.key);
              const disabled = !selected && selectedKeys.length >= 3;
              return (
                <button
                  key={zone.key}
                  type="button"
                  onClick={() => toggle(zone.key)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`rounded-full border px-3 py-2 text-[11px] font-extrabold transition ${selected ? "border-bronze-500/50 bg-bronze-500/15 text-foreground" : disabled ? "cursor-not-allowed border-border/10 text-muted-foreground/40" : "border-border/15 text-muted-foreground hover:border-bronze-500/35 hover:text-foreground"}`}
                >
                  {zone.neighborhood}
                </button>
              );
            })}
          </div>
        ) : null}

        {model.status === "available" ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-[11.5px]">
              <thead>
                <tr>
                  <th className="border-b border-border/15 p-3 text-muted-foreground">Critère</th>
                  {model.columns.map((column) => <th key={column.key} className="border-b border-border/15 p-3 font-extrabold text-foreground">{column.name}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr><th className="border-b border-border/10 p-3 text-muted-foreground">Référence publiée</th>{model.columns.map((column) => <td key={column.key} className="border-b border-border/10 p-3 font-extrabold text-foreground"><a href={column.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3">{formatMadPerM2(column.publishedPricePerM2)}</a></td>)}</tr>
                <tr><th className="border-b border-border/10 p-3 text-muted-foreground">Observation</th>{model.columns.map((column) => <td key={column.key} className="border-b border-border/10 p-3 text-foreground">{column.observedAt.slice(0, 10)}</td>)}</tr>
                <tr><th className="border-b border-border/10 p-3 text-muted-foreground">Propriétés visibles</th>{model.columns.map((column) => <td key={column.key} className="border-b border-border/10 p-3 text-foreground">{column.visibleCanonicalProperties}</td>)}</tr>
                <tr><th className="p-3 text-muted-foreground">Médiane visible</th>{model.columns.map((column) => <td key={column.key} className="p-3 text-foreground">{formatMadPerM2(column.visibleMedianPricePerM2)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <p className="text-[13px] font-extrabold text-foreground">Comparaison indisponible</p>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{model.reason}</p>
          </div>
        )}

        <p className="rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">{model.disclosure}</p>
      </div>
    </aside>
  );
}
