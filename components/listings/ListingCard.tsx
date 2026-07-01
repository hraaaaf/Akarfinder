import Link from "next/link";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { MarketPriceScoreBadge } from "@/components/badges/MarketPriceScoreBadge";
import type { Listing } from "@/lib/listings/types";

function reliabilityTone(score: number) {
  if (score >= 80) {
    return "bg-[#e2f6ec] text-[#16724b]";
  }

  if (score >= 50) {
    return "bg-[#fff3d9] text-[#9a6412]";
  }

  return "bg-[#ffe7e2] text-[#a13d28]";
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-navy/10 bg-white shadow-[0_18px_60px_rgba(9,28,58,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(9,28,58,0.12)]">
      <div
        className="relative h-52 bg-cover bg-center"
        style={{ backgroundImage: `url(${listing.image_url})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/44 via-black/8 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-bold text-navy">
          {listing.city}
        </span>
        {listing.is_mre_friendly ? (
          <span className="absolute right-4 top-4 rounded-full bg-[#06172f]/84 px-3 py-1.5 text-[12px] font-bold text-white">
            MRE
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#145ee8]">
              {listing.source_type}
            </p>
            <h3 className="mt-2 text-[1.1rem] font-bold leading-6 text-navy">
              {listing.title}
            </h3>
            <p className="mt-1 text-[14px] text-stone">
              {listing.city}, {listing.neighborhood}
            </p>
          </div>
          <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-[12px] font-semibold text-navy/68">
            {listing.freshness_label}
          </span>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold tracking-[-0.03em] text-navy">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <p className="mt-1 text-[13px] text-stone">
              {listing.price_per_m2.toLocaleString("fr-FR")} DH/m2
            </p>
          </div>
          <div className="text-right text-[13px] text-navy/72">
            <p>{formatSurface(listing.surface_m2)}</p>
            <p>
              {listing.bedrooms} ch. · {listing.bathrooms} sdb
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${reliabilityTone(
              listing.reliability_score
            )}`}
          >
            {listing.reliability_badge ?? listing.reliability_label}
          </span>
          <MarketPriceScoreBadge listing={listing} variant="light" />
          <span className="rounded-full bg-[#f4f6fa] px-3 py-1.5 text-[12px] font-semibold text-navy/70">
            Score {listing.reliability_score}/100
          </span>
          <span className="rounded-full bg-[#f4f6fa] px-3 py-1.5 text-[12px] font-semibold text-navy/70">
            {listing.property_type}
          </span>
          {listing.data_completeness_score != null && (
            <span className="rounded-full bg-[#f4f6fa] px-3 py-1.5 text-[12px] font-semibold text-navy/70">
              Données complètes
            </span>
          )}
        </div>

        <p className="mt-4 text-[14px] leading-7 text-stone">
          {listing.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <Link
            href={`/listings/${listing.id}`}
            className="rounded-xl bg-[#145ee8] px-4 py-3 text-[14px] font-bold text-white shadow-[0_14px_28px_rgba(20,94,232,0.24)] transition hover:bg-[#0f4fc5]"
          >
            Voir le detail
          </Link>
          <span className="text-[13px] font-semibold text-navy/60">
            {listing.transaction_type === "new"
              ? "Programme neuf"
              : listing.transaction_type === "rent"
                ? "Location"
                : "Achat"}
          </span>
        </div>
      </div>
    </article>
  );
}
