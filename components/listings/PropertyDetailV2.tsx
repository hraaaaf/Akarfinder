import type { ReactNode } from "react";
import Link from "next/link";
import { CompareBar } from "@/components/compare/CompareBar";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { AkarInsightCard } from "@/components/listings/AkarInsightCard";
import { ExpandablePropertyDescription } from "@/components/listings/ExpandablePropertyDescription";
import { FinanceMarocSection } from "@/components/listings/FinanceMarocSection";
import { LivingHereSection } from "@/components/listings/LivingHereSection";
import { MarketComparablesSection } from "@/components/listings/MarketComparablesSection";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { PropertyCore } from "@/components/listings/PropertyCore";
import { PropertyMediaGallery } from "@/components/listings/PropertyMediaGallery";
import { StreetRealitySection } from "@/components/listings/StreetRealitySection";
import { ProfessionalConversionCard } from "@/components/listings/ProfessionalConversionCard";
import { ProjectPersonalizationCard } from "@/components/listings/ProjectPersonalizationCard";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { StreetRealityModel } from "@/lib/geo/street-reality";
import type { ProConversionModel } from "@/lib/listings/pro-conversion";
import type { Listing } from "@/lib/listings/types";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import type {
  PublicDetailFact,
  PublicPropertyDetailV2,
} from "@/lib/property-detail/public-property-detail-v2";

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
    <span
      data-detail-provenance={fact.provenance}
      className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${classes}`}
    >
      {fact.provenance_label}
    </span>
  );
}

function FactGroup({ title, facts }: { title: string; facts: PublicDetailFact[] }) {
  if (facts.length === 0) return null;
  return (
    <section data-property-characteristics-group className="border-b border-slate-200 py-6">
      <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">{title}</h2>
      <dl className="mt-2 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.key}
            data-detail-fact={fact.key}
            className="min-w-0 border-t border-slate-200 py-3.5"
          >
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-slate-500">
              {fact.label}
            </dt>
            <dd className="mt-1.5 break-words text-[15px] font-extrabold text-deepblue">{fact.value}</dd>
            <div className="mt-2">
              <ProvenanceBadge fact={fact} />
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LeanSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 py-6">
      <h2 className="text-[1.15rem] font-extrabold tracking-[-0.03em] text-deepblue">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PropertyDetailV2({
  listing,
  detail,
  livingHere = null,
  streetReality = null,
  marketComparables = null,
  proConversion,
  projectId = null,
  mapStyleUrl = null,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
  livingHere?: LivingHereModel | null;
  streetReality?: StreetRealityModel | null;
  marketComparables?: MarketComparableSet | null;
  proConversion: ProConversionModel;
  projectId?: string | null;
  mapStyleUrl?: string | null;
}) {
  const allDetails = [
    ...detail.facts.surfaces,
    ...detail.facts.layout,
    ...detail.facts.building,
    ...detail.facts.features,
  ];

  return (
    <section className="pb-28 pt-5 lg:pb-16 lg:pt-6">
      <Link href="/search" className="inline-flex min-h-11 items-center gap-2 text-[13.5px] font-extrabold text-deepblue">
        <span aria-hidden="true">←</span> Retour aux résultats
      </Link>

      <div className="mt-3 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0">
          <PropertyMediaGallery listing={listing} />

          <div className="mt-5">
            <PropertyCore listing={listing} />
          </div>

          <div className="mt-6">
            <AkarInsightCard detail={detail} />
          </div>

          <div className="lg:hidden">
            <ProjectPersonalizationCard listing={listing} projectId={projectId} />
          </div>

          <div className="mt-4 lg:hidden">
            <ProfessionalConversionCard
              listing={listing}
              model={proConversion}
              mobileIdentityOnly
            />
          </div>

          <div data-announcement-property-details="ann-l3" className="mt-6 border-t border-slate-200">
            {listing.description ? (
              <LeanSection title="Description">
                <ExpandablePropertyDescription description={listing.description} />
                <p className="mt-2 text-[11px] font-semibold text-slate-400">{detail.provenance.fact_provenance_label}</p>
              </LeanSection>
            ) : null}

            <FactGroup title="Informations essentielles" facts={detail.facts.essential} />
            {allDetails.length > 0 ? (
              <>
                <FactGroup title="Surfaces" facts={detail.facts.surfaces} />
                <FactGroup title="Agencement" facts={detail.facts.layout} />
                <FactGroup title="Bâtiment & état" facts={detail.facts.building} />
                <FactGroup title="Équipements & caractéristiques" facts={detail.facts.features} />
              </>
            ) : (
              <LeanSection title="Informations détaillées">
                <p className="text-[13.5px] text-slate-500">Aucune caractéristique détaillée n’est renseignée pour cette annonce.</p>
              </LeanSection>
            )}

            <LivingHereSection model={livingHere} mapStyleUrl={mapStyleUrl} />
            <StreetRealitySection model={streetReality} />
            <MarketComparablesSection model={marketComparables} />
            <FinanceMarocSection propertyPriceMad={listing.price} />

            <LeanSection title="Environnement">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="border-t border-slate-200 pt-3">
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Ville</dt>
                  <dd className="mt-1 font-extrabold text-deepblue">{detail.environment.city ?? "Non renseigné"}</dd>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Quartier</dt>
                  <dd className="mt-1 font-extrabold text-deepblue">{detail.environment.district ?? "Non renseigné"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[12px] leading-5 text-slate-500">Aucune proximité ou durée de trajet n’est inventée lorsqu’aucune donnée géographique mesurée n’est disponible.</p>
            </LeanSection>

            <LeanSection title="Coûts & investissement">
              <p className="text-[13.5px] text-slate-500">{detail.costs.label}.</p>
            </LeanSection>

            <LeanSection title="Historique réel">
              {detail.history.length > 0 ? (
                <ol className="divide-y divide-slate-200 border-y border-slate-200">
                  {detail.history.map((item) => (
                    <li key={`${item.label}-${item.value}`} className="py-3.5">
                      <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                      <p className="mt-1 text-[14px] font-extrabold text-deepblue">{item.value}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13.5px] text-slate-500">Aucun historique vérifiable disponible.</p>
              )}
            </LeanSection>

            <LeanSection title="Provenance des informations">
              <dl className="divide-y divide-slate-200 border-y border-slate-200 text-[13px] text-slate-600">
                <div className="flex justify-between gap-4 py-3"><dt>Source</dt><dd className="font-bold text-deepblue">{detail.provenance.source_name}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt>Statut des données source</dt><dd className="text-right font-bold text-deepblue">{detail.provenance.fact_provenance_label}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt>Vérification documentaire</dt><dd className="text-right font-bold text-deepblue">{detail.provenance.verified_document_label}</dd></div>
              </dl>
              {detail.provenance.source_url ? (
                <a href={detail.provenance.source_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-[13px] font-extrabold text-[#0B63CE] underline underline-offset-4">
                  Voir la source d’origine →
                </a>
              ) : null}
            </LeanSection>

            <p className="px-1 py-5 text-[11.5px] leading-5 text-slate-500">{detail.disclaimer}</p>
          </div>
        </div>

        <aside className="hidden space-y-5 lg:sticky lg:top-6 lg:block">
          <ProfessionalConversionCard
            listing={listing}
            model={proConversion}
          />
          <ProjectPersonalizationCard listing={listing} projectId={projectId} />
        </aside>
      </div>

      <CompareBar mobileOffsetClassName="bottom-4" />
    </section>
  );
}
