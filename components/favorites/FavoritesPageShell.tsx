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
import type { Listing } from "@/lib/listings/types";

type ApiSearchResponse = { listings: Listing[] };

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function EmptyState() {
  return (
    <section className={ui.emptyState}>
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50">
        <Heart size={24} strokeWidth={2} className="text-primary" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A]">
        Aucun favori sauvegardé
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
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
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(24,56,96,0.07)] transition-shadow hover:shadow-[0_12px_34px_rgba(24,56,96,0.11)]">
      <Link href={`/listings/${listing.id}`} className="relative block h-[200px] overflow-hidden sm:h-[210px]">
        {imageMode !== "fallback_visual" && listing.main_image_url ? (
          <Image
            src={listing.main_image_url}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 380px"
          />
        ) : (
          <ListingVisual listing={listing} className="h-full w-full" />
        )}
        <div className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#0B2545] shadow-sm backdrop-blur">
          {listing.property_type}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[1.45rem] font-extrabold leading-none tracking-[-0.04em] text-[#0B1F3A]">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>

        {listing.price_per_m2 != null ? (
          <p className="mt-1 text-[12px] font-bold text-primary">
            {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
          </p>
        ) : null}

        <Link href={`/listings/${listing.id}`} className="mt-2 block">
          <h2 className="line-clamp-2 text-[0.97rem] font-extrabold leading-snug text-slate-950">
            {listing.title}
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
          </p>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold text-slate-600">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          <span className="text-slate-300">·</span>
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

        <div className="mt-4 flex flex-col gap-2">
          <Link href={`/listings/${listing.id}`} className={`${ui.primaryActionPill} gap-2`}>
            Voir le bien
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/compare?add=${listing.id}`} className={`${ui.secondaryActionPill} gap-1.5 px-3 text-[12px]`}>
              <Scale size={13} strokeWidth={2.4} aria-hidden="true" />
              Comparer
            </Link>
            <Link href={`/listings/${listing.id}#visite`} className={`${ui.secondaryActionPill} px-3 text-[12px]`}>
              Visite
            </Link>
          </div>
          <button
            type="button"
            onClick={() => onRemove(listing.id)}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-[#0B2545]"
          >
            <Trash2 size={13} strokeWidth={2.3} aria-hidden="true" />
            Retirer
          </button>
        </div>
      </div>
    </article>
  );
}

export function FavoritesPageShell() {
  const { ids } = useFavoriteSelection();
  const [availableListings, setAvailableListings] = useState<Listing[]>(mockListings);
  const [isLoading, setIsLoading] = useState(true);

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
        // keep mock fallback
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
    <section className="pb-24 pt-5 sm:pt-7 lg:pt-8">
      <div className={`${ui.surfacePremium} px-5 py-6 sm:px-7 sm:py-7`}>
        <p className={ui.eyebrow}>Favoris</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.9rem] font-extrabold tracking-[-0.05em] text-[#0B1F3A] sm:text-[2.35rem]">
              Ma shortlist
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-500">
              Retrouvez les biens que vous avez sauvegardés, comparez-les et revenez rapidement à leur fiche.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/compare" className={`${ui.secondaryActionPill} gap-2`} data-favorites-compare-entry>
              <Scale size={15} strokeWidth={2.4} aria-hidden="true" />
              Ouvrir le comparateur
            </Link>
            {favoriteListings.length > 0 ? (
              <span className="inline-flex w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-primary">
                {favoriteListings.length} bien{favoriteListings.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {favoriteListings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-slate-500">
                {favoriteListings.length} sauvegardé{favoriteListings.length > 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#0B2545]"
              >
                <Trash2 size={13} strokeWidth={2.3} aria-hidden="true" />
                Tout vider
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoriteListings.map((listing) => (
                <FavoriteCard key={listing.id} listing={listing} onRemove={handleRemove} />
              ))}
            </div>
          </>
        )}
        {isLoading ? (
          <p className="mt-4 text-[12px] font-medium text-slate-400">Chargement des biens…</p>
        ) : null}
      </div>
    </section>
  );
}
