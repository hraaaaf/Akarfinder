import Link from "next/link";
import { ArrowRight, Check, Globe2, Heart, MapPin, WalletCards } from "lucide-react";

import { Container } from "@/components/ui/Container";

const benefits = [
  "Comprendre le quartier à distance",
  "Comparer plusieurs biens clairement",
  "Préparer son projet étape par étape",
  "Retrouver les sources et informations utiles",
];

const cities = ["Paris", "Bruxelles", "Montréal", "Madrid", "Amsterdam", "Milan"];

export function MreTrustSection() {
  return (
    <section className="bg-background py-12 sm:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[1.6rem] border border-[#DCE8F5] bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF6FF_52%,#FFFFFF_100%)] shadow-[0_22px_60px_rgba(11,99,206,0.09)] sm:rounded-[2rem] sm:shadow-[0_28px_80px_rgba(11,99,206,0.10)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#93C5FD]/25" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#60A5FA]/20" />

          <div className="grid gap-0 lg:grid-cols-[1fr_0.95fr]">
            <div className="relative p-5 sm:p-10 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE] backdrop-blur-sm sm:text-[11px] sm:tracking-[0.16em]">
                <Globe2 size={14} aria-hidden="true" /> Marocains du monde
              </span>

              <h2 className="mt-4 max-w-[650px] text-[1.9rem] font-extrabold leading-[1.06] tracking-[-0.045em] text-[#0B1F3A] sm:mt-5 sm:text-[3rem]">Préparez votre projet au Maroc, où que vous soyez.</h2>
              <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-slate-600 sm:mt-4 sm:text-[15px] sm:leading-7">Comparez les biens, comprenez les quartiers et structurez vos critères avant votre déplacement ou votre prochaine étape.</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:gap-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2 rounded-xl border border-white/80 bg-white/70 p-3 shadow-[0_10px_24px_rgba(11,31,58,0.04)] backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#E8F2FF] text-[#0B63CE] sm:h-6 sm:w-6">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                    <p className="text-[11.5px] font-bold leading-4.5 text-[#0B1F3A] sm:text-[13px] sm:leading-5">{benefit}</p>
                  </div>
                ))}
              </div>

              <Link href="/compagnon" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3.5 text-[13px] font-extrabold text-white shadow-[0_14px_30px_rgba(11,99,206,0.22)] transition hover:bg-[#084FA8] sm:mt-7 sm:w-auto">
                Préparer mon projet au Maroc <ArrowRight size={15} aria-hidden="true" />
              </Link>

              <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-7 sm:flex-wrap sm:overflow-visible" aria-label="Exemples de villes de résidence">
                {cities.map((city) => (
                  <span key={city} className="shrink-0 rounded-full border border-[#BFDBFE] bg-white/75 px-3 py-1.5 text-[11px] font-semibold text-slate-600">{city}</span>
                ))}
              </div>
            </div>

            <div className="border-t border-[#DCE8F5] bg-white/70 p-5 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <div className="mx-auto max-w-[430px] rounded-[1.45rem] border border-[#DCE8F5] bg-white p-4 shadow-[0_18px_50px_rgba(11,31,58,0.10)] sm:rounded-[1.75rem] sm:p-6 sm:shadow-[0_24px_70px_rgba(11,31,58,0.12)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#E8EEF5] pb-3 sm:pb-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mon Projet</p>
                    <h3 className="mt-1 text-[1.15rem] font-extrabold text-[#0B1F3A] sm:text-[1.25rem]">Projet au Maroc</h3>
                  </div>
                  <span className="rounded-full bg-[#E8F2FF] px-3 py-1 text-[10px] font-bold text-[#0B63CE]">À préparer</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3">
                  <div className="rounded-xl bg-[#F6F9FC] p-3 sm:rounded-2xl sm:p-4">
                    <MapPin size={15} className="text-[#0B63CE]" aria-hidden="true" />
                    <p className="mt-2 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:mt-3 sm:text-[10px] sm:tracking-[0.12em]">Ville</p>
                    <p className="mt-1 text-[13px] font-extrabold text-[#0B1F3A] sm:text-[14px]">Rabat</p>
                  </div>
                  <div className="rounded-xl bg-[#F6F9FC] p-3 sm:rounded-2xl sm:p-4">
                    <WalletCards size={15} className="text-[#0B63CE]" aria-hidden="true" />
                    <p className="mt-2 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:mt-3 sm:text-[10px] sm:tracking-[0.12em]">Budget</p>
                    <p className="mt-1 text-[13px] font-extrabold text-[#0B1F3A] sm:text-[14px]">4 000 000 DH</p>
                  </div>
                </div>

                <div className="mt-2.5 rounded-xl border border-[#E8EEF5] p-3 sm:mt-3 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Heart size={15} className="text-[#0B63CE]" aria-hidden="true" />
                      <p className="text-[12px] font-bold text-[#0B1F3A]">Biens enregistrés</p>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#0B63CE]">8</span>
                  </div>
                </div>

                <div className="mt-3 hidden rounded-2xl border border-[#E8EEF5] p-4 sm:block">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Questions à préparer</p>
                  <div className="mt-3 space-y-2">
                    {["Disponibilité du bien", "Charges et frais", "Titre foncier"].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[12px] text-slate-700">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#E8F2FF] text-[#0B63CE]"><Check size={10} strokeWidth={3} /></span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
