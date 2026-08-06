import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Compass, Home, Info, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NeufCompletionSections, NeufFinalCTA } from "@/components/neuf/NeufCompletionSections";
import { NeufHeroProgramPreview } from "@/components/neuf/NeufHeroProgramPreview";
import { ProgramsSection } from "@/components/neuf/ProgramCard";
import { Container } from "@/components/ui/Container";

const QUICK_LINKS = [
  { label: "Tous les programmes", href: "/search?transaction_type=new", icon: Building2 },
  { label: "En construction", href: "/search?transaction_type=new&q=en+construction", icon: Sparkles },
  { label: "Livrés", href: "/search?transaction_type=new&q=livr%C3%A9", icon: CheckCircle2 },
  { label: "Nouveautés", href: "/search?transaction_type=new&sort=freshness", icon: Home },
] as const;

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;
const TYPOLOGIES = [
  { label: "Appartements", href: "/search?transaction_type=new&property_type=apartment" },
  { label: "Villas", href: "/search?transaction_type=new&property_type=villa" },
  { label: "Résidences", href: "/search?transaction_type=new&q=r%C3%A9sidence" },
  { label: "Programmes mixtes", href: "/search?transaction_type=new&q=programme" },
] as const;

const PRINCIPLES = [
  { icon: Search, title: "Recherche spécialisée", text: "Ville, typologie, budget et état du programme structurent la recherche sans créer un catalogue parallèle." },
  { icon: ShieldCheck, title: "Information clairement qualifiée", text: "La source, le niveau d’information et les données manquantes restent visibles pour chaque résultat." },
  { icon: Building2, title: "Programmes et unités distingués", text: "Un programme peut regrouper plusieurs typologies et disponibilités sans être réduit à une simple annonce." },
] as const;

