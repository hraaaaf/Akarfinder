import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarDays, Home, MapPin, MessageCircle, Users } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { DemoAgencyListingCard } from "@/components/demo/DemoAgencyListingCard";
import { DemoPartnerContactPanel } from "@/components/demo/DemoPartnerContactPanel";
import { DemoPartnerLeadPreview } from "@/components/demo/DemoPartnerLeadPreview";
import { DEMO_PARTNER_AGENCY_EXPERIENCE } from "@/lib/demo/partner-pages-demo-data";

export const metadata: Metadata = {
  title: "Agence virtuelle partenaire - Demo AkarFinder",
  description: "Experience demo d'une agence partenaire premium avec biens structures et demandes qualifiees fictives.",
  robots: { index: false, follow: false },
};

export default function DemoAgencyPage() {
  const agency = DEMO_PARTNER_AGENCY_EXPERIENCE;

  return (
    <DemoShell>
      <section className="bg-gradient-to-b from-[#edf5ff] via-white to-white px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <DemoBadge />
            <p className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">
              Agence premium - mode demo
            </p>
            <h1 className="mt-3 text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-[#0B1F3A] sm:text-[3rem]">
              {agency.agencyName}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
              {agency.tagline} Aucun partenaire reel represente, aucun message reel envoye.
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-500">
              <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
              Zones couvertes demo : {agency.zones.join(", ")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <DemoRequestButton label="Demander contact demo" />
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]"
              >
                <MessageCircle size={15} aria-hidden="true" />
                WhatsApp autorise dans une version partenaire reelle
              </button>
            </div>
          </div>
          <DemoPartnerContactPanel title="Contact agence demo" mode="agency" />
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#dbe7f6] bg-[#f8fbff] p-5">
          <p className="text-[13px] font-semibold leading-6 text-slate-600">
            Contact affiche uniquement si autorise par l&apos;agence partenaire. Dans cette demo, les boutons sont visuels et ne declenchent aucun envoi.
          </p>
        </div>
      </section>

      <Section eyebrow="Zones couvertes" title="Une agence lisible par quartier">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {agency.zones.map((zone) => (
            <article key={zone} className="rounded-2xl border border-[#dbe7f6] bg-white p-4 text-center">
              <MapPin size={17} className="mx-auto text-[#0B63CE]" aria-hidden="true" />
              <p className="mt-2 text-[13px] font-extrabold text-[#0B1F3A]">{zone}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Specialites" title="Des besoins mieux qualifies">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {agency.specialties.map((specialty) => (
            <article key={specialty} className="rounded-2xl border border-[#dbe7f6] bg-white p-4">
              <Home size={17} className="text-[#0B63CE]" aria-hidden="true" />
              <p className="mt-3 text-[13px] font-extrabold text-[#0B1F3A]">{specialty}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Biens structures" title="Fiches agence selon le standard AkarFinder">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {agency.listings.map((listing) => (
            <DemoAgencyListingCard key={listing.title} {...listing} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Agence virtuelle" title="Ce que l'agence peut organiser">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-2xl border border-[#dbe7f6] bg-white p-6 shadow-[0_10px_28px_rgba(15,35,65,0.06)]">
            <DemoBadge />
            <h3 className="mt-4 text-[18px] font-extrabold text-[#0B1F3A]">{agency.advisor.name}</h3>
            <p className="mt-1 text-[13px] font-semibold text-[#0B63CE]">{agency.advisor.role}</p>
            <p className="mt-3 text-[12.5px] leading-6 text-slate-500">{agency.advisor.note}</p>
          </article>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarDays, title: "Prise de rendez-vous demo", body: "Selection de creneau fictive, sans envoi." },
              { icon: Users, title: "Collecte besoin acheteur", body: "Budget, quartier, horizon et type de bien." },
              { icon: Building2, title: "Collecte bien vendeur", body: "Preparation d'un dossier vendeur demo." },
              { icon: MessageCircle, title: "Suivi demande qualifiee", body: "Contact autorise dans une version partenaire reelle." },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#dbe7f6] bg-white p-5">
                <item.icon size={18} className="text-[#0B63CE]" aria-hidden="true" />
                <h3 className="mt-3 text-[14px] font-extrabold text-[#0B1F3A]">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="Demandes qualifiees demo" title="Ce que l'agence pourrait recevoir">
        <DemoPartnerLeadPreview leads={agency.qualifiedRequests} />
      </Section>

      <section className="bg-[#f8fafc] px-4 py-14">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#dbe7f6] bg-white p-6 text-center shadow-[0_12px_36px_rgba(15,35,65,0.06)]">
          <DemoBadge className="mx-auto" />
          <h2 className="mt-4 text-[1.5rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A]">
            Confier un bien a une agence partenaire - demo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-slate-500">
            Exemple de parcours vendeur sans backend. Aucun dossier reel n&apos;est cree.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DemoRequestButton label="Demander demonstration agence" />
            <Link href="/demo/bien" className="rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
              Voir fiche bien enrichie
            </Link>
            <Link href="/demo" className="rounded-xl border border-[#dbe7f6] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A]">
              Retour hub demo
            </Link>
          </div>
        </div>
      </section>
    </DemoShell>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-12 odd:bg-white even:bg-[#f8fafc]">
      <div className="mx-auto max-w-6xl">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">{eyebrow}</p>
        <h2 className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.035em] text-[#0B1F3A]">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
