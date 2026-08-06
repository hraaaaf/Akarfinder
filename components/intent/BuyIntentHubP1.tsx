import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Compass,
  Home,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { Container } from "@/components/ui/Container";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import { getSearchTruthPresentation, isObservedExternalListing } from "@/lib/search/search-truth-tier";

type BuyIntentHubP1Props = {
  listings: Listing[];
  totalListings: number | null;
};

const PROJECT_SHORTCUTS = [
  { label: "Résidence principale", href: "/search?transaction_type=buy&q=r%C3%A9sidence+principale", icon: Home },
  { label: "Investissement", href: "/search?transaction_type=buy&q=investissement", icon: TrendingUp },
  { label: "Neuf", href: "/neuf", icon: Sparkles },
  { label: "Terrain", href: "/search?transaction_type=buy&property_type=land", icon: MapPin },
] as const;

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

function resultHref(listing: Listing) {
  return isObservedExternalListing(listing) && listing.listing_url
    ? listing.listing_url
    : `/listings/${listing.id}`;
}

function BuyPreviewCard({ listing }: { listing: Listing }) {
  const truth = getSearchTruthPresentation(listing);
  const external = isObservedExternalListing(listing);
  const href = resultHref(listing);

  return (
    <article className="min-w-[82%] snap-start rounded-2xl border border-[#DCE8F5] bg-white p-5 shadow-[0_14px_40px_rgba(11,31,58,0.08)] sm:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-[#DCE8F5] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{truth.label}</span>
        {listing.city ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><MapPin size={11} aria-hidden="true" />{listing.city}</span> : null}
      </div>
      <h3 className="mt-4 line-clamp-2 text-[15px] font-extrabold leading-5 text-[#0B1F3A]">{listing.title}</h3>
      <p className="mt-2 text-[1.25rem] font-extrabold tracking-[-0.03em] text-[#0B63CE]">{formatPrice(listing.price, listing.currency)}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] font-semibold text-slate-500">
        {listing.neighborhood ? <span>{listing.neighborhood}</span> : null}
        {listing.surface_m2 > 0 ? <span>{formatSurface(listing.surface_m2)}</span> : null}
        {listing.property_type ? <span>{listing.property_type}</span> : null}
      </div>
      <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#0B63CE]">
        {external ? "Voir la source originale" : "Voir la fiche"}<ArrowRight size={13} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function BuyIntentHubP1({ listings, totalListings }: BuyIntentHubP1Props) {
  return (
    <main className="min-h-screen bg-white text-[#0B1F3A]">
      <SiteHeader compact />

      <section className="relative overflow-hidden border-b border-[#DCE8F5] bg-[radial-gradient(circle_at_85%_15%,rgba(183,121,31,0.14),transparent_28%),linear-gradient(135deg,#F7FBFF_0%,#EDF5FF_52%,#FFFFFF_100%)] py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#B7791F]">Acheter au Maroc</p>
              <h1 className="mt-3 max-w-[820px] text-[2.45rem] font-extrabold leading-[1.02] tracking-[-0.052em] sm:text-[3.7rem] lg:text-[4.15rem]">Trouvez le bien qui correspond vraiment à votre projet.</h1>
              <p className="mt-5 max-w-[720px] text-[15px] leading-7 text-slate-600 sm:text-[16px]">Explorez les biens à vendre selon votre ville, votre budget et votre projet, puis comparez les informations disponibles avant de décider.</p>

              <form action="/search" method="get" className="mt-8 rounded-[1.65rem] border border-[#D7E6F7] bg-white p-3 shadow-[0_24px_70px_rgba(11,31,58,0.12)] sm:p-4">
                <input type="hidden" name="transaction_type" value="buy" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Ville ou quartier</span><input name="q" placeholder="Agdal, Bouskoura…" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none placeholder:font-semibold placeholder:text-slate-400" /></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Type de bien</span><select name="property_type" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none"><option value="">Tous les types</option><option value="apartment">Appartement</option><option value="villa">Villa</option><option value="land">Terrain</option><option value="office">Bureau</option></select></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Budget maximum</span><select name="max_price" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none"><option value="">Sans limite</option><option value="1000000">1 000 000 DH</option><option value="2000000">2 000 000 DH</option><option value="4000000">4 000 000 DH</option><option value="8000000">8 000 000 DH</option></select></label>
                  <label className="rounded-xl bg-[#F6F9FC] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Votre projet</span><select name="q" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none"><option value="">Tous les projets</option><option value="résidence principale">Habiter</option><option value="investissement">Investir</option></select></label>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(11,99,206,0.22)]"><Search size={16} aria-hidden="true" />Rechercher un bien</button>
                  <Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D7E6F7] bg-white px-5 text-[14px] font-extrabold">Construire Mon Projet <Compass size={15} aria-hidden="true" /></Link>
                </div>
              </form>
            </div>

            <aside className="rounded-[2rem] border border-[#D7E6F7] bg-[#0B1F3A] p-6 text-white shadow-[0_26px_80px_rgba(11,31,58,0.24)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F6D28B]">Votre recherche, structurée</p>
              <div className="mt-5 space-y-3">
                {["Un budget clairement défini", "Des zones comparables", "Un objectif : habiter ou investir", "Des sources et informations explicites"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F6D28B]/15 text-[11px] font-extrabold text-[#F6D28B]">{index + 1}</span><span className="text-[12.5px] font-bold">{item}</span></div>)}
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <Container>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Commencer par votre projet</p>
          <h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.6rem]">Qu’est-ce que cet achat doit accomplir ?</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{PROJECT_SHORTCUTS.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="group rounded-2xl border border-[#DCE8F5] bg-[#F8FBFF] p-5 transition hover:-translate-y-0.5 hover:bg-white"><Icon size={19} className="text-[#B7791F]" aria-hidden="true" /><p className="mt-4 text-[13px] font-extrabold">{label}</p><span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-[#0B63CE]">Explorer <ArrowRight size={12} /></span></Link>)}</div>
        </Container>
      </section>

      <section className="border-y border-[#DCE8F5] bg-[#F8FBFF] py-12 sm:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Typologies</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Explorez par type de bien</h2></div><Link href="/search?transaction_type=buy" className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#0B63CE]">Tous les filtres <ArrowRight size={13} /></Link></div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{OPTION_A_PROPERTY_TYPES.map((item) => <Link key={item.value} href={`/search?transaction_type=buy&property_type=${encodeURIComponent(item.value)}`} className="group overflow-hidden rounded-[1.45rem] border border-[#DCE8F5] bg-white p-2.5 shadow-[0_14px_36px_rgba(11,31,58,0.07)]"><div className="aspect-[16/10] overflow-hidden rounded-[1.05rem] bg-[#F7FAFF]"><PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative /></div><div className="mt-2.5 flex items-center justify-between gap-2 px-1 pb-1"><span className="text-[11.5px] font-extrabold">{item.pluralLabel}</span><span className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#EEF6FF] text-[#0B63CE]">→</span></div></Link>)}</div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Aperçu du moteur</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Quelques biens actuellement disponibles</h2><p className="mt-2 text-[12.5px] text-slate-500">{totalListings && totalListings > 0 ? `${totalListings.toLocaleString("fr-FR")} résultats indexés correspondent à l’achat. ` : ""}Cet aperçu n’est pas un volume de marché garanti.</p></div><Link href="/search?transaction_type=buy" className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#0B63CE]">Explorer les biens à acheter <ArrowRight size={13} /></Link></div>
          {listings.length ? <div className="mt-7 flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">{listings.slice(0, 6).map((listing) => <BuyPreviewCard key={listing.id} listing={listing} />)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-[#DCE8F5] bg-[#F8FBFF] p-7 text-[13px] text-slate-500">Aucun aperçu structuré disponible ici pour le moment. Le moteur peut néanmoins rechercher des offres observées sur leurs sources originales.</div>}
        </Container>
      </section>

      <section className="border-y border-[#DCE8F5] bg-[#0B1F3A] py-12 text-white sm:py-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl bg-white/[0.07] p-6"><Home size={21} className="text-[#F6D28B]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Habiter</h2><p className="mt-3 text-[13px] leading-6 text-white/70">Priorisez le quotidien : localisation, surface, contraintes familiales et cohérence du budget global.</p><Link href="/search?transaction_type=buy&q=r%C3%A9sidence+principale" className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#F6D28B]">Chercher pour habiter <ArrowRight size={13} /></Link></article>
            <article className="rounded-3xl bg-white/[0.07] p-6"><TrendingUp size={21} className="text-[#F6D28B]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Investir</h2><p className="mt-3 text-[13px] leading-6 text-white/70">Comparez les zones, les prix observés et la qualité des informations sans transformer des signaux incomplets en promesses de rendement.</p><Link href="/search?transaction_type=buy&q=investissement" className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#F6D28B]">Explorer pour investir <ArrowRight size={13} /></Link></article>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Définir mon budget</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Un budget utile ne se limite pas au prix affiché.</h2><p className="mt-4 text-[13.5px] leading-7 text-slate-600">AkarFinder structure votre recherche autour du prix d’acquisition et de vos contraintes. Les frais annexes ou mensualités ne sont jamais inventés lorsqu’ils ne sont pas documentés.</p><Link href="/compagnon" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Construire mon budget dans Mon Projet <ArrowRight size={13} /></Link></div>
            <div className="grid gap-3 sm:grid-cols-3">{[{ icon: BadgeDollarSign, title: "Prix d’acquisition", text: "Définissez une limite comparable dans le moteur." }, { icon: Landmark, title: "Frais documentés", text: "Affichés uniquement lorsqu’une source fiable les précise." }, { icon: Compass, title: "Contraintes du projet", text: "Zones, surface et priorités restent liées à votre budget." }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#DCE8F5] bg-[#F8FBFF] p-5"><Icon size={19} className="text-[#B7791F]" /><h3 className="mt-4 text-[14px] font-extrabold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{text}</p></article>)}</div>
          </div>
        </Container>
      </section>

      <section className="border-y border-[#DCE8F5] bg-[#F8FBFF] py-12 sm:py-16">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#B7791F]">Explorer le Maroc</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Commencez par une ville, puis affinez par quartier.</h2><p className="mt-4 text-[13px] leading-6 text-slate-600">Les pages ville et la carte orientent la recherche. Les résultats restent séparés des repères géographiques.</p><Link href="/map" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#0B63CE]">Explorer la carte <ArrowRight size={13} /></Link></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{CITIES.map((city) => <Link key={city} href={`/search?transaction_type=buy&city=${encodeURIComponent(city)}`} className="rounded-xl border border-[#DCE8F5] bg-white px-4 py-4 text-[13px] font-extrabold text-[#315E8F]">{city}</Link>)}</div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <Container>
          <div className="rounded-3xl border border-[#DCE8F5] bg-white p-6 shadow-[0_18px_55px_rgba(11,31,58,0.08)] lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF6FF] text-[#0B63CE]"><ShieldCheck size={19} /></span><div><p className="text-[13px] font-extrabold">Niveau d’information explicite</p><p className="mt-1 text-[11.5px] text-slate-500">Pas un score de confiance inventé.</p></div></div>
            <div className="mt-5 grid gap-3 text-[12px] leading-5 text-slate-600 sm:grid-cols-3 lg:mt-0"><p><strong className="text-[#0B1F3A]">Analysé par AkarFinder</strong><br />Fiche structurée avec analyse disponible.</p><p><strong className="text-[#0B1F3A]">Analyse partielle</strong><br />Informations structurées mais incomplètes.</p><p><strong className="text-[#0B1F3A]">Offre observée</strong><br />Aperçu public à vérifier à la source.</p></div>
          </div>
        </Container>
      </section>

      <section className="bg-[#0B1F3A] py-14 text-white sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center"><Building2 size={24} className="mx-auto text-[#F6D28B]" /><h2 className="mt-5 text-[2rem] font-extrabold tracking-[-0.04em] sm:text-[3rem]">Votre projet d’achat mérite une recherche mieux structurée.</h2><p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-white/70">Passez directement au moteur ou construisez d’abord vos critères, votre budget et vos zones prioritaires.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/search?transaction_type=buy" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-6 text-[14px] font-extrabold text-white">Rechercher un bien <ArrowRight size={15} /></Link><Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-[14px] font-extrabold text-white">Construire Mon Projet <Compass size={15} /></Link></div></div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
