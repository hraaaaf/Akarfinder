import Link from "next/link";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { VisitRequestPanel } from "@/components/listings/VisitRequestPanel";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import type { Listing } from "@/lib/listings/types";
import type { ProConversionModel } from "@/lib/listings/pro-conversion";

export function ProfessionalConversionCard({
  listing,
  model,
  priceLabel,
  location,
  mobileIdentityOnly = false,
}: {
  listing: Listing;
  model: ProConversionModel;
  priceLabel: string;
  location: string;
  mobileIdentityOnly?: boolean;
}) {
  const reportHref = `mailto:contact@akarfinder.ma?subject=${encodeURIComponent(`Signalement annonce ${listing.id}`)}`;

  if (mobileIdentityOnly) {
    return (
      <section data-pro-conversion-identity="ann-l11" className="rounded-[1.25rem] border border-[#eadfca] bg-white p-4 shadow-[0_6px_22px_rgba(7,27,51,0.05)] lg:hidden">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Professionnel / source</p>
            <p className="mt-1 text-[1rem] font-extrabold text-deepblue">{model.professional.name ?? "Source non renseignée"}</p>
            {model.professional.sourceLabel ? <p className="mt-1 text-[11.5px] text-slate-500">{model.professional.sourceLabel}</p> : null}
          </div>
          {model.professional.badgeLabel ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{model.professional.badgeLabel}</span> : null}
        </div>
      </section>
    );
  }

  return (
    <section data-pro-conversion="ann-l11" className="overflow-hidden rounded-[1.4rem] border border-[#eadfca] bg-white shadow-[0_14px_38px_rgba(7,27,51,0.12)]">
      <div className="bg-[#0B63CE] px-5 py-4 text-white dark:bg-deepblue">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-bronze-400">Professionnel & actions</p>
        <p className="mt-1 text-[1.55rem] font-extrabold">{priceLabel}</p>
        <p className="mt-1 text-[13px] font-semibold text-white/75">{location}</p>
      </div>

      <div className="border-b border-[#efe5d4] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Professionnel / source</p>
            <p className="mt-1 break-words text-[1.05rem] font-extrabold text-deepblue">{model.professional.name ?? "Source non renseignée"}</p>
            {model.professional.sourceLabel ? <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{model.professional.sourceLabel}</p> : null}
          </div>
          {model.professional.badgeLabel ? <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{model.professional.badgeLabel}</span> : null}
        </div>
      </div>

      <div className="space-y-2.5 p-5">
        {model.actions.whatsapp.enabled && model.actions.whatsapp.phone ? (
          <WhatsAppCTA phone={model.actions.whatsapp.phone} label="Contacter via WhatsApp" size="md" variant="primary" />
        ) : null}
        {model.actions.visit ? <VisitRequestPanel listing={listing} /> : null}
        {!model.actions.visit && !model.actions.whatsapp.enabled ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[12px] leading-5 text-slate-600">Le contact direct n’est pas proposé par AkarFinder pour cette source.</p>
        ) : null}
        {model.actions.sourceOriginal.enabled && model.actions.sourceOriginal.url ? (
          <a href={model.actions.sourceOriginal.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13px] font-extrabold text-deepblue">Voir la source d’origine</a>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <CompareToggleButton listingId={listing.id} variant="block" />
          <FavoriteToggleButton listingId={listing.id} variant="block" />
        </div>
        <Link href="/mon-projet" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d8c8a3] px-4 py-3 text-[13px] font-extrabold text-deepblue transition hover:border-[#0B63CE]/45 hover:bg-slate-50">Continuer dans Mon Projet</Link>
        <a href={reportHref} className="flex min-h-11 w-full items-center justify-center text-[12px] font-bold text-slate-500 underline underline-offset-4">Signaler cette annonce</a>
      </div>
    </section>
  );
}
