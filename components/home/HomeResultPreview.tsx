"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SourceBadge, deriveBadge } from "@/components/badges/SourceBadge";
import { SourceAttribution } from "@/components/badges/SourceAttribution";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { geoEnrichedMockListings } from "@/lib/listings/mock-listings";
import type { Listing } from "@/lib/listings/types";

// ── Reliability dot ─────────────────────────────────────────
function ReliabilityDot({ score }: { score: number }) {
  const dot =
    score >= 80 ? "bg-emerald-400" : score >= 50 ? "bg-sky-400" : "bg-rose-400";
  const txt =
    score >= 80 ? "Fiable" : score >= 50 ? "À vérifier" : "Signal faible";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/45">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {txt} {score}/100
    </span>
  );
}

// ── Single result card ───────────────────────────────────────
function ResultCard({ listing, isApprox }: { listing: Listing; isApprox: boolean }) {
  // Guard: suppressed results must never render
  if (listing.can_show_result === false) return null;
  // Guard: production-blocked results hidden in production (e.g. ToS pending)
  if (process.env.NODE_ENV === "production" && listing.production_allowed === false) return null;

  const badge = deriveBadge(listing.source_badge, listing.source_access_level);
  const showOriginal =
    listing.listing_url &&
    (!listing.allowed_ctas ||
      listing.allowed_ctas.includes("view_original") ||
      listing.allowed_ctas.includes("view_source"));
  const ctaLabel = listing.original_source_required
    ? "Voir sur le site original"
    : "Voir la source";

  return (
    <article className="group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.038] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.32)] transition duration-300 hover:border-[#60A5FA]/26 hover:bg-white/[0.055] sm:p-5">
      {/* Top meta row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#061027]/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#93C5FD] ring-1 ring-white/[0.06]">
          {listing.property_type}
        </span>
        <span className="text-[11px] font-medium text-white/32">
          {listing.neighborhood
            ? `${listing.city}, ${listing.neighborhood}`
            : listing.city}
        </span>
        {isApprox && (
          <span className="ml-auto rounded-full border border-white/[0.08] px-2 py-0.5 text-[9.5px] font-semibold text-white/25">
            Aperçu
          </span>
        )}
      </div>

      {/* Title */}
      <Link href={`/listings/${listing.id}`} className="block">
        <h3 className="line-clamp-2 text-[14.5px] font-extrabold leading-snug text-white transition group-hover:text-[#BFDBFE]">
          {listing.title}
        </h3>
      </Link>

      {/* Price */}
      <div>
        <p className="text-[1.25rem] font-black tracking-[-0.038em] text-white/90">
          {formatPrice(listing.price, listing.currency)}
        </p>
        {listing.price_per_m2 > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-white/30">
            {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
            {listing.surface_m2 > 0 ? ` · ${formatSurface(listing.surface_m2)}` : ""}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {badge && (
          <SourceBadge
            badge={listing.source_badge}
            sourceAccessLevel={listing.source_access_level}
            variant="dark"
          />
        )}
        {listing.reliability_score > 0 && (
          <ReliabilityDot score={listing.reliability_score} />
        )}
      </div>

      {/* Source attribution */}
      <SourceAttribution
        sourceAttributionLabel={listing.source_attribution_label}
        displayPolicyReason={listing.display_policy_reason}
        sourceName={listing.source_name}
        variant="dark"
      />

      {/* CTAs */}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Link
          href={`/listings/${listing.id}`}
          className="flex items-center gap-1.5 rounded-xl bg-white/[0.07] px-3.5 py-2 text-[12px] font-extrabold text-white/80 transition hover:bg-white/[0.12] hover:text-white"
        >
          Voir fiche
          <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />
        </Link>
        {showOriginal && (
          <a
            href={listing.listing_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3.5 py-2 text-[12px] font-bold text-white/45 transition hover:border-white/18 hover:text-white/70"
          >
            {ctaLabel}
            <ExternalLink size={11} strokeWidth={2.2} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

// ── Section ──────────────────────────────────────────────────
export function HomeResultPreview() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isFromApi, setIsFromApi] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings?limit=6")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.listings?.length > 0) {
          setListings(data.listings.slice(0, 6));
          setIsFromApi(true);
        } else {
          setListings(
            geoEnrichedMockListings
              .filter((l) => l.id !== "casablanca-v95-mubawab-fixture")
              .slice(0, 6)
          );
        }
      })
      .catch(() => {
        setListings(
          geoEnrichedMockListings
            .filter((l) => l.id !== "casablanca-v95-mubawab-fixture")
            .slice(0, 6)
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="resultats" className="bg-[#050d1b] py-14 sm:py-20">
      <Container>
        {/* Section header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#93C5FD]">
              {isFromApi ? "Index AkarFinder" : "Aperçu de résultats"}
            </p>
            <h2 className="mt-2 text-[1.65rem] font-extrabold tracking-[-0.03em] text-white sm:text-[2.1rem]">
              Résultats observés récemment
            </h2>
            <p className="mt-2 max-w-[580px] text-[13px] leading-relaxed text-white/40">
              Un aperçu limité des biens indexés, avec source et niveau de
              fiabilité visibles.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#60A5FA]/28 bg-[#0B63CE]/14 px-5 py-3 text-[13px] font-extrabold text-[#BFDBFE] transition hover:border-[#60A5FA]/45 hover:bg-[#0B63CE]/22 sm:self-auto"
          >
            Explorer tous les résultats
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ResultCard key={listing.id} listing={listing} isApprox={!isFromApi} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-[13px] text-white/28">
            Aucun résultat disponible pour le moment.
          </p>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-[#60A5FA]/28 bg-[#0B63CE]/14 px-6 py-3 text-[14px] font-extrabold text-[#BFDBFE]"
          >
            Explorer tous les résultats
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
