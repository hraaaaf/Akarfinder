"use client";

import { useEffect } from "react";
import {
  Bath,
  BedDouble,
  ExternalLink,
  MapPin,
  Maximize2,
  ShieldCheck,
} from "lucide-react";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import type { Listing } from "@/lib/listings/types";

function formatPrice(value: number | null) {
  return value == null ? "Prix sur demande" : `${new Intl.NumberFormat("fr-FR").format(value)} DH`;
}

function permittedImage(listing: Listing) {
  if (!listing.can_show_thumbnail || listing.image_permission_status !== "allowed") return null;
  if (!["partner_full", "preview_allowed"].includes(listing.source_access_level ?? "")) return null;
  return listing.main_image_url || listing.thumbnail_url || listing.image_url || null;
}

function informationLabel(listing: Listing) {
  return (
    listing.reliability_info?.label ||
    listing.reliability_label ||
    listing.source_attribution_label ||
    null
  );
}

export function ListingCardV2({ listing, position }: { listing: Listing; position?: number }) {
  const { registerListing, hoverListing, clearHover, isActive } = usePropertySelection();

  useEffect(() => registerListing(listing), [listing, registerListing]);

  const image = permittedImage(listing);
  const info = informationLabel(listing);
  const bedrooms = listing.bedrooms_count ?? listing.bedrooms;
  const bathrooms = listing.bathrooms_count ?? listing.bathrooms;
  const source = listing.source_name || listing.source_attribution_label || listing.source_type;
  const canOpen = Boolean(listing.listing_url && listing.primary_cta !== "none");
  const sourceRequired =
    listing.original_source_required ||
    listing.primary_cta === "view_original" ||
    listing.primary_cta === "view_source";
  const active = isActive(listing);
  const location = [listing.neighborhood, listing.city].filter(Boolean).join(", ");

  return (
    <article
      onMouseEnter={() => hoverListing(listing, "list")}
      onMouseLeave={clearHover}
      className={`group grid overflow-hidden rounded-[22px] border bg-white shadow-[0_10px_32px_rgba(15,23,42,.055)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,.11)] md:grid-cols-[260px_1fr] ${
        active ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="relative min-h-[218px] overflow-hidden bg-white">
        {image ? (
          <div
            className="h-full min-h-[218px] bg-cover bg-center transition duration-500 group-hover:scale-[1.025]"
            style={{ backgroundImage: `url(${image})` }}
            role="img"
            aria-label={listing.title}
          />
        ) : (
          <div className="h-full min-h-[218px] overflow-hidden bg-[#F7FAFF]">
            <PropertyTypeArtwork
              kind={listing.property_type}
              className="h-full min-h-[218px] w-full transition duration-500 group-hover:scale-[1.025]"
            />
            <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-white backdrop-blur">
              Visuel illustratif
            </span>
          </div>
        )}

        {position ? (
          <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-slate-700 shadow-sm backdrop-blur">
            Résultat {position}
          </span>
        ) : null}

        {listing.can_show_gallery && listing.images_count ? (
          <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/78 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur">
            {listing.images_count} photos
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[26px] font-black tracking-[-.045em] text-slate-950">
              {formatPrice(listing.price)}
            </p>
            <h2 className="mt-1 line-clamp-2 text-[17px] font-extrabold leading-6 text-slate-800">
              {listing.title}
            </h2>
            {location ? (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                <MapPin size={14} className="shrink-0 text-blue-600" />
                <span className="truncate">{location}</span>
              </p>
            ) : null}
          </div>
          {info ? (
            <span className="inline-flex max-w-[160px] shrink-0 items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-[10px] font-extrabold leading-4 text-emerald-800">
              <ShieldCheck size={13} className="shrink-0" />
              {info}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-3.5 py-3 text-[13px] font-bold text-slate-600">
          {bedrooms ? (
            <span className="flex items-center gap-1.5">
              <BedDouble size={17} className="text-slate-500" />
              {bedrooms} ch.
            </span>
          ) : null}
          {bathrooms ? (
            <span className="flex items-center gap-1.5">
              <Bath size={17} className="text-slate-500" />
              {bathrooms} sdb.
            </span>
          ) : null}
          {listing.surface_m2 ? (
            <span className="flex items-center gap-1.5">
              <Maximize2 size={16} className="text-slate-500" />
              {listing.surface_m2} m²
            </span>
          ) : null}
          {!bedrooms && !bathrooms && !listing.surface_m2 ? (
            <span className="text-xs text-slate-500">Caractéristiques détaillées sur la source</span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
            {listing.property_type}
          </span>
          {listing.condition ? (
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
              {listing.condition}
            </span>
          ) : null}
          {listing.duplicate_group_id ? (
            <span className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700">
              Représentations regroupées
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          <p className="min-w-0">
            Source : <strong className="text-slate-700">{source}</strong>
            {listing.freshness_label ? (
              <>
                <span className="mx-2">·</span>
                {listing.freshness_label}
              </>
            ) : null}
          </p>
          {canOpen ? (
            <a
              href={listing.listing_url}
              target={sourceRequired ? "_blank" : undefined}
              rel={sourceRequired ? "noreferrer" : undefined}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-blue-700 px-4 text-[12px] font-extrabold text-white shadow-sm transition hover:bg-blue-800"
            >
              {sourceRequired ? "Voir la source" : "Voir le bien"}
              {sourceRequired ? <ExternalLink size={13} /> : null}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
