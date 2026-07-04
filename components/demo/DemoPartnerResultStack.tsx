// PARTNER-RANKING-POLICY-MVP-1 — this stack is now a live demonstration of
// the isolated partner ranking engine (lib/partners/partner-ranking-policy).
// Fictional candidates only; the order displayed is computed, not hardcoded.
// The live Search Gateway remains untouched.
import { ArrowRight, ExternalLink } from "lucide-react";
import { DemoBadge } from "./DemoBadge";
import {
  rankPartnerResults,
  type PartnerRankingCandidate,
} from "@/lib/partners/partner-ranking-policy";
import type { PartnerAuthorizationSource } from "@/lib/partners/partner-quality-score-types";
import {
  FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
  FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
} from "@/lib/partners/partner-listing-examples";

// Fictional demo intent: family purchase in Casablanca, Racine district.
const DEMO_INTENT = { transaction: "sale", city: "Casablanca", district: "Racine" } as const;

const DEMO_CANDIDATES: PartnerRankingCandidate[] = [
  {
    id: "demo-partner-page",
    source: "partner_authorized",
    descriptor: {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      transaction_type: "sale",
      city: "Casablanca",
      district: "Racine",
    },
  },
  {
    id: "demo-promoter",
    source: "promoter_partner",
    descriptor: {
      ...FICTIONAL_PROMOTER_DEMO_CASABLANCA_PROJECT,
      district: "Bouskoura",
    },
  },
  {
    id: "demo-agency-premium",
    source: "agency_premium",
    descriptor: {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      transaction_type: "sale",
      city: "Casablanca",
      district: "Maarif",
      floor_plan_authorized: false,
      floor_plan_available: false,
      floor_plan_type: "none",
      floor_plan_display_mode: "hidden",
    },
  },
  {
    id: "demo-agency-standard",
    source: "agency_partner",
    descriptor: {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      partner_tier: "agency_partner",
      transaction_type: "sale",
      city: "Casablanca",
      district: "Gauthier",
      photos_authorized: false,
      photo_count: 0,
      media_usage_scope: "none",
    },
  },
  {
    id: "demo-web-external",
    source: "web_external",
    descriptor: {
      transaction_type: "sale",
      property_type: "apartment",
      city: "Casablanca",
    },
  },
];

const CARD_COPY: Record<PartnerAuthorizationSource, { label: string; title: string; body: string }> = {
  partner_authorized: {
    label: "Page partenaire autorisee",
    title: "Appartement familial - partenaire demo",
    body: "Fiche enrichie avec localisation exploitable, photos autorisees et CTA partenaire.",
  },
  promoter_partner: {
    label: "Promoteur partenaire",
    title: "Programme neuf avec typologies et plans 2D",
    body: "Projet pertinent pour une recherche neuf, avec plan indicatif et brochure demo.",
  },
  agency_premium: {
    label: "Agence premium",
    title: "Agence pertinente pour achat classique",
    body: "Contact autorise et bien structure selon le standard AkarFinder.",
  },
  agency_partner: {
    label: "Agence partenaire",
    title: "Fiche structuree a completer",
    body: "Informations utiles mais moins enrichies qu'une page partenaire complete.",
  },
  web_external: {
    label: "Resultat web externe",
    title: "Apercu limite depuis une source originale",
    body: "Sans image, sans contact affiche, redirection vers la source originale.",
  },
  first_party: {
    label: "Contenu AkarFinder",
    title: "Repere structure AkarFinder",
    body: "Contenu propre AkarFinder, indicatif et non contractuel.",
  },
};

export function DemoPartnerResultStack() {
  const ranked = rankPartnerResults(DEMO_CANDIDATES, DEMO_INTENT);

  return (
    <section className="rounded-3xl border border-[#dbe7f6] bg-white p-5 shadow-[0_14px_40px_rgba(15,35,65,0.07)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <DemoBadge />
          <h2 className="mt-3 text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A]">
            Comment AkarFinder peut organiser les resultats
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-500">
            Cette section illustre une logique future d&apos;affichage — l&apos;ordre ci-dessous est
            calcule par le moteur de classement partenaire sur des exemples fictifs. Les resultats
            web externes restent consultables via leur source originale.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {ranked.map((result, index) => {
          const copy = CARD_COPY[result.source];
          const isExternal = !result.is_partner;
          return (
            <article
              key={result.id}
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                isExternal
                  ? "border-slate-200 bg-slate-50"
                  : "border-[#0B63CE]/20 bg-[#f8fbff]"
              }`}
            >
              <span className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold ${
                isExternal ? "bg-slate-200 text-slate-600" : "bg-[#0B63CE] text-white"
              }`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">{copy.label}</p>
                <h3 className="mt-1 text-[14px] font-extrabold text-[#0B1F3A]">{copy.title}</h3>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">{copy.body}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE]">
                {result.display.mustLinkOriginalSource ? "Voir la source originale" : "CTA enrichi"}
                {result.display.mustLinkOriginalSource
                  ? <ExternalLink size={13} aria-hidden="true" />
                  : <ArrowRight size={13} aria-hidden="true" />}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
