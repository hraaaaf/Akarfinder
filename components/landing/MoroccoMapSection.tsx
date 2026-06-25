"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { mapCities, citiesSpotlight } from "@/lib/site";

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

export function MoroccoMapSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCity = citiesSpotlight[activeIndex];

  const prev = () => setActiveIndex((i) => (i - 1 + citiesSpotlight.length) % citiesSpotlight.length);
  const next = () => setActiveIndex((i) => (i + 1) % citiesSpotlight.length);

  return (
    <section id="carte" className="bg-white py-16 sm:py-20">
      <Container>
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2563eb]">
              Rechercher sur la carte
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-gray-900 sm:text-3xl">
              Explorez les biens par ville
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              aria-label="Ville précédente"
              className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={next}
              aria-label="Ville suivante"
              className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
            >
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-stretch">
          {/* Map panel */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-[#0d1f3c] shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(37,99,235,0.18),transparent_40%)]" />

            <div className="relative aspect-[1.4] overflow-hidden">
              <img
                src="/images/morocco-map-complete-premium.png"
                alt="Carte complète du Maroc avec régions"
                className="absolute inset-0 h-full w-full translate-y-2 scale-[1.06] object-contain p-8 opacity-95"
              />

              {/* City dots */}
              <div className="absolute inset-0">
                {mapCities.map((city, i) => {
                  const isActive = city.city === activeCity.name;
                  return (
                    <button
                      key={city.city}
                      onClick={() => setActiveIndex(citiesSpotlight.findIndex(c => c.name === city.city))}
                      className="absolute"
                      style={{ left: `${city.x}%`, top: `${city.y}%` }}
                    >
                      {isActive && (
                        <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-[#2563eb]/20 blur-md" />
                      )}
                      <span className={`absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full ring-2 ring-white transition-all ${isActive ? "bg-[#2563eb] ring-[#2563eb]/30 scale-125" : "bg-[#60a5fa]"}`} />
                      <span className={`absolute left-4 top-[-0.75rem] rounded-full border px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur transition-all ${isActive ? "border-[#2563eb]/40 bg-[#2563eb]/90" : "border-white/16 bg-[#06172f]/78"}`}>
                        {city.city}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#60a5fa]">
                    Vue cartographique
                  </p>
                  <p className="mt-1 text-[13.5px] text-white/70">
                    Carte complète · villes prioritaires · aperçu produit
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-gray-900 transition hover:bg-gray-100"
                >
                  Voir toutes les villes
                </button>
              </div>
            </div>
          </div>

          {/* City spotlight */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            {/* Gradient header with city name */}
            <div
              className="flex flex-1 flex-col justify-between p-7"
              style={{
                background: `linear-gradient(135deg, ${activeCity.color} 0%, ${activeCity.color2} 100%)`,
              }}
            >
              <div>
                <div className="flex items-center gap-2 text-white/80">
                  <MapPinIcon />
                  <span className="text-[12px] font-bold uppercase tracking-[0.14em]">
                    Ville sélectionnée
                  </span>
                </div>
                <h3 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                  {activeCity.name}
                </h3>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/15 p-4 backdrop-blur">
                  <div className="flex items-center gap-1.5 text-white/70">
                    <ListingsIcon />
                    <p className="text-[11px] font-semibold uppercase tracking-wider">Annonces</p>
                  </div>
                  <p className="mt-1.5 text-[1.3rem] font-extrabold text-white">{activeCity.listings}</p>
                </div>
                <div className="rounded-xl bg-white/15 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Prix moyen</p>
                  <p className="mt-1.5 text-[1.05rem] font-extrabold leading-tight text-white">{activeCity.avgPrice}</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="border-t border-gray-100 bg-white p-5">
              <button
                type="button"
                className="w-full rounded-xl bg-[#2563eb] py-3 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition hover:bg-[#1d4ed8]"
              >
                Explorer {activeCity.name} →
              </button>
              <div className="mt-3 flex justify-center gap-2">
                {citiesSpotlight.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-[#2563eb]" : "w-1.5 bg-gray-200"}`}
                    aria-label={`Ville ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
