import Image from "next/image";
import Link from "next/link";
import { CompareBar } from "@/components/compare/CompareBar";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { DbProviderThumbnail } from "@/components/listings/DbProviderThumbnail";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { VisitRequestPanel } from "@/components/listings/VisitRequestPanel";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import { getListingImageMode, getImageAttribution } from "@/lib/listings/image-policy";
import { canShowContactActions } from "@/lib/listings/listing-boundary";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type {
  PublicDetailFact,
  PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

function transactionLabel(type: Listing["transaction_type"]): string {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Vente";
}

function ProvenanceBadge({ fact }: { fact: PublicDetailFact }) {
  const classes =
    fact.provenance === "calculated"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : fact.provenance === "verified_document"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : fact.provenance === "inferred"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${classes}`}>
      {fact.provenance_label}
    </span>
  );
}

function FactGroup({ title, facts }: { title: string; facts: PublicDetailFact[] }) {
  if (facts.length === 0) return null;
  return (
    <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
      <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">{title}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.key} className="rounded-2xl border border-[#efe3cd] bg-[#fffdf8] p-3.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-gray-500">
              {fact.label}
            </dt>
            <dd className="mt-1.5 text-[15px] font-extrabold text-deepblue">{fact.value}</dd>
            <div className="mt-2">
              <ProvenanceBadge fact={fact} />
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PropertyDetailV2({
  listing,
  detail,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
}) {
  const imageMode = getListingImageMode(listing);
  const attribution = getImageAttribution(listing);
  const showContactActions = canShowContactActions(listing);
  const location = listing.neighborhood ? `${listing.city}, ${listing.neighborhood}` : listing.city;
  const allDetails = [
    ...detail.facts.surfaces,
    ...detail.facts.layout,
    ...detail.facts.building,
    ...detail.facts.features,
  ];

  return (
    <section className="pb-28 pt-5 lg:pb-16 lg:pt-6">
      <Link href="/search" className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-deepblue">
        <span aria-hidden="true">←</span> Retour aux résultats
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[1.6rem] border border-[#eadfca] bg-white shadow-[0_18px_54px_rgba(7,27,51,0.16)]">
            <div className="relative h-[280px] sm:h-[460px]">
              {imageMode === "db_provider_thumbnail" ? (
                <DbProviderThumbnail
                  listing={listing}
                  thumbnailUrl={listing.thumbnail_url!}
                  className="absolute inset-0 h-full w-full"
                  imgClassName="absolute inset-0 h-full w-full object-cover"
                />
              ) : imageMode !== "fallback_visual" ? (
                <Image
                  src={listing.main_image_url!}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 800px"
                  priority
                />
              ) : (
                <ListingVisual listing={listing} className="absolute inset-0 h-full w-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-deepblue shadow">
                  {transactionLabel(listing.transaction_type)}
                </span>
                <span className="rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
                  {listing.property_type}
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[2rem] font-extrabold tracking-[-0.05em] text-white sm:text-[3rem]">
                  {formatPrice(listing.price, listing.currency)}
                </p>
                <p className="mt-2 text-[14px] font-bold text-white/90 sm:text-[17px]">{location}</p>
              </div>
              {imageMode === "fallback_visual" ? (
                <span className="absolute bottom-3 right-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
                  Visuel illustratif
                </span>
              ) : attribution ? (
                <span className="absolute bottom-3 right-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
                  {attribution}
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_8px_28px_rgba(7,27,51,0.06)]">
            <h1 className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.04em] text-deepblue sm:text-[2.3rem]">
              {listing.title}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#fff8eb] p-3 ring-1 ring-[#f0e6d2]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Surface</p>
                <p className="mt-1 text-[15px] font-extrabold text-deepblue">{formatSurface(listing.surface_m2)}</p>
              </div>
              <div className="rounded-2xl bg-[#fff8eb] p-3 ring-1 ring-[#f0e6d2]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Chambres</p>
                <p className="mt-1 text-[15px] font-extrabold text-deepblue">{listing.bedrooms > 0 ? listing.bedrooms : "Non renseigné"}</p>
              </div>
              <div className="rounded-2xl bg-[#fff8eb] p-3 ring-1 ring-[#f0e6d2]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Salles de bain</p>
                <p className="mt-1 text-[15px] font-extrabold text-deepblue">{listing.bathrooms > 0 ? listing.bathrooms : "Non renseigné"}</p>
              </div>
              <div className="rounded-2xl bg-[#fff8eb] p-3 ring-1 ring-[#f0e6d2]">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Prix/m²</p>
                <p className="mt-1 text-[15px] font-extrabold text-deepblue">
                  {listing.price_per_m2 != null ? `${listing.price_per_m2.toLocaleString("fr-FR")} DH` : "Non renseigné"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[#d7e5f5] bg-[#f7fbff] p-5 shadow-[0_8px_28px_rgba(7,27,51,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Analyse structurée</p>
                <h2 className="mt-1 text-[1.35rem] font-extrabold text-deepblue">{detail.conclusion.title}</h2>
              </div>
              {detail.conclusion.akar_score != null ? (
                <div className="rounded-2xl border border-[#b9d6f2] bg-white px-4 py-2 text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">AkarScore</p>
                  <p className="text-[1.35rem] font-extrabold text-deepblue">{detail.conclusion.akar_score}/100</p>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-[14px] leading-7 text-gray-700">{detail.conclusion.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
              {detail.conclusion.akar_score_label ? <span className="rounded-full bg-white px-3 py-1 ring-1 ring-[#d7e5f5]">{detail.conclusion.akar_score_label}</span> : null}
              {detail.conclusion.coverage_label ? <span className="rounded-full bg-white px-3 py-1 ring-1 ring-[#d7e5f5]">{detail.conclusion.coverage_label}</span> : null}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Compatibilité avec votre projet</p>
            <h2 className="mt-1 text-[1.2rem] font-extrabold text-deepblue">{detail.fit.label}</h2>
            <p className="mt-2 text-[13.5px] leading-6 text-gray-600">{detail.fit.explanation}</p>
          </section>

          {detail.market.status === "available" ? (
            <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-700">Position marché</p>
              <h2 className="mt-1 text-[1.2rem] font-extrabold text-deepblue">{detail.market.label}</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-gray-500">Repère indicatif calculé uniquement lorsque le moteur Market Intelligence dispose des données nécessaires.</p>
            </section>
          ) : null}

          {listing.description ? (
            <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
              <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">Description</h2>
              <p className="mt-3 whitespace-pre-line text-[14.5px] leading-7 text-gray-600">{listing.description}</p>
              <p className="mt-3 text-[11px] font-semibold text-gray-400">{detail.provenance.fact_provenance_label}</p>
            </section>
          ) : null}

          <FactGroup title="Informations essentielles" facts={detail.facts.essential} />
          {allDetails.length > 0 ? (
            <section className="space-y-4">
              <FactGroup title="Surfaces" facts={detail.facts.surfaces} />
              <FactGroup title="Agencement" facts={detail.facts.layout} />
              <FactGroup title="Bâtiment & état" facts={detail.facts.building} />
              <FactGroup title="Équipements & caractéristiques" facts={detail.facts.features} />
            </section>
          ) : (
            <section className="rounded-[1.4rem] border border-dashed border-[#d8c8a3] bg-white p-5">
              <h2 className="text-[1.15rem] font-extrabold text-deepblue">Informations détaillées</h2>
              <p className="mt-2 text-[13.5px] text-gray-500">Non renseigné.</p>
            </section>
          )}

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <h2 className="text-[1.15rem] font-extrabold text-deepblue">Environnement</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f7f3ea] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Ville</p>
                <p className="mt-1 font-extrabold text-deepblue">{detail.environment.city ?? "Non renseigné"}</p>
              </div>
              <div className="rounded-xl bg-[#f7f3ea] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Quartier</p>
                <p className="mt-1 font-extrabold text-deepblue">{detail.environment.district ?? "Non renseigné"}</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-gray-500">Aucune proximité ou durée de trajet n’est inventée lorsqu’aucune donnée géographique mesurée n’est disponible.</p>
          </section>

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <h2 className="text-[1.15rem] font-extrabold text-deepblue">Coûts & investissement</h2>
            <p className="mt-2 text-[13.5px] text-gray-500">{detail.costs.label}.</p>
          </section>

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <h2 className="text-[1.15rem] font-extrabold text-deepblue">Historique réel</h2>
            {detail.history.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {detail.history.map((item) => (
                  <li key={`${item.label}-${item.value}`} className="rounded-xl bg-[#f7f3ea] p-3">
                    <p className="text-[11px] font-bold text-gray-500">{item.label}</p>
                    <p className="mt-1 text-[14px] font-extrabold text-deepblue">{item.value}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[13.5px] text-gray-500">Aucun historique vérifiable disponible.</p>
            )}
          </section>

          {detail.multisource.status === "supported" ? (
            <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
              <h2 className="text-[1.15rem] font-extrabold text-deepblue">Multi-source</h2>
              <p className="mt-2 text-[13.5px] text-gray-600">{detail.multisource.label}</p>
            </section>
          ) : null}

          {detail.conclusion.attention_label ? (
            <section className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-[1.15rem] font-extrabold text-amber-900">Points à examiner</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-amber-900/80">{detail.conclusion.attention_label}</p>
            </section>
          ) : null}

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <h2 className="text-[1.15rem] font-extrabold text-deepblue">Provenance des informations</h2>
            <dl className="mt-3 space-y-2 text-[13px] text-gray-600">
              <div className="flex justify-between gap-4"><dt>Source</dt><dd className="font-bold text-deepblue">{detail.provenance.source_name}</dd></div>
              <div className="flex justify-between gap-4"><dt>Statut des données source</dt><dd className="text-right font-bold text-deepblue">{detail.provenance.fact_provenance_label}</dd></div>
              <div className="flex justify-between gap-4"><dt>Vérification documentaire</dt><dd className="text-right font-bold text-deepblue">{detail.provenance.verified_document_label}</dd></div>
            </dl>
            {detail.provenance.source_url ? (
              <a href={detail.provenance.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-[13px] font-extrabold text-[#0B63CE] underline underline-offset-4">
                Voir la source d’origine →
              </a>
            ) : null}
          </section>

          <p className="px-1 text-[11.5px] leading-5 text-gray-500">{detail.disclaimer}</p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_14px_38px_rgba(7,27,51,0.12)]">
            <div className="bg-[#0B63CE] px-5 py-4 text-white dark:bg-deepblue">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">Actions</p>
              <p className="mt-1 text-[1.55rem] font-extrabold">{formatPrice(listing.price, listing.currency)}</p>
              <p className="mt-1 text-[13px] font-semibold text-white/75">{location}</p>
            </div>
            <div className="space-y-2.5 p-5">
              {showContactActions && listing.whatsapp ? <WhatsAppCTA phone={listing.whatsapp} label="Contacter via WhatsApp" size="md" variant="primary" /> : null}
              {showContactActions ? <VisitRequestPanel listing={listing} /> : null}
              <CompareToggleButton listingId={listing.id} variant="block" />
              <FavoriteToggleButton listingId={listing.id} variant="block" />
              {listing.listing_url ? (
                <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13px] font-extrabold text-deepblue">
                  Voir la source d’origine
                </a>
              ) : null}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.04)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-500">Professionnel / source</p>
            <p className="mt-1 text-[1.15rem] font-extrabold text-deepblue">{detail.professional.seller_name ?? detail.professional.source_name}</p>
            <p className="mt-2 text-[12px] leading-5 text-gray-500">Le profil professionnel complet, l’ownership et les statuts de validation seront gérés par la couche #19B.</p>
          </section>
        </aside>
      </div>

      <CompareBar mobileOffsetClassName="bottom-4" />
    </section>
  );
}
