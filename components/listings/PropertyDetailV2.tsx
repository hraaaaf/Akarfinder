import Link from "next/link";
import { CompareBar } from "@/components/compare/CompareBar";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { ExpandablePropertyDescription } from "@/components/listings/ExpandablePropertyDescription";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { PropertyCore } from "@/components/listings/PropertyCore";
import { PropertyMediaGallery } from "@/components/listings/PropertyMediaGallery";
import { VisitRequestPanel } from "@/components/listings/VisitRequestPanel";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import { canShowContactActions } from "@/lib/listings/listing-boundary";
import { buildPropertyCoreModel } from "@/lib/listings/property-core";
import type { Listing } from "@/lib/listings/types";
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
      <dl className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.key}
            data-detail-fact={fact.key}
            className="min-w-0 border-t border-slate-200 py-3.5 pr-4 sm:odd:border-r sm:even:pl-4 lg:border-r lg:px-4 lg:first:pl-0 lg:nth-[3n]:border-r-0"
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

function LeanSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
}) {
  const showContactActions = canShowContactActions(listing);
  const core = buildPropertyCoreModel(listing);
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

          <div className="mt-6 space-y-5">
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

            {detail.multisource.status === "supported" ? (
              <LeanSection title="Multi-source">
                <p className="text-[13.5px] text-slate-600">{detail.multisource.label}</p>
              </LeanSection>
            ) : null}

            {detail.conclusion.attention_label ? (
              <section className="border-b border-amber-200 bg-amber-50/65 px-4 py-6 sm:px-5">
                <h2 className="text-[1.15rem] font-extrabold text-amber-900">Points à examiner</h2>
                <p className="mt-2 text-[13.5px] leading-6 text-amber-900/80">{detail.conclusion.attention_label}</p>
              </section>
            ) : null}

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

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_14px_38px_rgba(7,27,51,0.12)]">
            <div className="bg-[#0B63CE] px-5 py-4 text-white dark:bg-deepblue">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">Actions</p>
              <p className="mt-1 text-[1.55rem] font-extrabold">{core.priceLabel}</p>
              <p className="mt-1 text-[13px] font-semibold text-white/75">{core.location}</p>
            </div>
            <div className="space-y-2.5 p-5">
              {showContactActions && listing.whatsapp ? <WhatsAppCTA phone={listing.whatsapp} label="Contacter via WhatsApp" size="md" variant="primary" /> : null}
              {showContactActions ? <VisitRequestPanel listing={listing} /> : null}
              <CompareToggleButton listingId={listing.id} variant="block" />
              <FavoriteToggleButton listingId={listing.id} variant="block" />
              <Link
                href="/mon-projet"
                className="hidden min-h-11 w-full items-center justify-center rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13px] font-extrabold text-deepblue transition hover:border-[#0B63CE]/45 hover:bg-slate-50 lg:flex"
              >
                Continuer dans Mon Projet
              </Link>
              {listing.listing_url ? (
                <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13px] font-extrabold text-deepblue">
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
