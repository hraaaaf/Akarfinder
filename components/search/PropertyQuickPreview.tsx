"use client";

import Link from "next/link";
import { ArrowRight, Building2, MapPin, X } from "lucide-react";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import { formatPrice } from "@/lib/listings/utils";
import { buildSmartPropertyCardModel } from "@/lib/ux/smart-property-card";

export function PropertyQuickPreview() {
  const { activeListing, selection, clearSelection } = usePropertySelection();

  if (!activeListing || selection.interaction !== "selected") return null;

  const model = buildSmartPropertyCardModel(activeListing);
  const observedExternal = Boolean(
    activeListing.listing_url &&
      (activeListing.search_result_display_mode === "indexed_result" ||
        activeListing.search_result_display_mode === "thin_indexed_result"),
  );
  const href = observedExternal && activeListing.listing_url
    ? activeListing.listing_url
    : `/listings/${activeListing.id}`;

  return (
    <section
      aria-label="Aperçu rapide du bien sélectionné"
      className="border-b border-border/12 bg-surface/95 px-4 py-4 backdrop-blur dark:border-white/8 dark:bg-deepblue/95 sm:px-6"
    >
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4 rounded-2xl border border-bronze-500/30 bg-card p-4 shadow-[0_16px_42px_rgba(2,10,24,0.16)] dark:bg-white/[0.045] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-bronze-500/30 bg-bronze-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-bronze-300">
              Aperçu rapide
            </span>
            <span className="rounded-full border border-border/15 bg-surface px-2.5 py-1 text-[10px] font-bold text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              {model.canonicalLabel}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
            <div className="min-w-0">
              <h2 className="line-clamp-1 text-[1rem] font-extrabold text-foreground sm:text-[1.15rem]">
                {model.title}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
                <MapPin size={13} className="shrink-0 text-bronze-500" aria-hidden="true" />
                <span className="truncate">{model.locationLabel}</span>
              </p>
            </div>

            <div className="shrink-0">
              <p className="text-[1.35rem] font-extrabold tracking-[-0.035em] text-bronze-400">
                {formatPrice(model.price, activeListing.currency)}
              </p>
              {model.pricePerM2 != null ? (
                <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                  {model.pricePerM2.toLocaleString("fr-MA")} DH/m²
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-foreground/70">
            {model.facts.map((fact) => (
              <span key={fact} className="rounded-full border border-border/15 bg-surface px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.04]">
                {fact}
              </span>
            ))}
            <span className="rounded-full border border-border/15 bg-surface px-2.5 py-1 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              {model.freshnessLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/15 bg-surface px-2.5 py-1 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              <Building2 size={11} aria-hidden="true" /> {model.sourceLabel}
            </span>
          </div>

          <p className="mt-2 text-[10.5px] leading-4 text-muted-foreground/85">
            Aucun avis de marché, historique de prix ou nombre de sources n’est affiché sans donnée certifiée.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={href}
            target={observedExternal ? "_blank" : undefined}
            rel={observedExternal ? "noopener noreferrer" : undefined}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-3 text-[12.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.3)] transition hover:from-bronze-600 sm:flex-none"
          >
            {observedExternal ? "Voir la source" : "Ouvrir le bien"}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Fermer l’aperçu rapide"
            className="grid h-11 w-11 place-items-center rounded-xl border border-border/20 bg-surface text-muted-foreground transition hover:text-foreground dark:border-white/12 dark:bg-white/[0.04]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
