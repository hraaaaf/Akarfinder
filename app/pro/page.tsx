import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  Star,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { ProLeadForm } from "@/components/pro/ProLeadForm";

export const metadata: Metadata = {
  title: "AkarFinder Pro — Développez vos ventes immobilières au Maroc",
  description:
    "Présentez vos biens, recevez des leads qualifiés et gagnez en visibilité auprès des acheteurs au Maroc et des MRE. Offre pilote pour agences, promoteurs et exposants Sakan Expo.",
};

// ── Hero ─────────────────────────────────────────────────────────────────────

function ProHero() {
  return (
    <section className="relative overflow-hidden bg-deepblue pb-20 pt-16 lg:pb-28 lg:pt-24">
      {/* subtle decorative gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(155,120,56,0.18),transparent)]"
      />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-bronze-500/40 bg-bronze-700/15 px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">
            AkarFinder Pro
          </span>

          <h1 className="mt-5 text-[2.2rem] font-extrabold leading-tight tracking-[-0.045em] text-white sm:text-[3rem] lg:text-[3.6rem]">
            Développez vos ventes avec{" "}
            <span className="text-bronze-400">AkarFinder Pro</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[1.05rem] leading-7 text-white/72 sm:text-[1.15rem]">
            Présentez vos biens, recevez des leads qualifiés et gagnez en
            visibilité auprès des acheteurs au Maroc et des MRE.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-xl bg-bronze-700 px-6 py-3.5 text-[14.5px] font-extrabold text-white shadow-[0_8px_22px_rgba(155,120,56,0.38)] transition hover:bg-bronze-600 active:scale-[0.98]"
            >
              Demander un accès Pro
              <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
            </a>
            <a
              href="#offres"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-6 py-3.5 text-[14.5px] font-extrabold text-white/90 transition hover:border-white/35 hover:bg-white/14"
            >
              Voir l&apos;offre Sakan Expo
            </a>
          </div>

          <div className="mt-4">
            <a
              href="/demo"
              className="text-[12.5px] font-semibold text-white/45 underline underline-offset-2 transition hover:text-white/70"
            >
              Voir une démonstration
            </a>
          </div>

          {/* target audience chips */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[12.5px] text-white/56">
            {["Agences premium", "Promoteurs", "Exposants Sakan Expo"].map((a) => (
              <span key={a} className="rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 font-semibold">
                {a}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

// ── Value props ───────────────────────────────────────────────────────────────

const VALUE_CARDS = [
  {
    icon: Users,
    title: "Leads qualifiés",
    body: "Recevez des contacts avec budget, ville cible, type de bien et statut MRE — pas des clics anonymes.",
    accent: "text-emerald-400",
    bg: "bg-emerald-900/20 border-emerald-700/30",
  },
  {
    icon: LayoutGrid,
    title: "Annonces enrichies",
    body: "Vos biens sont structurés, déduplicés et affichés avec complétude et niveau d'information visibles.",
    accent: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-700/30",
  },
  {
    icon: Star,
    title: "Package Score visible",
    body: "Vos projets bénéficient du score de package AkarFinder : fiabilité, proximité et repère de prix.",
    accent: "text-bronze-400",
    bg: "bg-bronze-900/20 border-bronze-700/30",
  },
  {
    icon: Building2,
    title: "Sakan Expo digital",
    body: "Prolongez votre présence Sakan Expo en ligne : projet, brochure, QR tracking et leads digitaux.",
    accent: "text-purple-400",
    bg: "bg-purple-900/20 border-purple-700/30",
  },
];

function ValueProps() {
  return (
    <section className="bg-deepblue pb-16 pt-2 lg:pb-20">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_CARDS.map(({ icon: Icon, title, body, accent, bg }) => (
            <div
              key={title}
              className={`rounded-[1.4rem] border p-6 ${bg}`}
            >
              <div className={`mb-3 w-fit rounded-xl p-2.5 ${bg}`}>
                <Icon size={22} strokeWidth={2} className={accent} aria-hidden="true" />
              </div>
              <h3 className="text-[1rem] font-extrabold text-white">{title}</h3>
              <p className="mt-2 text-[13.5px] leading-6 text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Importez ou envoyez vos biens",
    body: "Partagez vos listings, projets et photos via notre processus d'intégration dédié. Aucun accès public autonome sans validation qualité.",
  },
  {
    num: "02",
    title: "AkarFinder analyse et structure les annonces",
    body: "Chaque bien est enrichi, déduplicé et scoré. Les photos suivent notre politique d'autorisation. Le niveau d'information est calculé automatiquement.",
  },
  {
    num: "03",
    title: "Recevez des demandes qualifiées",
    body: "Les acheteurs intéressés vous contactent via WhatsApp avec budget, timing et statut MRE. Vous recevez uniquement des contacts ayant exprimé un intérêt réel.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-[#fffdf8] py-16 lg:py-20">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-700">
            Comment ça marche
          </p>
          <h2 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[2.2rem]">
            Trois étapes simples
          </h2>
        </div>

        <div className="mx-auto max-w-4xl">
          {STEPS.map((step) => (
            <div key={step.num} className="flex items-start gap-5 py-6 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#f0e6d2]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-deepblue text-[1.1rem] font-extrabold text-bronze-400">
                {step.num}
              </div>
              <div className="min-w-0 pt-1">
                <h3 className="text-[1.05rem] font-extrabold text-deepblue">{step.title}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-gray-600">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ── Offers ────────────────────────────────────────────────────────────────────

const OFFERS = [
  {
    id: "agence",
    badge: "Offre pilote",
    title: "Agence Pro",
    price: "Sur devis",
    description: "Pour les agences immobilières qui souhaitent afficher leurs biens avec fiabilité, recevoir des leads qualifiés et bénéficier d'une visibilité sponsorisée clairement labellisée.",
    features: [
      "Intégration de vos listings (processus manuel pilote)",
      "Score de fiabilité et package score visibles",
      "Leads acheteurs qualifiés avec budget et ville",
      "Label « Annonce sponsorisée » toujours affiché",
      "Visibilité MRE incluse",
    ],
    accent: "border-[#1D4774] bg-[#f0f6ff]",
    badgeStyle: "bg-[#1D4774] text-white",
  },
  {
    id: "promoteur",
    badge: "Offre pilote",
    title: "Promoteur Pro",
    price: "Sur devis",
    description: "Pour les promoteurs avec des projets neufs et VEFA. Présentation complète du projet, typologies, leads et connexion Sakan Expo digital.",
    features: [
      "Page projet dédiée (typologies, prix indicatifs, brochure)",
      "Leads acheteurs intéressés par le neuf",
      "Connexion Sakan Expo digital (tracking QR)",
      "Score de fiabilité projet visible",
      "Process de validation avant publication",
    ],
    accent: "border-[#065f46] bg-[#f0fdf4]",
    badgeStyle: "bg-[#065f46] text-white",
    featured: true,
  },
  {
    id: "sakan-expo",
    badge: "Sur devis",
    title: "Sakan Expo Digital",
    price: "Sur devis",
    description: "Pour les exposants du salon Sakan Expo qui souhaitent prolonger leur présence en ligne avant, pendant et après le salon.",
    features: [
      "Profil exposant visible sur AkarFinder",
      "Leads issus du trafic MRE et acheteurs",
      "QR code de tracking salon",
      "Statistiques de visibilité indicatives",
      "Démo pilote avant lancement officiel",
    ],
    accent: "border-[#4c1d95] bg-[#faf5ff]",
    badgeStyle: "bg-[#4c1d95] text-white",
  },
];

function Offers() {
  return (
    <section id="offres" className="bg-white py-16 lg:py-20">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-700">
            Nos offres
          </p>
          <h2 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[2.2rem]">
            Une offre adaptée à votre profil
          </h2>
          <p className="mt-3 text-[14.5px] leading-7 text-gray-500">
            Toutes les offres sont en phase pilote. Les tarifs sont définis au cas par cas
            pendant le lancement.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {OFFERS.map((offer) => (
            <div
              key={offer.id}
              className={`relative flex flex-col rounded-[1.4rem] border-2 p-7 shadow-[0_8px_28px_rgba(7,27,51,0.06)] ${offer.accent}`}
            >
              {offer.featured ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-deepblue px-4 py-1.5 text-[11.5px] font-extrabold text-bronze-400 shadow-md">
                    Recommandé
                  </span>
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-extrabold ${offer.badgeStyle}`}>
                    {offer.badge}
                  </span>
                  <h3 className="mt-3 text-[1.35rem] font-extrabold text-deepblue">{offer.title}</h3>
                </div>
                <p className="mt-2 shrink-0 text-[1.1rem] font-extrabold text-deepblue/60">
                  {offer.price}
                </p>
              </div>

              <p className="mt-3 text-[13.5px] leading-6 text-gray-600">{offer.description}</p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {offer.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-gray-700">
                    <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-deepblue px-5 py-3.5 text-[14px] font-extrabold text-white transition hover:bg-deepblue-700"
              >
                Demander une démo
                <ChevronRight size={15} strokeWidth={2.6} aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ── Trust rules ───────────────────────────────────────────────────────────────

const TRUST_RULES = [
  "Les annonces sponsorisées restent clairement labellisées — aucune confusion possible avec les résultats organiques.",
  "Le niveau d'information AkarFinder n'est jamais masqué par un paiement. La transparence envers l'acheteur est non négociable.",
  "Les photos réelles sont affichées uniquement si l'autorisation de la source est confirmée. Sinon, un visuel illustratif est utilisé.",
  "Aucun badge de statut spécial sans processus réel de validation. Tout indicateur sera déployé uniquement avec un processus documenté et auditable.",
];

function TrustRules() {
  return (
    <section className="bg-[#fffdf8] py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-700">
              Nos engagements
            </p>
            <h2 className="mt-3 text-[1.8rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[2.2rem]">
              Règles non négociables
            </h2>
          </div>

          <div className="space-y-3">
            {TRUST_RULES.map((rule) => (
              <div
                key={rule}
                className="flex items-start gap-4 rounded-[1.2rem] border border-[#eadfca] bg-white p-5 shadow-[0_4px_14px_rgba(7,27,51,0.04)]"
              >
                <BadgeCheck
                  size={22}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-bronze-700"
                  aria-hidden="true"
                />
                <p className="text-[14px] leading-6 text-gray-700">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

// ── Internal inbox CTA ───────────────────────────────────────────────────────

function InboxCTA() {
  return (
    <section className="border-t border-[#eadfca] bg-white py-10">
      <Container>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-[1.4rem] border border-[#d8c8a3] bg-[#fffdf8] px-6 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
              Équipe interne
            </p>
            <p className="mt-1 text-[15px] font-extrabold text-deepblue">
              Boîte de réception leads acheteurs
            </p>
            <p className="mt-0.5 text-[13px] text-gray-500">
              Dossiers indicatifs soumis via l&apos;onboarding acheteur.
            </p>
          </div>
          <a
            href="/pro/leads"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-bronze-700/40 bg-white px-4 py-2.5 text-[13px] font-extrabold text-bronze-700 transition hover:border-bronze-700/70 hover:bg-[#fef8ed]"
          >
            Voir la boîte réception
            <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
          </a>
        </div>
      </Container>
    </section>
  );
}

// ── Metrics strip ─────────────────────────────────────────────────────────────

function MetricsStrip() {
  return (
    <section className="border-y border-[#eadfca] bg-white py-10">
      <Container>
        <div className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
          {[
            { value: "Multi-sources", label: "Résultats web agrégés" },
            { value: "WhatsApp-first", label: "Canal de contact privilégié" },
            { value: "MRE", label: "Segment diaspora marocaine" },
            { value: "Offre pilote", label: "Phase de lancement" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[1.8rem]">
                {value}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <SiteHeader variant="dark" />
      <ProHero />
      <ValueProps />
      <MetricsStrip />
      <HowItWorks />
      <Offers />
      <TrustRules />
      <InboxCTA />
      <ProLeadForm />
      <SiteFooter />
    </main>
  );
}
