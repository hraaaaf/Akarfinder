"use client";

import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

type ExternalIndexedResultCardProps = {
  result: SearchGatewayNormalizedResult;
};

function cleanToken(value?: string | null): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

function cleanDomain(value?: string | null): string {
  return cleanToken(value)?.replace(/^www\./i, "") ?? "source externe";
}

function getIntentLabel(intent?: string | null): string | null {
  const value = intent?.toLowerCase();
  if (value === "rent" || value === "location") return "Location";
  if (value === "new" || value === "neuf") return "Neuf";
  if (value === "buy" || value === "sale" || value === "achat") return "Achat";
  return null;
}

function buildGeneratedTitle(result: SearchGatewayNormalizedResult): string {
  const propertyType = cleanToken(result.normalized_property_type);
  const city = cleanToken(result.normalized_city);
  const intent = getIntentLabel(result.normalized_intent);

  if (propertyType && city) return `${propertyType} à ${city}`;
  if (city && intent === "Location") return `Bien à louer à ${city}`;
  if (city && intent === "Neuf") return `Programme immobilier à ${city}`;
  if (city) return `Bien immobilier à ${city}`;
  if (propertyType) return propertyType;
  return "Bien immobilier";
}

export function ExternalIndexedResultCard({ result }: ExternalIndexedResultCardProps) {
  if (!result.can_show_result) return null;

  const source = cleanDomain(result.domain);
  const city = cleanToken(result.normalized_city);
  const propertyType = cleanToken(result.normalized_property_type);
  const intent = getIntentLabel(result.normalized_intent);
  const generatedTitle = buildGeneratedTitle(result);
  const facts = [intent, propertyType, city].filter((value): value is string => Boolean(value));

  return (
    <a
      href={result.original_url}
      target="_blank"
      rel="noopener noreferrer"
      data-external-serp-result
      aria-label={`Voir ce résultat immobilier sur ${source}`}
      className="group block min-w-0 bg-card px-3.5 py-3.5 transition-colors hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bronze-500/60 dark:bg-white/[0.035] dark:hover:bg-white/[0.06] sm:px-4 sm:py-4"
    >
      <div className="flex min-w-0 gap-3 sm:gap-3.5">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/15 bg-surface text-[13px] font-black uppercase text-deepblue shadow-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-white sm:h-10 sm:w-10">
          {source.slice(0, 1)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 sm:text-[12px]">
              {source}
            </span>
            <span className="rounded-full border border-border/15 bg-surface px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05] dark:text-white/55 sm:text-[9.5px]">
              Index externe
            </span>
          </div>

          <h3 className="mt-1 line-clamp-2 text-[14px] font-extrabold leading-[1.3] tracking-[-0.015em] text-foreground transition-colors group-hover:text-bronze-700 dark:text-white dark:group-hover:text-bronze-300 sm:text-[15px]">
            {generatedTitle}
          </h3>

          {facts.length > 0 ? (
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-semibold text-muted-foreground sm:text-[11.5px]">
              {intent ? <span>{intent}</span> : null}
              {propertyType ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 size={11} aria-hidden="true" />
                  {propertyType}
                </span>
              ) : null}
              {city ? (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin size={11} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{city}</span>
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 text-[10px] font-medium leading-4 text-muted-foreground/85 dark:text-white/45 sm:text-[11px]">
              Résultat indexé · détails, prix et disponibilité à vérifier sur la source.
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold text-bronze-700 dark:text-bronze-300 sm:text-[11.5px]">
              Voir la source
              <ArrowUpRight size={13} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
