import Link from "next/link";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { ui } from "@/components/ui/design-system";
import type { Listing } from "@/lib/listings/types";
import { formatPrice } from "@/lib/listings/utils";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

function decisionTone(detail: PublicPropertyDetailV2) {
  if (detail.conclusion.attention_label) {
    return { label: "À examiner", className: ui.status.attention };
  }

  if (detail.market.status === "available") {
    return { label: "Repères disponibles", className: ui.status.positive };
  }

  return { label: "Dossier structuré", className: ui.status.informative };
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
      className={`mt-4 overflow-hidden ${ui.surface}`}
    >
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10.5px] font-extrabold ${tone.className}`}>
              {tone.label}
            </span>
            <span className={`rounded-full border px-3 py-1 text-[10.5px] font-bold ${ui.status.neutral}`}>
              {detail.provenance.fact_provenance_label}
            </span>
          </div>

          <p className={`mt-4 ${ui.eyebrow}`}>Votre prochaine décision</p>
          <h1
            id="property-decision-title"
            className="mt-1 text-[1.6rem] font-extrabold leading-tight tracking-[-0.04em] text-foreground sm:text-[2rem]"
          >
            {detail.fit.label}
          </h1>
          <p className={`mt-2 max-w-3xl text-[13.5px] leading-6 ${ui.body}`}>
            {detail.fit.explanation}
          </p>

          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["Prix", formatPrice(listing.price, listing.currency)],
              ["Localisation", location],
              ["Lecture AkarFinder", detail.conclusion.title],
            ].map(([label, value]) => (
              <div key={label} className={`${ui.surfaceMuted} p-3`}>
                <dt className={ui.label}>{label}</dt>
                <dd className="mt-1 truncate text-[14px] font-extrabold text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={`${ui.surfaceElevated} p-4`}>
          <p className={ui.label}>Organiser ce bien</p>
          <p className={`mt-1 text-[13px] leading-5 ${ui.body}`}>
            Gardez-le, comparez-le ou rattachez votre recherche à un projet structuré.
          </p>
          <div className="mt-4 space-y-2.5">
            <FavoriteToggleButton listingId={listing.id} variant="block" />
            <CompareToggleButton listingId={listing.id} variant="block" />
            <Link href="/mon-projet" className={`w-full text-[13px] ${ui.primaryAction}`}>
              Continuer dans Mon Projet
            </Link>
          </div>
          <p className={`mt-3 text-[10.5px] leading-4 ${ui.body}`}>
            AkarFinder organise les informations disponibles ; il ne certifie ni le bien ni la transaction.
          </p>
        </div>
      </div>
    </section>
  );
}
