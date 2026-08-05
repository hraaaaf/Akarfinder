import Link from "next/link";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import type { Listing } from "@/lib/listings/types";
import { formatPrice } from "@/lib/listings/utils";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

function decisionTone(detail: PublicPropertyDetailV2) {
  if (detail.conclusion.attention_label) {
    return {
      label: "À examiner",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (detail.market.status === "available") {
    return {
      label: "Repères disponibles",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    label: "Dossier structuré",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  };
}

export function PropertyDecisionHeader({
  listing,
  detail,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
}) {
  const tone = decisionTone(detail);
  const location = listing.neighborhood
    ? `${listing.city}, ${listing.neighborhood}`
    : listing.city;

  return (
    <section
      aria-labelledby="property-decision-title"
      className="mt-4 overflow-hidden rounded-[1.6rem] border border-[#d7e5f5] bg-white shadow-[0_16px_44px_rgba(7,27,51,0.1)]"
    >
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10.5px] font-extrabold ${tone.className}`}>
              {tone.label}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10.5px] font-bold text-slate-600">
              {detail.provenance.fact_provenance_label}
            </span>
          </div>

          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0B63CE]">
            Votre prochaine décision
          </p>
          <h1
            id="property-decision-title"
            className="mt-1 text-[1.6rem] font-extrabold leading-tight tracking-[-0.04em] text-deepblue sm:text-[2rem]"
          >
            {detail.fit.label}
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-gray-600">
            {detail.fit.explanation}
          </p>

          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7fbff] p-3 ring-1 ring-[#d7e5f5]">
              <dt className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">Prix</dt>
              <dd className="mt-1 text-[15px] font-extrabold text-deepblue">
                {formatPrice(listing.price, listing.currency)}
              </dd>
            </div>
            <div className="rounded-2xl bg-[#f7fbff] p-3 ring-1 ring-[#d7e5f5]">
              <dt className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">Localisation</dt>
              <dd className="mt-1 truncate text-[14px] font-extrabold text-deepblue">{location}</dd>
            </div>
            <div className="rounded-2xl bg-[#f7fbff] p-3 ring-1 ring-[#d7e5f5]">
              <dt className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-500">Lecture AkarFinder</dt>
              <dd className="mt-1 text-[14px] font-extrabold text-deepblue">{detail.conclusion.title}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[1.3rem] border border-[#e4ecf5] bg-[#f8fbff] p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">
            Organiser ce bien
          </p>
          <p className="mt-1 text-[13px] leading-5 text-gray-600">
            Gardez-le, comparez-le ou rattachez votre recherche à un projet structuré.
          </p>
          <div className="mt-4 space-y-2.5">
            <FavoriteToggleButton listingId={listing.id} variant="block" />
            <CompareToggleButton listingId={listing.id} variant="block" />
            <Link
              href="/mon-projet"
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0B63CE] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.22)] transition hover:bg-[#084BA8]"
            >
              Continuer dans Mon Projet
            </Link>
          </div>
          <p className="mt-3 text-[10.5px] leading-4 text-gray-500">
            AkarFinder organise les informations disponibles ; il ne certifie ni le bien ni la transaction.
          </p>
        </div>
      </div>
    </section>
  );
}
