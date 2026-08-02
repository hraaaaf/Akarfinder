import { Bath, BedDouble, Building2, ExternalLink, Heart, MapPin, Maximize2 } from "lucide-react";
import type { Listing } from "@/lib/listings/types";

function formatPrice(value: number | null) {
  return value == null ? "Prix sur demande" : `${new Intl.NumberFormat("fr-FR").format(value)} DH`;
}

function permittedImage(listing: Listing) {
  if (!listing.can_show_thumbnail || listing.image_permission_status !== "allowed") return null;
  if (!["partner_full", "preview_allowed"].includes(listing.source_access_level ?? "")) return null;
  return listing.main_image_url || listing.thumbnail_url || listing.image_url || null;
}

function badge(listing: Listing) {
  const score = listing.data_completeness_score ?? listing.reliability_score ?? 0;
  if (score >= 75) return { label: "Information élevée", style: "bg-emerald-50 text-emerald-700" };
  if (score >= 45) return { label: "Information moyenne", style: "bg-amber-50 text-amber-700" };
  return { label: "Information limitée", style: "bg-slate-100 text-slate-600" };
}

export function ListingCardV2({ listing }: { listing: Listing }) {
  const image = permittedImage(listing);
  const info = badge(listing);
  const bedrooms = listing.bedrooms_count ?? listing.bedrooms;
  const bathrooms = listing.bathrooms_count ?? listing.bathrooms;
  const source = listing.source_name || listing.source_attribution_label || listing.source_type;
  const canOpen = Boolean(listing.listing_url && listing.primary_cta !== "none");

  return (
    <article className="group grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.055)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,.1)] md:grid-cols-[238px_1fr]">
      <div className="relative min-h-[210px] overflow-hidden bg-slate-100">
        {image ? <div className="h-full min-h-[210px] bg-cover bg-center transition duration-500 group-hover:scale-[1.025]" style={{ backgroundImage: `url(${image})` }} /> : <div className="grid h-full min-h-[210px] place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-slate-400"><Building2 size={46} strokeWidth={1.4} /></div>}
        {listing.images_count ? <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-[11px] font-extrabold text-white">{listing.images_count} photos</span> : null}
        <button type="button" aria-label="Ajouter aux favoris" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-600 shadow"><Heart size={18} /></button>
      </div>

      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[24px] font-black tracking-[-.045em] text-slate-950">{formatPrice(listing.price)}</p>
            <h2 className="mt-1 line-clamp-2 text-[16px] font-extrabold leading-6 text-slate-850">{listing.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-slate-500"><MapPin size={14} />{[listing.neighborhood, listing.city].filter(Boolean).join(", ")}</p>
          </div>
          <span className={`max-w-[128px] shrink-0 rounded-xl px-3 py-2 text-center text-[10px] font-extrabold leading-4 ${info.style}`}>{info.label}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5 text-[13px] font-bold text-slate-600">
          {bedrooms ? <span className="flex items-center gap-1.5"><BedDouble size={17} />{bedrooms} ch.</span> : null}
          {bathrooms ? <span className="flex items-center gap-1.5"><Bath size={17} />{bathrooms} sdb.</span> : null}
          {listing.surface_m2 ? <span className="flex items-center gap-1.5"><Maximize2 size={16} />{listing.surface_m2} m²</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">{listing.property_type}</span>
          {listing.condition ? <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">{listing.condition}</span> : null}
          {listing.duplicate_group_id ? <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700">Doublons regroupés</span> : null}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          <p>Source : <strong className="text-slate-650">{source}</strong>{listing.freshness_label ? <><span className="mx-2">·</span>{listing.freshness_label}</> : null}</p>
          {canOpen ? <a href={listing.listing_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] font-extrabold text-blue-700 hover:underline">Voir la source <ExternalLink size={13} /></a> : null}
        </div>
      </div>
    </article>
  );
}
