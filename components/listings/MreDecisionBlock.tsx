import { Check } from "lucide-react";
import { MreBadge } from "@/components/ui/MreBadge";
import type { Listing } from "@/lib/listings/types";
import type { ListingEnrichment } from "@/lib/listings/enrichment";

type MreDecisionBlockProps = {
  listing: Listing;
  enrichment: ListingEnrichment;
};

export function MreDecisionBlock({ listing, enrichment }: MreDecisionBlockProps) {
  if (!listing.is_mre_friendly) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-gray-400">
          Achat à distance
        </p>
        <p className="mt-2 text-[14px] font-semibold text-gray-700">Vérifier les détails avant achat à distance.</p>
        <p className="mt-2 text-[13.5px] leading-6 text-gray-600">{enrichment.remoteBuyingNotes}</p>
      </div>
    );
  }

  const reasons = [
    "Contact WhatsApp disponible",
    "Source consultable",
    "Quartier clairement identifié",
    "Prix/m² visible et comparable",
    "Lecture adaptée à une recherche à distance"
  ];

  return (
    <div className="rounded-2xl border border-[#e9d5ff] bg-[#faf5ff] p-5">
      <div className="flex items-center gap-2">
        <MreBadge />
        <p className="text-[13px] font-bold text-[#7c3aed]">Adapté à un achat MRE</p>
      </div>
      <p className="mt-3 text-[13.5px] leading-6 text-gray-600">{enrichment.remoteBuyingNotes}</p>
      <ul className="mt-3 space-y-2">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-center gap-2 text-[13.5px] font-medium text-gray-700">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#dcfce7]">
              <Check size={14} strokeWidth={3} color="#16a34a" aria-hidden="true" />
            </span>
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
