"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Scale, Trash2 } from "lucide-react";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import { ui } from "@/components/ui/design-system";
import {
  clearFavoriteIds,
  dispatchFavoritesUpdated,
  removeFavoriteId,
} from "@/lib/favorites/favorites-storage";
import { mockListings } from "@/lib/listings/mock-listings";
import { getListingImageMode } from "@/lib/listings/image-policy";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing, ListingTransactionType } from "@/lib/listings/types";

type ApiSearchResponse = { listings: Listing[] };
type FavoriteFilter = "all" | ListingTransactionType;

const FILTERS: Array<{ value: FavoriteFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "buy", label: "À vendre" },
  { value: "rent", label: "À louer" },
  { value: "new", label: "Neuf" },
];

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function EmptyState() {
  return (
    <section className={`${ui.emptyState} py-10 sm:py-12`} data-favorites-empty>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50">
        <Heart size={22} strokeWidth={2} className="text-primary" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.35rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[1.5rem]">
        Aucun favori sauvegardé
      </h1>
      <p className="mx-auto mt-2 max-w-lg text-[13px] leading-6 text-slate-500 sm:text-[14px]">
        Cliquez sur le cœur d&apos;une annonce pour la sauvegarder ici avant de la comparer ou de demander une visite.
      </p>
      <Link href="/search" className={`mt-5 ${ui.primaryActionPill}`}>
        Explorer les biens
      </Link>
    </section>
  );
}

