"use client";

import { useState } from "react";
import { ArrowUpRight, Building2, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";
import { formatPriceMad, isPriceToVerify } from "@/lib/search-gateway/price-verification";

type ExternalIndexedResultCardProps = {
  results: SearchGatewayNormalizedResult[];
  similarPossible?: boolean;
};

function cleanToken(value?: string | null): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned : null;
}

function cleanDomain(value?: string | null): string | null {
  const cleaned = cleanToken(value)?.replace(/^www\./i, "");
  return cleaned || null;
}

function getSourceDomain(result: SearchGatewayNormalizedResult): string {
  const explicit = cleanDomain(result.domain) || cleanDomain(result.source_name);
  if (explicit) return explicit;

  try {
    return new URL(result.original_url).hostname.replace(/^www\./i, "");
  } catch {
    return cleanDomain(result.display_url) || "source externe";
  }
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

export function ExternalIndexedResultCard({
  results,
  similarPossible = false,
}: ExternalIndexedResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleResults = results.filter((result) => result.can_show_result);
  if (visibleResults.length === 0) return null;

  const representative = visibleResults[0];
  const title = buildGeneratedTitle(representative);
  const city = cleanToken(representative.normalized_city);
  const propertyType = cleanToken(representative.normalized_property_type);
  const intent = getIntentLabel(representative.normalized_intent);
  const priceLabel = formatPriceMad(representative.normalized_price_mad);
  const priceToVerify = isPriceToVerify(representative);
  const sourcePages = [
    ...new Map(
      visibleResults.map((result) => [
        result.original_url,
        { id: result.id, url: result.original_url, domain: getSourceDomain(result) },
      ]),
    ).values(),
  ];
  const sourceDomains = [...new Set(sourcePages.map((source) => source.domain))];
  const visibleDomains = sourceDomains.slice(0, 2);
  const hiddenDomainCount = Math.max(0, sourceDomains.length - visibleDomains.length);
  const grouped = similarPossible && sourcePages.length > 1;
  const sourceListId = `external-source-list-${representative.id}`;

  return (
    <article
      data-external-serp-group
      data-external-group-size={sourcePages.length}
      data-price-verification={priceToVerify ? "to_verify" : priceLabel ? "trusted" : "missing"}
      className="min-w-0 rounded-2xl border border-border/15 bg-card px-3.5 py-3.5 shadow-[0_5px_18px_rgba(15,23,42,0.035)] dark:border-white/10 dark:bg-white/[0.03] sm:px-4 sm:py-4"
    >
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[14px] font-extrabold leading-[1.3] tracking-[-0.015em] text-foreground dark:text-white sm:text-[15px]">
          {title}
        </h3>

        {priceLabel ? (
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-black tracking-[-0.02em] text-foreground dark:text-white sm:text-[16px]">
              {priceLabel}
            </span>
            {priceToVerify ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2 py-0.5 text-[9.5px] font-extrabold text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-200 sm:text-[10px]">
                Prix à vérifier
              </span>
            ) : null}
          </div>
        ) : null}

        {(intent || propertyType || city) ? (
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

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
          {visibleDomains.map((domain) => (
            <span
              key={domain}
              className="max-w-[180px] truncate rounded-full border border-emerald-700/15 bg-emerald-500/[0.06] px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/[0.06] dark:text-emerald-300 sm:text-[10.5px]"
            >
              {domain}
            </span>
          ))}
          {hiddenDomainCount > 0 ? (
            <span className="rounded-full border border-border/15 bg-surface px-2.5 py-1 text-[10px] font-extrabold text-foreground/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 sm:text-[10.5px]">
              +{hiddenDomainCount} source{hiddenDomainCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {grouped ? (
          <p className="mt-2 text-[10.5px] font-semibold text-amber-800 dark:text-amber-200 sm:text-[11px]">
            {sourcePages.length} pages semblent concerner le même bien.
          </p>
        ) : null}

        <div className="mt-2.5 flex min-w-0 items-center justify-between gap-3 border-t border-border/10 pt-2.5 dark:border-white/8">
          <p className="min-w-0 text-[10px] leading-4 text-muted-foreground/85 dark:text-white/45 sm:text-[10.5px]">
            AkarFinder indexe la page et vous renvoie vers la source originale.
          </p>

          {grouped ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={sourceListId}
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold text-bronze-700 transition hover:text-bronze-800 dark:text-bronze-300 dark:hover:text-bronze-200 sm:text-[11.5px]"
            >
              Voir les {sourcePages.length} pages
              {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            </button>
          ) : (
            <a
              href={sourcePages[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold text-bronze-700 transition hover:text-bronze-800 dark:text-bronze-300 dark:hover:text-bronze-200 sm:text-[11.5px]"
            >
              Ouvrir la source
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )}
        </div>

        {grouped && expanded ? (
          <div
            id={sourceListId}
            data-external-source-list
            className="mt-2 overflow-hidden rounded-xl border border-border/12 bg-surface/55 dark:border-white/8 dark:bg-white/[0.025]"
          >
            {sourcePages.map((source, index) => (
              <a
                key={`${source.id}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center justify-between gap-3 border-b border-border/10 px-3 py-2 text-[10.5px] last:border-b-0 hover:bg-surface dark:border-white/8 dark:hover:bg-white/[0.035] sm:text-[11px]"
              >
                <span className="min-w-0 truncate font-extrabold text-foreground/75 dark:text-white/75">
                  {source.domain}
                  {sourcePages.filter((item) => item.domain === source.domain).length > 1 ? ` · page ${index + 1}` : ""}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 font-extrabold text-bronze-700 dark:text-bronze-300">
                  Ouvrir <ArrowUpRight size={12} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
