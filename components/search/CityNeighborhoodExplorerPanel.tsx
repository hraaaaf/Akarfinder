"use client";

import { Building2, ChevronRight, Map } from "lucide-react";
import type { CityNeighborhoodExplorerModel } from "@/lib/ux/city-neighborhood-explorer";

function navigateTo(paramsPatch: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(paramsPatch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState(window.history.state, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function CityNeighborhoodExplorerPanel({ model }: { model: CityNeighborhoodExplorerModel }) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-border/15 bg-card shadow-[0_14px_40px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.045]">
      <div className="border-b border-border/12 bg-surface/70 px-5 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500 dark:text-bronze-400">
              Exploration ville → quartier
            </p>
            <h2 className="mt-1 text-[1.05rem] font-extrabold tracking-[-0.02em] text-foreground">
              Référentiel interactif certifié
            </h2>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border/15 bg-background text-bronze-500 dark:border-white/10 dark:bg-white/[0.04]">
            <Map size={17} aria-hidden="true" />
          </span>
        </div>
      </div>

      {model.status === "available" ? (
        <div className="space-y-4 px-5 py-5">
          {!model.selectedCity ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {model.cities.map((city) => (
                <button
                  key={city.city}
                  type="button"
                  onClick={() => navigateTo({ city: city.city, district: null })}
                  className="rounded-xl border border-border/12 bg-surface/60 p-3 text-left transition hover:-translate-y-0.5 hover:border-bronze-500/40 dark:border-white/8 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-foreground">
                      <Building2 size={14} aria-hidden="true" /> {city.city}
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {city.cityReferencePricePerM2 != null
                      ? `${city.cityReferencePricePerM2.toLocaleString("fr-MA")} MAD/m² · référence ville`
                      : "Référence ville non publiée"}
                  </p>
                  <p className="mt-1 text-[10.5px] font-semibold text-muted-foreground">
                    {city.publishedZoneCount} quartier{city.publishedZoneCount > 1 ? "s" : ""} couvert{city.publishedZoneCount > 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">Ville sélectionnée</p>
                  <p className="text-[16px] font-extrabold text-foreground">{model.selectedCity}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo({ city: null, district: null })}
                  className="rounded-full border border-border/15 px-3 py-2 text-[11px] font-extrabold text-foreground transition hover:border-bronze-500/40 dark:border-white/10"
                >
                  Voir toutes les villes
                </button>
              </div>

              {model.neighborhoods.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {model.neighborhoods.map((neighborhood) => {
                    const active = model.selectedNeighborhood?.toLowerCase() === neighborhood.neighborhood.toLowerCase();
                    return (
                      <button
                        key={neighborhood.neighborhood}
                        type="button"
                        onClick={() => navigateTo({ district: neighborhood.neighborhood })}
                        aria-pressed={active}
                        className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? "border-bronze-500/60 bg-bronze-500/10"
                            : "border-border/12 bg-surface/60 hover:border-bronze-500/40 dark:border-white/8 dark:bg-white/[0.03]"
                        }`}
                      >
                        <p className="text-[13px] font-extrabold text-foreground">{neighborhood.neighborhood}</p>
                        <p className="mt-1 text-[12px] font-bold text-foreground">
                          {neighborhood.pricePerM2.toLocaleString("fr-MA")} MAD/m²
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Observé le {neighborhood.observedAt.slice(0, 10)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/15 px-3 py-3 text-[11px] text-muted-foreground dark:border-white/10">
                  Aucun quartier publiable n’est disponible pour cette ville et ce type de bien.
                </p>
              )}
            </div>
          )}

          <p className="rounded-xl border border-dashed border-border/15 px-3 py-2.5 text-[11px] leading-4 text-muted-foreground dark:border-white/10">
            {model.disclosure}
          </p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-[13px] font-extrabold text-foreground">Exploration indisponible</p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{model.reason}</p>
        </div>
      )}
    </aside>
  );
}
