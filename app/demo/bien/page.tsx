import type { Metadata } from "next";
import Link from "next/link";
import { Bed, Bath, Ruler, Building2, ShieldCheck, MapPin, Car } from "lucide-react";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { DemoRequestButton } from "@/components/demo/DemoRequestButton";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { DemoScoreCard } from "@/components/demo/DemoScoreCard";
import { DemoNearbyPlaces } from "@/components/demo/DemoNearbyPlaces";
import { DEMO_PROPERTY_DETAIL } from "@/lib/demo/demo-data";

export const metadata: Metadata = {
  title: "Exemple fiche bien enrichie — Démo AkarFinder",
  description: "Aperçu illustratif d'une fiche bien enrichie, inspirée de l'expérience détaillée d'un portail immobilier moderne, adaptée au Maroc.",
  robots: { index: false, follow: false },
};

const MOBILITY_ICONS: Record<string, typeof Car> = {
  Voiture: Car,
  Tram: Building2,
  Taxi: Car,
  Marche: MapPin,
  Stationnement: Car,
};

export default function DemoPropertyDetailPage() {
  const p = DEMO_PROPERTY_DETAIL;

  return (
    <DemoShell>
      {/* A. Header fiche bien */}
      <section className="bg-gradient-to-b from-[#eef4ff] to-white px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <DemoBadge />
          <h1 className="mt-4 text-[1.7rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A] sm:text-[2.3rem]">
            {p.title}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
            <MapPin size={14} className="text-[#0B63CE]" aria-hidden="true" />
            {p.district}, {p.city}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="text-[1.5rem] font-extrabold text-[#0B63CE]">{p.priceLabel}</span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              <Ruler size={14} aria-hidden="true" /> 118 m²
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              <Bed size={14} aria-hidden="true" /> 3 ch.
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              <Bath size={14} aria-hidden="true" /> 2 SDB
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <DemoRequestButton label="Demander une démonstration" />
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e4e9f2] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A] transition hover:border-[#0B63CE]/40"
            >
              Retour au mode exposition
            </Link>
          </div>
        </div>
      </section>

      {/* B. Galerie visuelle locale */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {p.visuals.map((v) => (
              <PropertyVisual key={v} type={v} ratio="4:3" className="rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      {/* C. Résumé du bien */}
      <section className="bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#0B63CE]">
            Ce que cette fiche pourrait aider à comprendre
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "Le positionnement indicatif du bien",
              "La lecture du quartier",
              "Les commodités proches",
              "Les points à vérifier avant contact",
              "Des repères indicatifs de mobilité",
            ].map((item) => (
              <li key={item} className="text-[12.5px] text-slate-600">• {item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* D. Caractéristiques principales */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Caractéristiques principales
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {p.specs.map((s) => (
              <div key={s.label} className="rounded-xl border border-[#e4e9f2] bg-white p-3.5 text-center">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="mt-1 text-[12.5px] font-extrabold text-[#0B1F3A]">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E. Vie quotidienne à proximité */}
      <section className="bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <DemoBadge />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Vie quotidienne à proximité
            </h2>
          </div>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Repères indicatifs fictifs pour illustrer ce qu&apos;une fiche enrichie pourrait afficher.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.proximityScores.map((s) => (
              <DemoScoreCard key={s.key} label={s.label} score={s.score} tag={s.tag} criteria={s.criteria} />
            ))}
          </div>
        </div>
      </section>

      {/* F. À proximité */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            À proximité
          </h2>
          <p className="mt-2 text-[12.5px] text-slate-500">Exemple fictif — lecture indicative.</p>
          <DemoNearbyPlaces categories={p.nearbyPlaces} className="mt-4" />
        </div>
      </section>

      {/* G. Mobilité */}
      <section className="bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Se déplacer depuis ce quartier
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {p.mobility.map((m) => {
              const Icon = MOBILITY_ICONS[m.mode] ?? MapPin;
              return (
                <div key={m.mode} className="rounded-xl border border-[#e4e9f2] bg-white p-4">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-[#0B63CE]/10 text-[#0B63CE]">
                    <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <p className="mt-2 text-[12.5px] font-extrabold text-[#0B1F3A]">{m.mode}</p>
                  <p className="mt-1 text-[11.5px] leading-4 text-slate-500">{m.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* H. Quartier */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Comprendre le quartier
          </h2>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Dans cette démonstration, le quartier de {p.district} est présenté comme :
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {p.neighborhoodRead.map((line) => (
              <li key={line} className="text-[12.5px] text-slate-600">• {line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* I. Historique démo */}
      <section className="bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Historique démo
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.timeline.map((t) => (
              <div key={t.label} className="rounded-xl border border-[#e4e9f2] bg-white p-4 text-center">
                <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{t.label}</p>
                <p className="mt-1 text-[13px] font-extrabold text-[#0B1F3A]">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* J. Points à vérifier avant contact */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0B63CE]" aria-hidden="true" />
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
              Points à vérifier avant contact
            </h2>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {p.verificationChecklist.map((item) => (
              <li key={item} className="text-[12.5px] text-slate-600">• {item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* K. Source originale / partenaire autorisé */}
      <section className="bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#e4e9f2] bg-white p-6">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">
            Dans une version partenaire autorisée
          </h2>
          <p className="mt-3 text-[12.5px] leading-6 text-slate-500">
            Une fiche réelle pourrait pointer vers une source originale ou vers une page partenaire
            autorisée. AkarFinder ne remplace pas la vérification terrain — l&apos;utilisateur doit
            toujours confirmer les informations avant tout engagement.
          </p>
        </div>
      </section>

      {/* L. CTA final */}
      <section className="px-4 py-12 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <DemoRequestButton label="Demander une démonstration agence" />
          <Link
            href="/demo/promoteur"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e4e9f2] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A] transition hover:border-[#0B63CE]/40"
          >
            Voir l&apos;exemple promoteur
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e4e9f2] bg-white px-5 py-3 text-[13.5px] font-extrabold text-[#0B1F3A] transition hover:border-[#0B63CE]/40"
          >
            Retour au mode exposition
          </Link>
        </div>
      </section>
    </DemoShell>
  );
}
