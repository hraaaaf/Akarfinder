import { Clock, MapPin, WalletCards } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

type DemoPartnerLeadPreviewProps = {
  leads: Array<{
    profile: string;
    budget: string;
    zone: string;
    urgency: string;
    propertyType: string;
    importantPoint: string;
    source: string;
  }>;
};

export function DemoPartnerLeadPreview({ leads }: DemoPartnerLeadPreviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {leads.map((lead) => (
        <article key={`${lead.profile}-${lead.zone}`} className="rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-extrabold text-[#0B1F3A]">{lead.profile}</h3>
              <p className="mt-1 text-[11.5px] font-bold text-[#0B63CE]">Demande qualifiee demo</p>
            </div>
            <DemoBadge />
          </div>
          <div className="mt-4 space-y-2 text-[12px] text-slate-600">
            <p className="flex items-center gap-2"><WalletCards size={13} className="text-[#0B63CE]" aria-hidden="true" /> {lead.budget}</p>
            <p className="flex items-center gap-2"><MapPin size={13} className="text-[#0B63CE]" aria-hidden="true" /> {lead.zone}</p>
            <p className="flex items-center gap-2"><Clock size={13} className="text-[#0B63CE]" aria-hidden="true" /> {lead.urgency}</p>
            <p><span className="font-bold">Type :</span> {lead.propertyType}</p>
            <p><span className="font-bold">Point important :</span> {lead.importantPoint}</p>
            <p className="text-[11px] text-slate-400">{lead.source}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
