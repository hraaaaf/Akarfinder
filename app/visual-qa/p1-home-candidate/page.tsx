import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Home, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import { SearchEntryOrchestrator } from "@/components/home/SearchEntryOrchestrator";
import { SignatureMapSection } from "@/components/landing/SignatureMapSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

const HERO_DESKTOP = "/images/hero/akar-residence-sunset-desktop.webp";
const HERO_MOBILE = "/images/hero/akar-residence-sunset-mobile.webp";

const trustSignals = [
  { icon: Sparkles, title: "Multi-source", detail: "Une recherche, plusieurs sources" },
  { icon: ShieldCheck, title: "Sources visibles", detail: "Origine et fraîcheur quand disponibles" },
  { icon: MapPinned, title: "Marché & quartiers", detail: "Comprendre avant de visiter" },
] as const;

const cities = [
  ["Casablanca", "Économique & affaires"],
  ["Rabat", "Capitale & administration"],
  ["Marrakech", "Tourisme & patrimoine"],
  ["Tanger", "Portuaire & international"],
  ["Agadir", "Balnéaire & détente"],
  ["Fès", "Impériale & patrimoine"],
] as const;

const actions = [
  {
    href: "/mon-projet",
    icon: CheckCircle2,
    eyebrow: "Votre projet",
    title: "Préparer mon projet",
    body: "Structurez ville, budget et critères avant de comparer.",
  },
  {
    href: "/vendre",
    icon: Home,
    eyebrow: "Vous avez un bien",
    title: "Vendre / Estimer",
    body: "Préparez votre vente et consultez les repères disponibles.",
  },
  {
    href: "/pro",
    icon: Building2,
    eyebrow: "Professionnels",
    title: "Agences & promoteurs",
    body: "Accédez aux outils et parcours dédiés aux professionnels.",
  },
] as const;

export default function P1HomeCandidatePage() {
  return (
    <main data-p1-home-candidate="v1" className="min-h-screen bg-white text-[#0B1F3A]">
      <SiteHeader variant="light" compact />

      <section aria-labelledby="p1-home-candidate-title" className="relative isolate overflow-hidden bg-[#07162B] text-white">
        <div className="pointer-events-none absolute inset-0 -z-20" aria-hidden="true">
          <picture>
            <source media="(max-width: 639px)" srcSet={HERO_MOBILE} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_DESKTOP} alt="" className="h-full w-full object-cover object-center" />
          </picture>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,16,31,0.80)_0%,rgba(3,16,31,0.58)_54%,rgba(3,16,31,0.36)_100%)]" aria-hidden="true" />

        <Container>
          <div className="mx-auto flex min-h-[500px] max-w-[1050px] flex-col items-center justify-center py-12 text-center sm:min-h-[540px] sm:py-16 lg:min-h-[560px]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-100 sm:text-[11px]">Immobilier · Maroc</p>
            <h1 id="p1-home-candidate-title" className="mt-4 max-w-[980px] text-[2.45rem] font-extrabold leading-[1.01] tracking-[-0.055em] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.34)] sm:text-[3.6rem] lg:text-[4.3rem]">
              1er moteur de recherche immobilier au Maroc
            </h1>
            <p className="mt-4 max-w-[720px] text-[14px] font-medium leading-6 text-white/88 sm:text-[16px] sm:leading-7">
              Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.
            </p>
            <div className="mt-7 w-full max-w-[880px] sm:mt-8">
              <SearchEntryOrchestrator />
            </div>
          </div>
        </Container>
      </section>

      <section aria-label="Pourquoi AkarFinder" className="border-b border-[#DFEAF6] bg-white">
        <Container>
          <div className="mx-auto grid max-w-[1050px] gap-0 sm:grid-cols-3">
            {trustSignals.map(({ icon: Icon, title, detail }, index) => (
              <div key={title} className={`flex min-h-[112px] items-center gap-3 py-5 sm:px-5 ${index > 0 ? "border-t border-[#E6EEF7] sm:border-l sm:border-t-0" : ""}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF6FF] text-[#0B63CE]">
                  <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[12.5px] font-extrabold text-[#0B1F3A]">{title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <SignatureMapSection />

      <section className="bg-white py-10 sm:py-14 lg:py-16" aria-labelledby="p1-cities-title">
        <Container>
          <div className="mx-auto max-w-[1240px]">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">Explorer</p>
                <h2 id="p1-cities-title" className="mt-2 text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.35rem]">Villes populaires</h2>
                <p className="mt-2 max-w-[610px] text-[0.88rem] leading-6 text-slate-600 sm:text-[0.96rem]">Entrez par une ville, puis laissez le moteur faire le reste.</p>
              </div>
              <Link href="/immobilier" className="hidden text-[12px] font-extrabold text-[#0B63CE] hover:underline sm:inline-flex">Toutes les villes</Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {cities.map(([city, tag]) => (
                <Link key={city} href={`/search?city=${encodeURIComponent(city)}`} className="group min-w-0 rounded-2xl border border-[#DCE8F5] bg-[#F9FCFF] p-3.5 transition hover:border-[#93C5FD] hover:bg-white hover:shadow-[0_12px_30px_rgba(11,99,206,0.08)] sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-extrabold text-[#0B1F3A]">{city}</p>
                    <ArrowRight size={14} className="shrink-0 text-[#0B63CE] transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">{tag}</p>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#F7FAFD] py-11 sm:py-16" aria-labelledby="p1-actions-title">
        <Container>
          <div className="mx-auto max-w-[1240px]">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.19em] text-[#0B63CE]">Pour aller plus loin</p>
            <h2 id="p1-actions-title" className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.55rem]">La suite de votre projet</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {actions.map(({ href, icon: Icon, eyebrow, title, body }) => (
                <Link key={title} href={href} className="group flex min-h-[178px] flex-col rounded-[1.25rem] border border-[#DCE8F5] bg-white p-5 shadow-[0_10px_28px_rgba(11,31,58,0.05)] transition hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_18px_42px_rgba(11,99,206,0.10)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF4FF] text-[#0B63CE]"><Icon size={19} strokeWidth={2.2} aria-hidden="true" /></span>
                    <ArrowRight size={17} className="mt-1 text-[#0B63CE]" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">{eyebrow}</p>
                  <h3 className="mt-1.5 text-[1.18rem] font-extrabold tracking-[-0.025em] text-[#0B1F3A]">{title}</h3>
                  <p className="mt-2 text-[11.5px] leading-5 text-slate-600 sm:text-[12px]">{body}</p>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
