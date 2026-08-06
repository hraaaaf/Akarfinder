import Link from "next/link";
import { ArrowRight, Bookmark, Building2, CalendarDays, CircleAlert, Layers3, MapPin } from "lucide-react";

import { Container } from "@/components/ui/Container";

export type ProgramStatus = "delivered" | "construction" | "off_plan";
export type ProgramInformationLevel = "limited" | "partial" | "solid";

export type ProgramCardData = {
  slug: string;
  name: string;
  city: string;
  neighborhood?: string;
  promoterName?: string;
  promoterLogoUrl?: string;
  status: ProgramStatus;
  deliveryLabel?: string;
  propertyTypes: string[];
  configurations?: string[];
  priceLabel?: string;
  informationLevel: ProgramInformationLevel;
  sourceCount: number;
  knownUnitCount?: number;
  imageUrl?: string;
  knownFacts: string[];
  missingFacts: string[];
  isNew?: boolean;
};

const STATUS_LABELS: Record<ProgramStatus, string> = {
  delivered: "Livré",
  construction: "En construction",
  off_plan: "Sur plan",
};

const STATUS_PROGRESS: Record<ProgramStatus, string> = {
  delivered: "w-full",
  construction: "w-2/3",
  off_plan: "w-1/3",
};

const INFORMATION_LABELS: Record<ProgramInformationLevel, string> = {
  limited: "Informations limitées",
  partial: "Informations partielles",
  solid: "Informations solides",
};

export function ProgramCard({ program }: { program: ProgramCardData }) {
  const location = [program.city, program.neighborhood].filter(Boolean).join(" · ");
  const propertyLabel = program.configurations?.length
    ? `${program.propertyTypes.join(" / ")} — ${program.configurations.join(", ")}`
    : program.propertyTypes.join(" / ");

  return (
    <article className="flex h-full min-w-[86vw] snap-start flex-col overflow-hidden rounded-[1.75rem] border border-[#DCE8F5] bg-white shadow-[0_20px_55px_rgba(11,31,58,0.09)] sm:min-w-[360px] lg:min-w-0">
      <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(135deg,#D7E6F4_0%,#F4F7FA_48%,#DCCCB8_100%)]">
        {program.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[#315E8F]" aria-label="Illustration neutre du programme">
            <Building2 size={48} strokeWidth={1.4} aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071B33]/82 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {program.isNew ? <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Nouveau</span> : null}
          <span className="rounded-full bg-[#0B1F3A]/90 px-3 py-1.5 text-[10px] font-extrabold text-white backdrop-blur">{STATUS_LABELS[program.status]}</span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#F6D28B]"><MapPin size={13} aria-hidden="true" /> {location}</p>
          <h3 className="mt-1.5 text-[1.45rem] font-extrabold tracking-[-0.035em]">{program.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Promoteur ou source</p>
            <p className="mt-1 text-[14px] font-extrabold text-[#0B1F3A]">{program.promoterName || "Source identifiée"}</p>
          </div>
          <button type="button" aria-label={`Enregistrer ${program.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#DCE8F5] text-[#0B63CE] transition hover:bg-[#EEF6FF]">
            <Bookmark size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-[#F6F9FC] p-3">
            <Layers3 size={15} className="text-[#B7791F]" aria-hidden="true" />
            <p className="mt-2 font-bold leading-5 text-[#315E8F]">{propertyLabel}</p>
          </div>
          <div className="rounded-xl bg-[#F6F9FC] p-3">
            <CalendarDays size={15} className="text-[#B7791F]" aria-hidden="true" />
            <p className="mt-2 font-bold leading-5 text-[#315E8F]">{program.deliveryLabel || "Livraison non communiquée"}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>{STATUS_LABELS[program.status]}</span>
            <span>{INFORMATION_LABELS[program.informationLevel]}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E8EEF5]"><div className={`h-full rounded-full bg-[#B7791F] ${STATUS_PROGRESS[program.status]}`} /></div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-y border-[#E8EEF5] py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Prix</p>
            <p className="mt-1 text-[1.05rem] font-extrabold text-[#0B1F3A]">{program.priceLabel || "Prix non communiqué"}</p>
          </div>
          <p className="text-right text-[12px] font-bold text-[#0B63CE]">{program.sourceCount} source{program.sourceCount > 1 ? "s" : ""} reliée{program.sourceCount > 1 ? "s" : ""}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#EEF6FF] p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">Ce que nous savons</p>
            <p className="mt-2 text-[12px] leading-5 text-[#315E8F]">{program.knownFacts.join(" · ")}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-700"><CircleAlert size={12} /> Ce qui manque</p>
            <p className="mt-2 text-[12px] leading-5 text-amber-900/75">{program.missingFacts.length ? program.missingFacts.join(" · ") : "Aucun manque majeur signalé"}</p>
          </div>
        </div>

        <Link href={`/programmes/${program.slug}`} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#084FA8]">
          Explorer le programme <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function ProgramsSection({ programs = [] }: { programs?: ProgramCardData[] }) {
  return (
    <section className="border-y border-[#DCE8F5] bg-[#F6F9FC] py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Programmes neufs</p>
            <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.7rem]">Explorez les programmes suffisamment documentés</h2>
          </div>
          {programs.length ? <Link href="/search?transaction_type=new&q=programme" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Voir tous les programmes <ArrowRight size={14} /></Link> : null}
        </div>

        {programs.length ? (
          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible">
            {programs.map((program) => <ProgramCard key={program.slug} program={program} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-[#93C5FD] bg-white p-6 sm:p-8">
            <div className="max-w-2xl">
              <Building2 size={28} className="text-[#B7791F]" aria-hidden="true" />
              <h3 className="mt-4 text-[1.35rem] font-extrabold text-[#0B1F3A]">Aucun programme suffisamment documenté à afficher pour le moment</h3>
              <p className="mt-3 text-[14px] leading-7 text-slate-600">La section ne publie aucune carte de démonstration. Recherchez les offres neuves observées par ville ou typologie pendant que les programmes structurés sont qualifiés.</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link href="/search?transaction_type=new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-[13px] font-extrabold text-white">Rechercher dans le neuf <ArrowRight size={14} /></Link>
                <Link href="/compagnon" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DCE8F5] px-5 text-[13px] font-extrabold text-[#0B1F3A]">Me laisser guider</Link>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
