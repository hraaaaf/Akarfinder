"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Scale, Trash2 } from "lucide-react";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { useFavoriteSelection } from "@/components/favorites/useFavoriteSelection";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
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
    <section className="rounded-[1.6rem] border border-dashed border-[#d8c8a3] bg-white p-10 text-center shadow-[0_8px_24px_rgba(7,27,51,0.04)]">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0f0]">
        <Heart size={24} strokeWidth={2} className="text-red-400" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue">
        Aucun favori sauvegardé
      </h1>
      <p className="mt-2 text-[14px] leading-7 text-gray-500">
        Cliquez sur le cœur d&apos;une annonce pour la sauvegarder ici avant de la comparer ou de contacter.
      </p>
      <Link
        href="/search"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-deepblue px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
      >
        Explorer les biens
      </Link>
    </section>
  );
}

function FavoriteCard({ listing, onRemove }: { listing: Listing; onRemove: (id: string) => void }) {
  const imageMode = getListingImageMode(listing);
  const reliabilityLevel = getReliabilityLevel(listing.reliability_score);

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_8px_28px_rgba(7,27,51,0.07)]">
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
        <div className="absolute left-3 top-3 rounded-full bg-deepblue/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
          {listing.property_type}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] text-deepblue">
            {formatPrice(listing.price, listing.currency)}
          </p>
          <FavoriteToggleButton listingId={listing.id} variant="icon" />
        </div>

        <p className="mt-1 text-[12px] font-bold text-bronze-700">
          {listing.price_per_m2.toLocaleString("fr-FR")} DH/m²
        </p>

        <Link href={`/listings/${listing.id}`} className="mt-2 block">
          <h2 className="line-clamp-2 text-[0.97rem] font-extrabold leading-snug text-gray-950">
            {listing.title}
          </h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city}
          </p>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-bold text-gray-600">
          <span>{formatSurface(listing.surface_m2)}</span>
          {listing.bedrooms > 0 ? <span>{listing.bedrooms} ch.</span> : null}
          <span className="text-gray-400">·</span>
          {listing.reliability_available !== false ? (
            <ReliabilityBadge level={reliabilityLevel} label={
              reliabilityLevel === "high" ? "Informations complètes" :
              reliabilityLevel === "medium" ? "Infos limitées" : "Doublon possible"
            } />
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-deepblue px-4 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-deepblue-700"
          >
            Voir le bien
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/compare?add=${listing.id}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#d8c8a3] bg-[#fffdf8] px-3 py-2.5 text-[12px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]"
            >
              <Scale size={13} strokeWidth={2.4} aria-hidden="true" />
              Comparer
            </Link>
            <Link
              href={`/listings/${listing.id}#visite`}
              className="flex items-center justify-center rounded-xl border border-[#d8c8a3] bg-[#fffdf8] px-3 py-2.5 text-[12px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]"
            >
              Visite
            </Link>
          </div>
          <button
            type="button"
            onClick={() => onRemove(listing.id)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#eadfca] px-3 py-2 text-[12px] font-bold text-gray-500 transition hover:bg-[#f7f3ea] hover:text-deepblue"
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
    return () => { cancelled = true; };
  }, []);

  const favoriteListings = useMemo(() => {
    const byId = new Map(availableListings.map((l) => [l.id, l]));
    return ids
      .map((id) => byId.get(id) ?? mockListings.find((l) => l.id === id))
      .filter((l): l is Listing => Boolean(l));
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
    <section className="pb-16 pt-8 lg:pt-10">
      <div className="rounded-[1.7rem] border border-[#eadfca] bg-deepblue px-6 py-7 text-white shadow-[0_18px_42px_rgba(7,27,51,0.16)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
          P15B — Favoris
        </p>
        <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.05em] sm:text-[2.6rem]">
          Ma shortlist
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-7 text-white/72">
          Sauvegardez les biens qui vous intéressent pour les retrouver, les comparer ou demander une visite.
        </p>
      </div>

      <div className="mt-6">
        {favoriteListings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[14px] font-bold text-gray-600">
                {favoriteListings.length} bien{favoriteListings.length > 1 ? "s" : ""} sauvegardé{favoriteListings.length > 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfca] bg-white px-4 py-2 text-[12px] font-extrabold text-gray-600 transition hover:bg-[#f7f3ea] hover:text-deepblue"
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
          <p className="mt-4 text-[12px] font-medium text-gray-400">
            Chargement des biens…
          </p>
        ) : null}
      </div>
    </section>
  );
}
