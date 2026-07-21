import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Camera,
  Eye,
  FileText,
  Home,
  Info,
  Megaphone,
  ShieldCheck,
  Tag,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { TrackedLink } from "@/components/tracking/TrackedLink";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { searchListings } from "@/lib/search";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";

const SELLER_STEPS = [
  {
    icon: FileText,
    title: "Décrire votre bien",
    text: "Type, localisation, surfaces, état et caractéristiques déclarées.",
  },
  {
    icon: Camera,
    title: "Préparer les éléments utiles",
    text: "Photos, documents et informations à confirmer avant publication.",
  },
  {
    icon: BarChart2,
    title: "Comparer avec des données disponibles",
    text: "Repères de marché et annonces observées uniquement lorsqu'une source exploitable existe.",
  },
  {
    icon: Megaphone,
    title: "Choisir votre diffusion",
    text: "Préparer une mise en vente cohérente sans promesse de visibilité ou de délai.",
  },
];

const DATA_RULES = [
  {
    icon: ShieldCheck,
    title: "Pas d'estimation inventée",
    text: "Aucun montant n'est affiché tant qu'il n'est pas calculable à partir de données réellement disponibles.",
  },
  {
    icon: Eye,
    title: "Pas de vues simulées",
    text: "Les chiffres de visibilité ne sont affichés que lorsqu'ils proviennent de mesures réelles.",
  },
  {
    icon: Home,
    title: "Comparables réels uniquement",
    text: "Les annonces présentées ci-dessous proviennent du moteur de recherche, pas d'un jeu de démonstration.",
  },
  {
    icon: Tag,
    title: "Pas de faux acheteurs",
    text: "Aucun profil ou demande n'est affiché s'il ne correspond pas à une demande réellement reçue.",
  },
];

export async function VendrePageShell() {
  let observedListings: Listing[] = [];
  try {
    const result = await searchListings({ transaction_type: "buy", limit: 3 });
    observedListings = result.listings ?? [];
  } catch {
    observedListings = [];
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <section className="relative overflow-hidden bg-surface pb-12 pt-8 sm:pb-16 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 70% at 80% 20%, rgba(34,72,132,0.28) 0%, transparent 65%)",
          }}
        />
        <Container className="relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-bronze-500/70" aria-hidden="true" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-bronze-400">
                Vendre
              </p>
            </div>
            <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.6rem]">
              Préparez votre vente avec
              <span className="block text-bronze-400">des données que nous pouvons justifier.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              AkarFinder vous aide à structurer votre dossier vendeur et à comparer votre bien avec des
              informations réellement disponibles. Quand une donnée manque, nous préférons l'indiquer plutôt
              que l'inventer.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <TrackedLink
                href="/vendre/dossier"
                event={{
                  event_name: "seller_cta_click",
                  source_page: "/vendre",
                  source_channel: "seller",
                  intent: "vendre",
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)]"
              >
                Préparer ma vente
                <ArrowRight size={14} aria-hidden="true" />
              </TrackedLink>
              <Link
                href="#comparables"
                className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-surface-muted px-5 py-3 text-[13.5px] font-extrabold"
              >
                Voir les annonces observées
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-5 inline-flex items-start gap-2 rounded-xl border border-border/15 bg-card px-4 py-3 text-[12px] leading-5 text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0 text-bronze-400" aria-hidden="true" />
              Aucune estimation personnalisée, demande acheteur ou statistique de visibilité n'est affichée
              sans donnée réelle correspondante.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-background py-12 lg:py-16">
        <Container>
          <div className="max-w-2xl">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
              Préparation vendeur
            </p>
            <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">
              Ce que vous pouvez préparer dès maintenant
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              Ces étapes sont générales et ne supposent aucune estimation ni demande commerciale inexistante.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SELLER_STEPS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-border/15 bg-card p-5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-bronze-500/12 text-bronze-400">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[14px] font-extrabold">{title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface py-12 lg:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
                Intégrité des données
              </p>
              <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">
                Ce qu'AkarFinder ne fabrique pas
              </h2>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted-foreground">
                Une donnée absente reste absente. Les repères chiffrés seront affichés seulement lorsqu'ils
                peuvent être reliés à une source ou à un calcul documenté.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DATA_RULES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border/15 bg-card p-4">
                  <Icon size={16} className="text-bronze-400" aria-hidden="true" />
                  <p className="mt-3 text-[13px] font-extrabold">{title}</p>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="comparables" className="bg-background py-12 lg:py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
                Données observées
              </p>
              <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">
                Annonces de vente observées récemment
              </h2>
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                Aperçu issu du moteur AkarFinder. Ce ne sont pas des biens fictifs ni une estimation de votre bien.
              </p>
            </div>
            <Link href="/search?transaction_type=buy" className="text-[12.5px] font-extrabold text-bronze-400">
              Explorer la recherche →
            </Link>
          </div>

          {observedListings.length > 0 ? (
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {observedListings.map((listing) => (
                <article key={listing.id} className="overflow-hidden rounded-2xl border border-border/15 bg-card">
                  <div className="relative h-40 overflow-hidden">
                    <ListingVisual listing={listing} className="h-full w-full" />
                  </div>
                  <div className="p-4">
                    <p className="text-[1.05rem] font-extrabold text-bronze-400">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                    <h3 className="mt-2 line-clamp-1 text-[12.5px] font-extrabold">{listing.title}</h3>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">
                      {listing.city}
                      {listing.neighborhood ? ` · ${listing.neighborhood}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-border/15 pt-3 text-[11px] font-semibold text-muted-foreground">
                      {listing.surface_m2 > 0 ? <span>{formatSurface(listing.surface_m2)}</span> : null}
                      {listing.price_per_m2 != null && listing.price_per_m2 > 0 ? (
                        <span>{listing.price_per_m2.toLocaleString("fr-FR")} DH/m²</span>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-border/15 bg-card p-6">
              <p className="text-[13px] font-extrabold">Aucune annonce comparable disponible pour le moment.</p>
              <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
                Nous n'affichons pas de faux exemples pour remplir cette section.
              </p>
            </div>
          )}
        </Container>
      </section>

      <section className="bg-surface py-14 lg:py-18">
        <Container>
          <div className="rounded-[24px] border border-border/15 bg-card p-7 sm:p-9">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-bronze-400">
              Prochaine étape
            </p>
            <h2 className="mt-3 text-[1.7rem] font-extrabold tracking-[-0.04em]">
              Préparez votre dossier vendeur
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted-foreground">
              Renseignez les informations réelles de votre bien. Les futurs repères seront calculés uniquement
              à partir des données disponibles et clairement qualifiés lorsqu'ils sont indicatifs.
            </p>
            <Link
              href="/vendre/dossier"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white"
            >
              Préparer ma vente
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