function FavoriteCard({ listing, onRemove }: { listing: Listing; onRemove: (id: string) => void }) {
  const imageMode = getListingImageMode(listing);
  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_6px_22px_rgba(24,56,96,0.06)] transition-shadow hover:shadow-[0_10px_28px_rgba(24,56,96,0.1)]"
      data-favorite-card
      data-transaction-type={listing.transaction_type}
    >
      <Link href={`/listings/${listing.id}`} className="relative block h-[132px] overflow-hidden sm:h-[180px] lg:h-[190px]">
        {imageMode !== "fallback_visual" && listing.main_image_url ? (
          <Image
            src={listing.main_image_url}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <ListingVisual listing={listing} className="h-full w-full" />
        )}
        <div className="absolute left-2.5 top-2.5 rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.07em] text-[#0B2545] shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:text-[10px]">
          {listing.property_type}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-white/95 shadow-sm sm:right-3 sm:top-3">
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[1rem] font-extrabold leading-none tracking-[-0.035em] text-[#0B1F3A] sm:text-[1.3rem]">
          {formatPrice(listing.price, listing.currency)}
        </p>

        <Link href={`/listings/${listing.id}`} className="mt-2 block min-w-0">
          <h2 className="line-clamp-2 text-[12.5px] font-extrabold leading-[1.35] text-slate-950 sm:text-[0.95rem]">
            {listing.title}
          </h2>
          <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-[12.5px]">
            {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
          </p>
        </Link>

        <div className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden text-[10.5px] font-bold text-slate-600 sm:text-[12px]">
          <span className="shrink-0">{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span className="shrink-0">{listing.bedrooms} ch.</span> : null}
        </div>

        <div className="mt-2 hidden sm:block">
          {listing.reliability_available !== false ? (
            <ReliabilityBadge
              level={reliabilityLevel}
              label={
                reliabilityLevel === "high"
                  ? "Informations complètes"
                  : reliabilityLevel === "medium"
                    ? "Infos limitées"
                    : "Doublon possible"
              }
            />
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-primary/90 sm:min-h-10 sm:text-[12px]"
          >
            Voir le bien
            <ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href={`/compare?add=${listing.id}`}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-50 sm:text-[11px]"
            >
              <Scale size={11} strokeWidth={2.4} aria-hidden="true" />
              Comparer
            </Link>
            <button
              type="button"
              onClick={() => onRemove(listing.id)}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-[#0B2545] sm:text-[11px]"
            >
              <Trash2 size={11} strokeWidth={2.3} aria-hidden="true" />
              Retirer
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FavoritesPageShell() {
  const { ids } = useFavoriteSelection();
  const [availableListings, setAvailableListings] = useState<Listing[]>(mockListings);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FavoriteFilter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/search?limit=200", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ApiSearchResponse;
        if (!cancelled && Array.isArray(data.listings) && data.listings.length > 0) {
          setAvailableListings(data.listings);
        }
      } catch {
        // Keep the existing local fallback so saved mock IDs still resolve in development.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteListings = useMemo(() => {
    const byId = new Map(availableListings.map((listing) => [listing.id, listing]));
    return ids
      .map((id) => byId.get(id) ?? mockListings.find((listing) => listing.id === id))
      .filter((listing): listing is Listing => Boolean(listing));
  }, [availableListings, ids]);

  const filteredListings = useMemo(
    () => (filter === "all" ? favoriteListings : favoriteListings.filter((listing) => listing.transaction_type === filter)),
    [favoriteListings, filter],
  );

  const filterCounts = useMemo(() => {
    return favoriteListings.reduce<Record<FavoriteFilter, number>>(
      (counts, listing) => {
        counts[listing.transaction_type] += 1;
        return counts;
      },
      { all: favoriteListings.length, buy: 0, rent: 0, new: 0 },
    );
  }, [favoriteListings]);

  function handleRemove(id: string) {
    if (typeof window === "undefined") return;
    const next = removeFavoriteId(id, window.localStorage);
    dispatchFavoritesUpdated(next);
  }

  function handleClear() {
    if (typeof window === "undefined") return;
    const next = clearFavoriteIds(window.localStorage);
    dispatchFavoritesUpdated(next);
  }

  return (
    <section className="pb-24 pt-4 sm:pt-6 lg:pt-7" data-favorites-shell>
      <div className={`${ui.surfacePremium} px-4 py-4 sm:px-6 sm:py-5`} data-favorites-header>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={ui.eyebrow}>Favoris</p>
            <h1 className="mt-1 text-[1.7rem] font-extrabold tracking-[-0.05em] text-[#0B1F3A] sm:text-[2rem]">
              Ma shortlist
            </h1>
          </div>
          <Link href="/compare" className={`${ui.secondaryActionPill} shrink-0 gap-1.5 px-3 text-[11px] sm:px-4 sm:text-[12px]`} data-favorites-compare-entry>
            <Scale size={14} strokeWidth={2.4} aria-hidden="true" />
            Comparer
          </Link>
        </div>

        <p className="mt-2 max-w-2xl text-[12.5px] leading-5 text-slate-500 sm:text-[13.5px]">
          Vos biens sauvegardés, prêts à comparer sans refaire la recherche.
        </p>

        {favoriteListings.length > 0 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrer les favoris" data-favorites-filters>
            {FILTERS.map((item) => {
              const selected = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(item.value)}
                  className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition sm:min-h-10 sm:text-[12px] ${
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-primary"
                  }`}
                >
                  {item.label}
                  <span className={`ml-1.5 ${selected ? "text-white/80" : "text-slate-400"}`}>{filterCounts[item.value]}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {favoriteListings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold text-slate-500">
                {filteredListings.length} affiché{filteredListings.length > 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2545]"
              >
                <Trash2 size={12} strokeWidth={2.3} aria-hidden="true" />
                Tout vider
              </button>
            </div>

            {filteredListings.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" data-favorites-grid>
                {filteredListings.map((listing) => (
                  <FavoriteCard key={listing.id} listing={listing} onRemove={handleRemove} />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-5 py-8 text-center" data-favorites-filter-empty>
                <p className="text-[13px] font-bold text-slate-600">Aucun favori dans cette catégorie.</p>
              </div>
            )}
          </>
        )}

        {isLoading ? (
          <p className="mt-4 text-[12px] font-medium text-slate-400" aria-live="polite">
            Chargement des biens…
          </p>
        ) : null}
      </div>
    </section>
  );
}
