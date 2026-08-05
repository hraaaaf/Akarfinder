"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Star } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { getNeighborhoods, type NeighborhoodPoint } from "@/lib/map/canonical-neighborhood-data";

const FEATURED_IDS = ["rabat-agdal", "casablanca-maarif", "marrakech-gueliz"] as const;

const FUTURE_DIMENSIONS = [
  "Écoles",
  "Commerces",
  "Espaces verts",
  "Mobilité",
  "Vie familiale",
  "Ambiance",
] as const;

function confidenceLabel(value: string) {
  if (value === "high") return "Repères solides";
  if (value === "medium") return "Repères partiels";
  return "Peu de repères";
}

function neighborhoodHref(point: NeighborhoodPoint) {
  return `/immobilier/${point.citySlug}/${point.neighborhoodSlug}`;
}

function StylizedMap({ point }: { point: NeighborhoodPoint }) {
  const markers = point.proximityHighlights.slice(0, 4);
  const positions = [
    "left-[18%] top-[24%]",
    "right-[18%] top-[18%]",
    "left-[28%] bottom-[19%]",
    "right-[22%] bottom-[26%]",
  ];

  return (
    <div className="relative min-h-[330px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A2747] shadow-[0_28px_90px_rgba(0,0,0,0.26)] sm:min-h-[410px]">
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(147,197,253,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(147,197,253,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute -left-16 top-12 h-48 w-72 rotate-[-18deg] rounded-full border-[22px] border-[#123A61]/80" />
      <div className="absolute -right-20 bottom-4 h-56 w-80 rotate-[22deg] rounded-full border-[20px] border-[#123A61]/70" />
      <div className="absolute left-[8%] top-[48%] h-3 w-[86%] rotate-[-7deg] rounded-full bg-[#154A78]/85" />
      <div className="absolute left-[46%] top-[8%] h-[84%] w-3 rotate-[9deg] rounded-full bg-[#154A78]/75" />

      {markers.map((label, index) => (
        <div key={label} className={`absolute ${positions[index]} max-w-[135px] rounded-xl border border-white/12 bg-[#071B33]/90 px-3 py-2 shadow-lg backdrop-blur`}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0B63CE] text-white">
              <MapPin size={11} aria-hidden="true" />
            </span>
            <span className="text-[10px] font-semibold leading-4 text-white/80">{label}</span>
          </div>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 border-white/25 bg-[#0B63CE] shadow-[0_0_0_12px_rgba(11,99,206,0.16)]">
          <MapPin size={25} aria-hidden="true" />
        </span>
        <div className="mt-3 rounded-xl border border-white/12 bg-[#071B33]/92 px-4 py-2 shadow-xl backdrop-blur">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#93C5FD]">{point.city}</p>
          <p className="mt-0.5 text-[15px] font-extrabold text-white">{point.neighborhood}</p>
        </div>
      </div>

      <p className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-[#071B33]/80 px-3 py-1.5 text-[9.5px] font-semibold text-white/55 backdrop-blur">
        {point.lat.toFixed(4)}, {point.lng.toFixed(4)} · aperçu non interactif
      </p>
    </div>
  );
}

export function SignatureMapSection() {
  const featured = useMemo(() => {
    const neighborhoods = getNeighborhoods();
    return FEATURED_IDS
      .map((id) => neighborhoods.find((point) => point.id === id))
      .filter((point): point is NeighborhoodPoint => Boolean(point));
  }, []);
  const [selectedId, setSelectedId] = useState(FEATURED_IDS[0]);
  const selected = featured.find((point) => point.id === selectedId) ?? featured[0];

  if (!selected) return null;

  return (
    <section className="bg-[#071B33] py-16 text-white sm:py-24 lg:py-28">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="max-w-[760px]">
            <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#60A5FA]">Vivre ici</span>
            <h2 className="mt-3 text-[1.95rem] font-extrabold leading-[1.08] tracking-[-0.04em] sm:mt-4 sm:text-[3rem] lg:text-[3.6rem]">
              Un bien ne se résume pas à ses mètres carrés.
            </h2>
            <p className="mt-4 max-w-[680px] text-[14px] leading-6 text-white/68 sm:text-[15px] sm:leading-7">
              Découvrez les repères disponibles autour du bien, le style de vie du quartier et ce que nous pouvons réellement documenter avant votre visite.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2 sm:mt-9" role="tablist" aria-label="Choisir un quartier">
            {featured.map((point) => {
              const active = point.id === selected.id;
              return (
                <button
                  key={point.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedId(point.id as (typeof FEATURED_IDS)[number])}
                  className={`rounded-full border px-4 py-2.5 text-[12px] font-extrabold transition sm:px-5 sm:text-[13px] ${
                    active
                      ? "border-[#60A5FA] bg-[#0B63CE] text-white shadow-[0_12px_30px_rgba(11,99,206,0.28)]"
                      : "border-white/12 bg-white/[0.05] text-white/68 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {point.neighborhood}
                </button>
              );
            })}
          </div>

          <div className="mt-7 grid gap-6 lg:mt-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch lg:gap-8">
            <StylizedMap point={selected} />

            <article className="flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#60A5FA]">{selected.city}</p>
                  <h3 className="mt-2 text-[1.65rem] font-extrabold tracking-[-0.035em]">{selected.neighborhood}</h3>
                </div>
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/70">
                  {confidenceLabel(selected.confidence)}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/48">À proximité</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {selected.proximityHighlights.slice(0, 4).map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 text-[11px] leading-5 text-white/72">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-[#60A5FA]" aria-hidden="true" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/48">Style de vie</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.lifestyleTags.slice(0, 5).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-semibold text-white/70">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                  <p className="text-white/45">Repère prix</p>
                  <p className="mt-1.5 font-extrabold text-white/85">{selected.priceSignal.label}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                  <p className="text-white/45">Période</p>
                  <p className="mt-1.5 font-extrabold text-white/85">{selected.benchmark.period}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-extrabold text-white/75">Profil détaillé bientôt disponible</p>
                  <div className="flex gap-0.5" aria-label="Notes par dimension indisponibles pour le moment">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={14} className="text-white/18" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[10.5px] leading-5 text-white/43">
                  Les étoiles apparaîtront dimension par dimension lorsque les données seront suffisantes et contrôlées.
                </p>
                <p className="sr-only">Dimensions futures : {FUTURE_DIMENSIONS.join(", ")}.</p>
              </div>

              <Link
                href={neighborhoodHref(selected)}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-3.5 text-[13px] font-extrabold text-white transition hover:bg-[#084BA8]"
              >
                Explorer {selected.neighborhood}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </div>
      </Container>
    </section>
  );
}
