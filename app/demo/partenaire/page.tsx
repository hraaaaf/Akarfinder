import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Users, MapPin, Camera, LayoutTemplate, PhoneCall, CheckCircle2 } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { QualifiedDemandPreview } from "@/components/demand/QualifiedDemandPreview";
import { buildSearchDemandProfile } from "@/lib/demand/search-demand-profile";
import { EMPTY_SEARCH_PROFILE } from "@/lib/search-profile/search-profile-types";

export const metadata: Metadata = {
  title: "Kit partenaire — Démo AkarFinder",
  description:
    "Ce qu'un promoteur ou une agence doit fournir pour apparaître proprement sur AkarFinder : standard de fiche, plan 2D, photos autorisées, localisation, contact autorisé. Exemple fictif et non contractuel.",
  robots: { index: false, follow: false },
};

// Fictional demand shown to partners as "what you would receive".
const FICTIONAL_RECEIVED_DEMAND = buildSearchDemandProfile(
  {
    ...EMPTY_SEARCH_PROFILE,
    audience: "mre",
    project: "acheter",
    propertyType: "appartement",
    city: "Casablanca",
    neighborhood: "Anfa",
    budgetTotal: "2 000 000 - 2 800 000 (fictif)",
    purchaseHorizon: "Voyage prévu cet été (fictif)",
    minSurface: "100",
    bedrooms: "3",
    parking: true,
    securedResidence: true,
    neighborhoodNeeds: ["ecoles", "grands_axes"],
    priorities: ["quartier", "rapidite"],
  },
);

const PROMOTER_CHECKLIST = [
  "Identité du promoteur et autorisation écrite de diffusion",
  "Projets avec ville + zone approximative exploitable",
  "Typologies avec surfaces et fourchettes de prix (MAD)",
  "Plans 2D autorisés par typologie (ou disponibles sur demande)",
  "Photos autorisées avec droits d'usage précisés",
  "Calendrier indicatif des tranches et disponibilités",
  "Mode de contact autorisé (formulaire, page partenaire, téléphone)",
  "Date de mise à jour de chaque fiche",
];

const AGENCY_CHECKLIST = [
  "Identité de l'agence et autorisation écrite de diffusion",
  "Zones couvertes et spécialités",
  "Biens avec ville + quartier renseignés",
  "Prix exact ou fourchette (MAD) par bien",
  "Surface et pièces par bien",
  "Photos autorisées avec droits d'usage précisés",
  "Plan 2D optionnel (recommandé pour villas et grandes surfaces)",
  "Mode de contact autorisé et date de mise à jour",
];

const LOCATION_LEVELS = [
  { level: "Niveau 1 — Quartier uniquement", detail: "Ville + quartier. Suffisant pour apparaître en fiche structurée." },
  { level: "Niveau 2 — Zone approximative", detail: "Secteur précis sans adresse exacte. Recommandé pour les projets neufs." },
  { level: "Niveau 3 — Adresse exacte autorisée", detail: "Uniquement avec autorisation écrite explicite du partenaire." },
];

const STANDARD_PILLARS = [
  { icon: LayoutTemplate, title: "Standard de fiche", body: "Champs obligatoires : localisation exploitable, prix ou fourchette, surface, description normalisée, date de mise à jour." },
  { icon: MapPin, title: "Localisation 3 niveaux", body: "Quartier seul, zone approximative ou adresse exacte autorisée — le partenaire choisit son niveau." },
  { icon: Camera, title: "Photos autorisées", body: "Uniquement des photos dont le partenaire détient les droits, avec périmètre d'usage précisé." },
  { icon: LayoutTemplate, title: "Plan 2D", body: "Requis pour les programmes neufs (ou disponible sur demande). Optionnel mais recommandé pour les agences." },
  { icon: PhoneCall, title: "Contact autorisé", body: "Formulaire, page partenaire ou téléphone — affiché uniquement si le partenaire l'autorise." },
];

