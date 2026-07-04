import { MessageCircle, CalendarDays, FileText } from "lucide-react";
import { DemoRequestButton } from "./DemoRequestButton";
import { DemoBadge } from "./DemoBadge";

type DemoPartnerContactPanelProps = {
  title: string;
  mode?: "promoter" | "agency";
};

export function DemoPartnerContactPanel({ title, mode = "promoter" }: DemoPartnerContactPanelProps) {
  return (
    <aside className="rounded-2xl border border-[#dbe7f6] bg-white p-5 shadow-[0_12px_32px_rgba(15,35,65,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold text-[#0B1F3A]">{title}</h3>
        <DemoBadge />
      </div>
      <p className="mt-2 text-[12px] leading-5 text-slate-500">
        Contact affiche uniquement si autorise par le partenaire. Aucun message reel n&apos;est envoye dans cette demo.
      </p>
      <div className="mt-4 grid gap-2">
        <DemoRequestButton
          label={mode === "agency" ? "Demander contact demo" : "Demander brochure demo"}
          className="w-full"
        />
        <DemoRequestButton label="Rendez-vous demo" className="w-full bg-[#0B1F3A] hover:bg-[#123458]" />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]"
        >
          <MessageCircle size={15} aria-hidden="true" />
          WhatsApp autorise dans une version partenaire reelle
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11.5px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2">
          <FileText size={13} className="text-[#0B63CE]" aria-hidden="true" />
          Exemple non contractuel
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f8fafc] px-2.5 py-2">
          <CalendarDays size={13} className="text-[#0B63CE]" aria-hidden="true" />
          A confirmer
        </span>
      </div>
    </aside>
  );
}
