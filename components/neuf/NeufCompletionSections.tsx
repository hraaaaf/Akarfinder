import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleDot,
  Compass,
  Home,
  Info,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Container } from "@/components/ui/Container";

const PARTNERS: Array<{
  slug: string;
  name: string;
  cities: string[];
  programCount: number;
  typologies: string[];
}> = [];

const LIFESTYLES = [
  { label: "Bord de mer", query: "bord de mer", icon: Sparkles },
  { label: "Familial", query: "familial", icon: Home },
  { label: "Centre-ville", query: "centre-ville", icon: Building2 },
  { label: "Résidentiel calme", query: "résidentiel calme", icon: ShieldCheck },
  { label: "Investissement", query: "investissement", icon: CircleDot },
  { label: "Haut standing", query: "haut standing", icon: KeyRound },
] as const;

const TIMELINE = [
  { title: "Sur plan", text: "Le programme est commercialisé avant ou au début des travaux.", icon: CircleDot },
  { title: "En construction", text: "Les travaux sont annoncés comme démarrés, selon les informations disponibles.", icon: Building2 },
  { title: "Livré", text: "Le programme est annoncé comme achevé ou prêt à être occupé.", icon: KeyRound },
] as const;

const READ_PROGRAM = [
  ["Typologies", "Les types de biens et configurations réellement documentés."],
  ["Prix", "Une fourchette prouvée, un prix d’appel ou la mention Prix non communiqué."],
  ["Livraison", "La date ou période annoncée avec son niveau de précision réel."],
  ["Niveau d’information", "Ce qui est confirmé, ce qui manque et le nombre de sources reliées."],
] as const;

export function NeufCompletionSections() {
  return (
    <>
      <section className="border-y border-[#DCE8F5] bg-[#F6F9FC] py-10 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Promoteurs partenaires</p>
            <h2 className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.7rem]">Explorez les programmes de partenaires identifiés</h2>
            <p className="mt-3 text-[14px] leading-7 text-slate-600">Chaque partenaire actif dispose d’une page dédiée avec ses programmes publiés et ses informations autorisées.</p>
          </div>

          {PARTNERS.length > 0 ? (
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {PARTNERS.map((partner) => (
                <article key={partner.slug} className="rounded-3xl border border-[#DCE8F5] bg-white p-6 shadow-[0_16px_45px_rgba(11,31,58,0.06)]">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E8F2FF] text-[#0B63CE]"><Building2 size={22} aria-hidden="true" /></div>
                  <h3 className="mt-5 text-[1.2rem] font-extrabold text-[#0B1F3A]">{partner.name}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">{partner.cities.join(" · ")}</p>
                  <p className="mt-3 text-[12px] font-bold text-[#315E8F]">{partner.programCount} programmes · {partner.typologies.join(" · ")}</p>
                  <Link href={`/promoteurs/${partner.slug}`} className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Voir les programmes <ArrowRight size={14} aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-[#B8CEE6] bg-white p-5 sm:rounded-3xl sm:p-9">
              <p className="text-[15px] font-extrabold text-[#0B1F3A] sm:text-[16px]">Les pages partenaires sont prêtes à être activées.</p>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-600">Aucun promoteur n’est présenté comme partenaire tant que son activation et ses données autorisées ne sont pas confirmées.</p>
              <Link href="/promoteurs" className="mt-4 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Découvrir l’espace promoteurs <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          )}
        </Container>
      </section>

      <section className="bg-white py-10 sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Selon votre mode de vie</p>
            <h2 className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.7rem]">Préparez une recherche qui vous ressemble</h2>
            <p className="mt-3 text-[14px] leading-7 text-slate-600">Ces catégories seront activées uniquement à partir d’attributs structurés et de règles explicables.</p>
          </div>
          <div className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-6">
            {LIFESTYLES.map(({ label, query, icon: Icon }) => (
              <Link key={label} href={`/search?transaction_type=new&q=${encodeURIComponent(query)}`} className="group min-w-[68vw] snap-start rounded-2xl border border-[#DCE8F5] bg-[#F8FBFF] p-4 transition hover:border-[#93C5FD] hover:bg-white sm:min-w-[280px] md:min-w-0">
                <Icon size={18} className="text-[#B7791F]" aria-hidden="true" />
                <span className="mt-3 block text-[13px] font-extrabold text-[#0B1F3A]">{label}</span>
                <span className="mt-1.5 block text-[11px] leading-5 text-slate-500">Qualification à confirmer</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-[#DCE8F5] bg-[#0B1F3A] py-10 text-white sm:py-20">
        <Container>
          <div className="max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F6D28B]">Avancement du programme</p>
            <h2 className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] sm:text-[2.7rem]">Du plan à la remise des clés</h2>
          </div>
          <div className="relative mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible">
            <div className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-white/20 md:block" aria-hidden="true" />
            {TIMELINE.map(({ title, text, icon: Icon }, index) => (
              <article key={title} className="relative min-w-[78vw] snap-start rounded-2xl border border-white/12 bg-white/[0.055] p-5 backdrop-blur-sm sm:min-w-[340px] md:min-w-0 md:rounded-3xl md:p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6D28B] text-[#0B1F3A] sm:h-14 sm:w-14"><Icon size={20} aria-hidden="true" /></span>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#F6D28B]">Étape {index + 1}</p>
                <h3 className="mt-2 text-[1.15rem] font-extrabold sm:text-[1.25rem]">{title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-white/70">{text}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 text-[12px] leading-6 text-white/60"><Info size={15} className="mt-1 shrink-0" aria-hidden="true" />L’état et la date de livraison reposent sur les informations disponibles auprès des sources.</p>
        </Container>
      </section>

      <section className="bg-[#F6F9FC] py-10 sm:py-20">
        <Container>
          <div className="grid items-center gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Lire un programme</p>
              <h2 className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.7rem]">Les repères utiles avant de comparer</h2>
              <p className="mt-3 text-[14px] leading-7 text-slate-600">Une fiche Programme distingue le projet, ses typologies, son avancement et la qualité des informations disponibles.</p>
            </div>
            <div className="rounded-[1.5rem] border border-[#DCE8F5] bg-white p-5 shadow-[0_24px_70px_rgba(11,31,58,0.10)] sm:rounded-[2rem] sm:p-7">
              <div className="grid grid-cols-2 gap-4">
                {READ_PROGRAM.map(([title, text], index) => (
                  <article key={title} className="border-l-2 border-[#D69E2E] pl-3 sm:pl-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#B7791F]">0{index + 1}</span>
                    <h3 className="mt-1.5 text-[14px] font-extrabold text-[#0B1F3A] sm:text-[15px]">{title}</h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-slate-600 sm:text-[12.5px] sm:leading-6">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

export function NeufFinalCTA() {
  return (
    <section className="bg-[#071B33] py-12 text-white sm:py-20">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[2rem] font-extrabold tracking-[-0.04em] sm:text-[3rem]">Votre projet neuf commence par une recherche plus claire.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-white/70">Recherchez directement ou précisez votre projet étape par étape.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/search?transaction_type=new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-6 text-[14px] font-extrabold text-white transition hover:bg-[#084FA8]">Rechercher dans le neuf <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 text-[14px] font-extrabold text-white transition hover:bg-white/10">Me laisser guider <Compass size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
