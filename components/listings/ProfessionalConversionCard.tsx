import Link from "next/link";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { VisitRequestPanel } from "@/components/listings/VisitRequestPanel";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import { ui } from "@/components/ui/design-system";
import type { Listing } from "@/lib/listings/types";
import type { ProConversionModel } from "@/lib/listings/pro-conversion";

export function ProfessionalConversionCard({
  listing,
  model,
  mobileIdentityOnly = false,
}: {
  listing: Listing;
  model: ProConversionModel;
  mobileIdentityOnly?: boolean;
}) {
  const reportHref = `mailto:contact@akarfinder.ma?subject=${encodeURIComponent(`Signalement annonce ${listing.id}`)}`;

  if (mobileIdentityOnly) {
    return (
      <section data-pro-conversion-identity="ann-l11" className={`${ui.surfacePremium} overflow-hidden lg:hidden`}>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/70 p-4">
          <div className="min-w-0">
            <p className={ui.eyebrow}>Professionnel / source</p>
            <p className="mt-1 break-words text-[1rem] font-extrabold text-[#0B2545]">{model.professional.name ?? "Source non renseignée"}</p>
            {model.professional.sourceLabel ? <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{model.professional.sourceLabel}</p> : null}
          </div>
          {model.professional.badgeLabel ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{model.professional.badgeLabel}</span> : null}
        </div>
        <div className="space-y-2.5 p-4">
          {model.actions.visit ? <VisitRequestPanel listing={listing} compact /> : null}
          {model.actions.whatsapp.enabled && model.actions.whatsapp.phone ? (
            <WhatsAppCTA phone={model.actions.whatsapp.phone} label="Contacter via WhatsApp" size="md" variant="primary" />
          ) : null}
          {!model.actions.visit && !model.actions.whatsapp.enabled ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[12px] leading-5 text-slate-600">Le contact direct n’est pas proposé par AkarFinder pour cette source.</p>
          ) : null}
          {model.actions.sourceOriginal.enabled && model.actions.sourceOriginal.url ? (
            <a href={model.actions.sourceOriginal.url} target="_blank" rel="noopener noreferrer" className={`${ui.secondaryAction} w-full text-[12.5px] font-extrabold text-[#0B2545]`}>
              Voir la source d’origine
            </a>
          ) : null}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <CompareToggleButton listingId={listing.id} variant="block" />
            <FavoriteToggleButton listingId={listing.id} variant="block" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-pro-conversion="ann-l11"
      className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,38,68,0.09)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/70 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[#0B63CE]">Professionnel de confiance</p>
            <p className="mt-1.5 break-words text-[1.12rem] font-black tracking-[-0.025em] text-[#0B2545]">{model.professional.name ?? "Source non renseignée"}</p>
            {model.professional.sourceLabel ? <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{model.professional.sourceLabel}</p> : null}
          </div>
          {model.professional.badgeLabel ? <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9.5px] font-extrabold text-amber-800">{model.professional.badgeLabel}</span> : null}
        </div>
      </div>

      <div className="space-y-2.5 p-5">
        {model.actions.visit ? <VisitRequestPanel listing={listing} compact /> : null}
        {model.actions.whatsapp.enabled && model.actions.whatsapp.phone ? (
          <WhatsAppCTA phone={model.actions.whatsapp.phone} label="Contacter via WhatsApp" size="md" variant="primary" />
        ) : null}
        {!model.actions.visit && !model.actions.whatsapp.enabled ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[12px] leading-5 text-slate-600">Le contact direct n’est pas proposé par AkarFinder pour cette source.</p>
        ) : null}
        {model.actions.sourceOriginal.enabled && model.actions.sourceOriginal.url ? (
          <a href={model.actions.sourceOriginal.url} target="_blank" rel="noopener noreferrer" className={`${ui.secondaryAction} w-full text-[12.5px] font-extrabold text-[#0B2545]`}>
            Voir la source d’origine
          </a>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <CompareToggleButton listingId={listing.id} variant="block" />
          <FavoriteToggleButton listingId={listing.id} variant="block" />
        </div>
        <Link href="/mon-projet" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-[11.5px] font-extrabold text-[#0B63CE] transition hover:border-blue-200 hover:bg-blue-50 motion-reduce:transition-none">
          Mon Projet
        </Link>
        <a href={reportHref} className="flex min-h-10 w-full items-center justify-center text-[11px] font-bold text-slate-400 underline decoration-slate-300 underline-offset-4 hover:text-slate-600">Signaler cette annonce</a>
      </div>
    </section>
  );
}
