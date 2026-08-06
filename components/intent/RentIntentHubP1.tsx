import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Compass,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sofa,
  WalletCards,
} from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { Container } from "@/components/ui/Container";
import type { Listing } from "@/lib/listings/types";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import { getSearchTruthPresentation, isObservedExternalListing } from "@/lib/search/search-truth-tier";

type RentIntentHubP1Props = {
  listings: Listing[];
  totalListings: number | null;
};

const RENT_NEEDS = [
  { label: "Proche du travail", detail: "À qualifier avec une zone réelle", icon: BriefcaseBusiness },
  { label: "Pour la famille", detail: "Selon vos contraintes quotidiennes", icon: Home },
  { label: "Meublé", detail: "Activé uniquement quand documenté", icon: Sofa },
  { label: "Budget maîtrisé", detail: "Commencez par un plafond mensuel", icon: WalletCards },
] as const;

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"] as const;

const RENT_PROPERTY_TYPES = OPTION_A_PROPERTY_TYPES.filter((item) => item.value !== "land");

function resultHref(listing: Listing) {
  return isObservedExternalListing(listing) && listing.listing_url
    ? listing.listing_url
    : `/listings/${listing.id}`;
}

function RentPreviewCard({ listing }: { listing: Listing }) {
  const truth = getSearchTruthPresentation(listing);
  const external = isObservedExternalListing(listing);
  const href = resultHref(listing);

  return (
    <article className="min-w-[82%] snap-start rounded-2xl border border-[#D7E9F2] bg-white p-5 shadow-[0_14px_40px_rgba(8,64,92,0.08)] sm:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-[#D7E9F2] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{truth.label}</span>
        {listing.city ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><MapPin size={11} aria-hidden="true" />{listing.city}</span> : null}
      </div>
      <h3 className="mt-4 line-clamp-2 text-[15px] font-extrabold leading-5 text-[#0B1F3A]">{listing.title}</h3>
      <p className="mt-2 text-[1.25rem] font-extrabold tracking-[-0.03em] text-[#087E8B]">{formatPrice(listing.price, listing.currency)}<span className="ml-1 text-[11px] text-slate-500">/mois</span></p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] font-semibold text-slate-500">
        {listing.neighborhood ? <span>{listing.neighborhood}</span> : null}
        {listing.surface_m2 > 0 ? <span>{formatSurface(listing.surface_m2)}</span> : null}
        {listing.property_type ? <span>{listing.property_type}</span> : null}
      </div>
      <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#087E8B]">
        {external ? "Voir la source originale" : "Voir la fiche"}<ArrowRight size={13} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function RentIntentHubP1({ listings, totalListings }: RentIntentHubP1Props) {
  return (
    <main className="min-h-screen bg-white text-[#0B1F3A]">
      <SiteHeader compact />

      <section className="relative overflow-hidden border-b border-[#D7E9F2] bg-[radial-gradient(circle_at_85%_15%,rgba(8,126,139,0.15),transparent_28%),linear-gradient(135deg,#F5FCFD_0%,#EAF7F9_52%,#FFFFFF_100%)] py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#087E8B]">Louer au Maroc</p>
              <h1 className="mt-3 max-w-[820px] text-[2.45rem] font-extrabold leading-[1.02] tracking-[-0.052em] sm:text-[3.7rem] lg:text-[4.15rem]">Trouvez une location adaptée à votre quotidien.</h1>
              <p className="mt-5 max-w-[720px] text-[15px] leading-7 text-slate-600 sm:text-[16px]">Recherchez selon votre zone, votre budget mensuel et le type de logement, puis vérifiez les informations disponibles à la source.</p>

              <form action="/search" method="get" className="mt-8 rounded-[1.65rem] border border-[#CFE5EB] bg-white p-3 shadow-[0_24px_70px_rgba(8,64,92,0.12)] sm:p-4">
                <input type="hidden" name="transaction_type" value="rent" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="rounded-xl bg-[#F3F9FA] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Ville ou quartier</span><input name="q" placeholder="Hay Riad, Maarif…" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none placeholder:font-semibold placeholder:text-slate-400" /></label>
                  <label className="rounded-xl bg-[#F3F9FA] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Type de bien</span><select name="property_type" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none"><option value="">Tous les types</option><option value="apartment">Appartement</option><option value="villa">Villa</option><option value="office">Bureau</option><option value="riad">Riad</option></select></label>
                  <label className="rounded-xl bg-[#F3F9FA] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Budget mensuel max.</span><select name="max_price" defaultValue="" className="mt-1 w-full bg-transparent text-[13px] font-extrabold outline-none"><option value="">Sans limite</option><option value="4000">4 000 DH</option><option value="7000">7 000 DH</option><option value="12000">12 000 DH</option><option value="20000">20 000 DH</option></select></label>
                  <div className="rounded-xl bg-[#F3F9FA] px-3 py-2.5"><span className="block text-[11px] font-bold text-slate-500">Meublé / non meublé</span><p className="mt-1 text-[12px] font-extrabold text-slate-400">Dès que la donnée est fiable</p></div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#087E8B] px-5 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(8,126,139,0.22)]"><Search size={16} aria-hidden="true" />Rechercher une location</button>
                  <Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#CFE5EB] bg-white px-5 text-[14px] font-extrabold">Me laisser guider <Compass size={15} aria-hidden="true" /></Link>
                </div>
              </form>
            </div>

            <aside className="rounded-[2rem] border border-[#CFE5EB] bg-[#083E5A] p-6 text-white shadow-[0_26px_80px_rgba(8,62,90,0.24)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#91E1E8]">Votre quotidien d’abord</p>
              <div className="mt-5 space-y-3">
                {["Un plafond mensuel clair", "Une zone compatible avec vos trajets", "Un logement adapté à votre rythme", "Des charges et dates seulement si documentées"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-4 py-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#91E1E8]/15 text-[11px] font-extrabold text-[#91E1E8]">{index + 1}</span><span className="text-[12.5px] font-bold">{item}</span></div>)}
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#087E8B]">Commencer par votre besoin</p>
          <h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.6rem]">Qu’est-ce qui compte dans votre quotidien ?</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{RENT_NEEDS.map(({ label, detail, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#D7E9F2] bg-[#F5FBFC] p-5"><Icon size={19} className="text-[#087E8B]" aria-hidden="true" /><p className="mt-4 text-[13px] font-extrabold">{label}</p><p className="mt-2 text-[11.5px] leading-5 text-slate-500">{detail}</p></article>)}</div>
        </Container>
      </section>

      <section className="border-y border-[#D7E9F2] bg-[#F5FBFC] py-12 sm:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#087E8B]">Typologies</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Explorez les locations par type de bien</h2></div><Link href="/search?transaction_type=rent" className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#087E8B]">Tous les filtres <ArrowRight size={13} /></Link></div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{RENT_PROPERTY_TYPES.map((item) => <Link key={item.value} href={`/search?transaction_type=rent&property_type=${encodeURIComponent(item.value)}`} className="group overflow-hidden rounded-[1.45rem] border border-[#D7E9F2] bg-white p-2.5 shadow-[0_14px_36px_rgba(8,64,92,0.07)]"><div className="aspect-[16/10] overflow-hidden rounded-[1.05rem] bg-[#F5FBFC]"><PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative /></div><div className="mt-2.5 flex items-center justify-between gap-2 px-1 pb-1"><span className="text-[11.5px] font-extrabold">{item.pluralLabel}</span><span className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#E9F7F8] text-[#087E8B]">→</span></div></Link>)}</div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#087E8B]">Aperçu du moteur</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em] sm:text-[2.5rem]">Quelques locations actuellement disponibles</h2><p className="mt-2 text-[12.5px] text-slate-500">{totalListings && totalListings > 0 ? `${totalListings.toLocaleString("fr-FR")} résultats indexés correspondent à la location. ` : ""}Cet aperçu n’est pas un volume de marché garanti.</p></div><Link href="/search?transaction_type=rent" className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#087E8B]">Explorer les locations <ArrowRight size={13} /></Link></div>
          {listings.length ? <div className="mt-7 flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">{listings.slice(0, 6).map((listing) => <RentPreviewCard key={listing.id} listing={listing} />)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-[#D7E9F2] bg-[#F5FBFC] p-7 text-[13px] text-slate-500">Aucun aperçu structuré disponible ici pour le moment. Le moteur peut néanmoins rechercher des offres observées sur leurs sources originales.</div>}
        </Container>
      </section>

      <section className="border-y border-[#D7E9F2] bg-[#083E5A] py-12 text-white sm:py-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl bg-white/[0.07] p-6"><Building2 size={21} className="text-[#91E1E8]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Choisir une location adaptée</h2><p className="mt-3 text-[13px] leading-6 text-white/70">Comparez la zone, le budget, la surface et les contraintes qui influencent réellement votre quotidien.</p><Link href="/search?transaction_type=rent" className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#91E1E8]">Comparer les locations <ArrowRight size={13} /></Link></article>
            <article className="rounded-3xl bg-white/[0.07] p-6"><CalendarClock size={21} className="text-[#91E1E8]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Loyer, charges et disponibilité</h2><p className="mt-3 text-[13px] leading-6 text-white/70">AkarFinder affiche ces éléments uniquement lorsqu’ils sont documentés. Aucune charge ni date n’est estimée automatiquement.</p><Link href="/compagnon" className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#91E1E8]">Clarifier mes critères <ArrowRight size={13} /></Link></article>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-[#D7E9F2] bg-white p-6"><ShieldCheck size={21} className="text-[#087E8B]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Comprendre le niveau d’information</h2><div className="mt-4 space-y-3 text-[12.5px] leading-5 text-slate-600"><p><strong className="text-[#0B1F3A]">Analysé par AkarFinder</strong> — fiche structurée avec analyse disponible.</p><p><strong className="text-[#0B1F3A]">Analyse partielle</strong> — informations structurées mais incomplètes.</p><p><strong className="text-[#0B1F3A]">Offre observée</strong> — aperçu public à vérifier sur la source originale.</p></div></article>
            <article className="rounded-3xl border border-[#D7E9F2] bg-[#F5FBFC] p-6"><MapPin size={21} className="text-[#087E8B]" /><h2 className="mt-4 text-[1.65rem] font-extrabold">Explorer villes et quartiers</h2><div className="mt-4 flex flex-wrap gap-2">{CITIES.map((city) => <Link key={city} href={`/search?transaction_type=rent&q=${encodeURIComponent(city)}`} className="rounded-full border border-[#CFE5EB] bg-white px-3 py-2 text-[11.5px] font-extrabold">{city}</Link>)}</div><Link href="/map" className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#087E8B]">Explorer la carte <ArrowRight size={13} /></Link></article>
          </div>
        </Container>
      </section>

      <section className="border-t border-[#D7E9F2] bg-[linear-gradient(135deg,#083E5A,#087E8B)] py-12 text-white sm:py-16">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#BCEFF2]">Votre prochaine location</p><h2 className="mt-2 max-w-2xl text-[2rem] font-extrabold tracking-[-0.04em] sm:text-[2.7rem]">Trouvez une location qui correspond à votre quotidien.</h2></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Link href="/search?transaction_type=rent" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold text-[#083E5A]">Rechercher une location <Search size={15} aria-hidden="true" /></Link><Link href="/compagnon" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-[14px] font-extrabold">Me laisser guider <Compass size={15} aria-hidden="true" /></Link></div></div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