const BENEFITS = [
  "Fiches structurées et lisibles, jamais noyées dans un flux brut",
  "Demandes qualifiées : budget, zone, intention, urgence, non-négociables",
  "Pages partenaires enrichies (photos, plans 2D, contact) sous autorisation",
  "Lecture quartier, proximité et mobilité autour de vos biens",
  "Classement par pertinence : une fiche complète et à jour est mieux présentée",
];

export default function DemoPartenaireKitPage() {
  return (
    <DemoShell>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <DemoBadge className="mx-auto" />
          <h1 className="mt-4 text-[2rem] font-extrabold tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.6rem]">
            Le kit partenaire AkarFinder
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-slate-600">
            Voici le modèle à respecter pour apparaître proprement sur AkarFinder —
            promoteur ou agence. Exemple non contractuel, aucun envoi réel sur cette page.
          </p>
        </div>
      </section>

      {/* Standard pillars */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Le standard de fiche partenaire
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STANDARD_PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
                <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-[#0B63CE]/10 text-[#0B63CE]">
                  <p.icon size={16} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[13.5px] font-extrabold text-[#0B1F3A]">{p.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location levels */}
      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Localisation : trois niveaux au choix
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LOCATION_LEVELS.map((l) => (
              <div key={l.level} className="rounded-2xl border border-[#e4e9f2] bg-white p-5">
                <p className="text-[12px] font-extrabold text-[#0B63CE]">{l.level}</p>
                <p className="mt-2 text-[12.5px] leading-5 text-slate-500">{l.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklists */}
      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-6">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#0B63CE]" aria-hidden="true" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
                Checklist promoteur
              </h2>
            </div>
            <ul className="mt-4 grid gap-2">
              {PROMOTER_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-slate-600">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#e4e9f2] bg-white p-6">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#0B63CE]" aria-hidden="true" />
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
                Checklist agence
              </h2>
            </div>
            <ul className="mt-4 grid gap-2">
              {AGENCY_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-slate-600">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Example complete listing */}
      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            À quoi ressemble une fiche complète
          </h2>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Exemples fictifs, construits selon le standard partenaire.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href="/demo/bien" className="rounded-2xl border border-[#e4e9f2] bg-white p-5 transition hover:border-[#0B63CE]/40">
              <p className="text-[13.5px] font-extrabold text-[#0B1F3A]">Fiche bien enrichie</p>
              <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">Galerie cohérente, caractéristiques, quartier, mobilité.</p>
            </Link>
            <Link href="/demo/projet" className="rounded-2xl border border-[#e4e9f2] bg-white p-5 transition hover:border-[#0B63CE]/40">
              <p className="text-[13.5px] font-extrabold text-[#0B1F3A]">Projet promoteur</p>
              <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">Tranches, typologies, plans 2D, appartement témoin.</p>
            </Link>
            <Link href="/demo/agence" className="rounded-2xl border border-[#e4e9f2] bg-white p-5 transition hover:border-[#0B63CE]/40">
              <p className="text-[13.5px] font-extrabold text-[#0B1F3A]">Agence virtuelle</p>
              <p className="mt-1.5 text-[12.5px] leading-5 text-slate-500">Zones, spécialités, biens structurés au standard.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Example received demand */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Exemple de demande qualifiée reçue
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Ce qu&apos;un partenaire reçoit quand un utilisateur partage son profil de recherche — exemple fictif.
          </p>
          <div className="mt-4">
            <QualifiedDemandPreview demand={FICTIONAL_RECEIVED_DEMAND} />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#f8fafc] px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Ce que le partenaire y gagne
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12.5px] leading-5 text-slate-600">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0B63CE]" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] leading-5 text-slate-400">
            Sans promesse de volume ni garantie de résultats — AkarFinder n&apos;est pas partie à la transaction.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 text-center">
        <DemoRequestButton label="Demander une démonstration" className="mx-auto" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Link href="/pro" className="text-[12.5px] font-semibold text-[#0B63CE] underline underline-offset-2 hover:text-[#084BA8]">
            Voir l&apos;offre pro
          </Link>
          <Link href="/demo" className="text-[12.5px] font-semibold text-[#0B63CE] underline underline-offset-2 hover:text-[#084BA8]">
            Retour au mode exposition
          </Link>
        </div>
      </section>
    </DemoShell>
  );
}