export function NeufPageShellV2() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <section className="relative overflow-hidden border-b border-[#DCE8F5] bg-[radial-gradient(circle_at_82%_18%,rgba(202,145,64,0.16),transparent_28%),linear-gradient(135deg,#F8FBFF_0%,#EEF6FF_52%,#FFFFFF_100%)] py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.86fr)] lg:gap-14">
            <div className="max-w-[760px]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#B7791F]">Immobilier neuf</p>
              <h1 className="mt-3 text-[2.45rem] font-extrabold leading-[1.02] tracking-[-0.052em] text-[#0B1F3A] sm:text-[3.7rem] lg:text-[4.2rem]">Le neuf au Maroc, plus clair dès la première recherche.</h1>
              <p className="mt-5 max-w-[680px] text-[15px] leading-7 text-slate-600 sm:text-[16px]">Recherchez des appartements, villas et programmes neufs partout au Maroc.</p>

              <form action="/search" method="get" className="mt-8 rounded-[1.65rem] border border-[#D7E6F7] bg-white p-3 shadow-[0_24px_70px_rgba(11,31,58,0.12)] sm:p-4">
                <input type="hidden" name="transaction_type" value="new" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Ville</span><select name="city" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold text-[#0B1F3A] outline-none"><option value="">Tout le Maroc</option>{CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Type de bien</span><select name="property_type" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold text-[#0B1F3A] outline-none"><option value="">Tous les types</option><option value="apartment">Appartement</option><option value="villa">Villa</option></select></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Budget maximum</span><select name="max_price" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold text-[#0B1F3A] outline-none"><option value="">Sans limite</option><option value="1000000">1 000 000 DH</option><option value="2000000">2 000 000 DH</option><option value="4000000">4 000 000 DH</option></select></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">État du programme</span><select name="q" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold text-[#0B1F3A] outline-none"><option value="">Tous les états</option><option value="livré">Livré</option><option value="en construction">En construction</option><option value="sur plan">Sur plan</option></select></label>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(11,99,206,0.22)] transition hover:bg-[#084FA8]"><Search size={16} aria-hidden="true" /> Rechercher dans le neuf</button>
                  <Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D7E6F7] bg-white px-5 text-[14px] font-extrabold text-[#0B1F3A] transition hover:bg-[#F8FBFF]">Me laisser guider <Compass size={15} aria-hidden="true" /></Link>
                </div>
              </form>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{QUICK_LINKS.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#D7E6F7] bg-white/75 px-3 text-[12px] font-bold text-[#315E8F] transition hover:bg-white"><Icon size={15} className="shrink-0 text-[#B7791F]" aria-hidden="true" />{label}</Link>)}</div>
            </div>
            <NeufHeroProgramPreview />
          </div>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Explorer le neuf</p><h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.7rem]">Commencez par une ville ou une typologie</h2></div><Link href="/search?transaction_type=new" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Voir tous les résultats <ArrowRight size={14} aria-hidden="true" /></Link></div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div><h3 className="flex items-center gap-2 text-[14px] font-extrabold text-[#0B1F3A]"><MapPin size={17} className="text-[#B7791F]" /> Villes</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{CITIES.map((city) => <Link key={city} href={`/search?transaction_type=new&city=${encodeURIComponent(city)}`} className="rounded-xl border border-[#DCE8F5] bg-[#F8FBFF] px-4 py-4 text-[13px] font-extrabold text-[#315E8F] transition hover:bg-white">{city}</Link>)}</div></div>
            <div><h3 className="flex items-center gap-2 text-[14px] font-extrabold text-[#0B1F3A]"><Building2 size={17} className="text-[#B7791F]" /> Typologies</h3><div className="mt-4 grid grid-cols-2 gap-3">{TYPOLOGIES.map((item) => <Link key={item.label} href={item.href} className="rounded-xl border border-[#DCE8F5] bg-[#F8FBFF] px-4 py-4 text-[13px] font-extrabold text-[#315E8F] transition hover:bg-white">{item.label}</Link>)}</div></div>
          </div>
        </Container>
      </section>

      <ProgramsSection programs={[]} />
      <NeufCompletionSections />

      <section className="border-b border-[#DCE8F5] bg-white py-14 sm:py-20">
        <Container>
          <div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Pourquoi AkarFinder pour le neuf</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.5rem]">Une recherche spécialisée, sans catalogue artificiel</h2></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{PRINCIPLES.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#DCE8F5] bg-[#F8FBFF] p-5"><Icon size={19} className="text-[#B7791F]" aria-hidden="true" /><h3 className="mt-4 text-[15px] font-extrabold text-[#0B1F3A]">{title}</h3><p className="mt-2 text-[13px] leading-6 text-slate-600">{text}</p></article>)}</div>
          <aside className="mt-6 rounded-2xl border border-amber-300/50 bg-amber-50 p-5"><div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" /><div><p className="text-[13px] font-extrabold text-[#0B1F3A]">Transparence sur l’inventaire actuel</p><p className="mt-2 text-[13px] leading-6 text-slate-600">Les résultats disponibles peuvent provenir de sources publiques ou autorisées. Aucun programme fictif n’est présenté comme actif pour remplir la page.</p></div></div></aside>
        </Container>
      </section>

      <section className="bg-white py-14 sm:py-20"><Container><div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[#DCE8F5] bg-[#F8FBFF] p-6"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#B7791F]">Vous êtes acheteur</p><h2 className="mt-3 text-xl font-extrabold text-[#0B1F3A]">Explorez les offres disponibles</h2><p className="mt-2 text-[13px] leading-6 text-slate-600">Filtrez les résultats, comparez leur niveau d’information et ouvrez leur source lorsqu’elle est disponible.</p><Link href="/search?transaction_type=new" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Ouvrir la recherche Neuf <ArrowRight size={13} /></Link></article>
        <article className="rounded-3xl border border-[#DCE8F5] bg-[#0B1F3A] p-6 text-white"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#F6D28B]">Vous êtes promoteur</p><h2 className="mt-3 text-xl font-extrabold">Structurez et présentez vos programmes</h2><p className="mt-2 text-[13px] leading-6 text-white/70">Découvrez l’expérience cible avant l’activation de vos données réelles et autorisées.</p><div className="mt-5 flex flex-wrap gap-4"><Link href="/demo/promoteur" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#F6D28B]">Voir la démo promoteur <ArrowRight size={13} /></Link><Link href="/promoteurs" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-white">Espace promoteurs <ArrowRight size={13} /></Link></div></article>
      </div></Container></section>

      <NeufFinalCTA />
      <SiteFooter />
    </main>
  );
}
