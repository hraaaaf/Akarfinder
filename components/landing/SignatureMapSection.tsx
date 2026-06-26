"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type MapCity = {
  slug: string;
  label: string;
  tag: string;
  href: string;
  image: string | null;
  alt: string;
  pin: { x: string; y: string };
};

const MAP_CITIES: MapCity[] = [
  {
    slug: "casablanca",
    label: "Casablanca",
    tag: "Business & littoral",
    href: "/map?city=Casablanca",
    image: "/images/cities/casablanca.jpg",
    alt: "Skyline nocturne de Casablanca avec la mosquée Hassan II",
    pin: { x: "53%", y: "28%" },
  },
  {
    slug: "rabat",
    label: "Rabat",
    tag: "Capitale & administratif",
    href: "/map?city=Rabat",
    image: "/images/cities/rabat.jpg",
    alt: "Tour Hassan et mausolée Mohammed V à Rabat",
    pin: { x: "58%", y: "21%" },
  },
  {
    slug: "tanger",
    label: "Tanger",
    tag: "Nord & mobilité",
    href: "/map?city=Tanger",
    image: "/images/cities/tanger.jpg",
    alt: "Baie de Tanger vue de la Casbah",
    pin: { x: "67%", y: "11%" },
  },
  {
    slug: "fes",
    label: "Fès",
    tag: "Patrimoine & intérieur",
    href: "/map?city=F%C3%A8s",
    image: null,
    alt: "Médina de Fès",
    pin: { x: "72%", y: "22%" },
  },
  {
    slug: "marrakech",
    label: "Marrakech",
    tag: "Lifestyle & investissement",
    href: "/map?city=Marrakech",
    image: "/images/cities/marrakech.jpg",
    alt: "Coucher de soleil sur la Koutoubia à Marrakech",
    pin: { x: "57%", y: "43%" },
  },
  {
    slug: "agadir",
    label: "Agadir",
    tag: "Littoral & résidence",
    href: "/map?city=Agadir",
    image: "/images/cities/agadir.jpg",
    alt: "Corniche d'Agadir et plage atlantique",
    pin: { x: "37%", y: "54%" },
  },
];

function CityCard({ city }: { city: MapCity }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0D2545] shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
      <div className="relative h-44 w-full overflow-hidden">
        {city.image ? (
          <Image
            src={city.image}
            alt={city.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#13305e] to-[#1a5080]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D2545]/75 via-transparent to-transparent" />
      </div>
      <div className="p-5">
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C2A368]">
          {city.tag}
        </p>
        <h3 className="text-xl font-extrabold text-white">{city.label}</h3>
        <Link
          href={city.href}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#C2A368]/40 bg-[#C2A368]/10 px-4 py-2.5 text-sm font-semibold text-[#C2A368] transition duration-200 hover:border-[#C2A368]/70 hover:bg-[#C2A368]/20"
        >
          Explorer {city.label}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function MapPins({
  active,
  onSelect,
  mobile,
}: {
  active: string;
  onSelect: (slug: string) => void;
  mobile?: boolean;
}) {
  return (
    <>
      {MAP_CITIES.map((city) => {
        const isActive = city.slug === active;
        return (
          <button
            key={city.slug}
            onClick={() => onSelect(city.slug)}
            onMouseEnter={!mobile ? () => onSelect(city.slug) : undefined}
            aria-label={`Explorer les annonces à ${city.label}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2A368]"
            style={{ left: city.pin.x, top: city.pin.y }}
          >
            <span
              className={`flex items-center gap-1 rounded-full border backdrop-blur-sm transition-all duration-200 ${
                mobile ? "px-2 py-0.5 text-[8px]" : "px-2.5 py-1 text-[10px]"
              } font-extrabold tracking-[0.06em] ${
                isActive
                  ? "border-[#C2A368]/90 bg-[#071B33] text-white shadow-[0_0_14px_rgba(194,163,104,0.55)]"
                  : "border-[#C2A368]/35 bg-[#071B33]/75 text-white/80 group-hover:border-[#C2A368]/70 group-hover:bg-[#071B33] group-hover:text-white group-hover:shadow-[0_0_10px_rgba(194,163,104,0.35)]"
              }`}
            >
              <span
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  mobile ? "h-[4px] w-[4px]" : "h-[5px] w-[5px]"
                } ${
                  isActive
                    ? "bg-[#C2A368] shadow-[0_0_6px_rgba(194,163,104,1)]"
                    : "bg-[#C2A368]/55"
                }`}
              />
              {city.label}
            </span>
          </button>
        );
      })}
    </>
  );
}

export function SignatureMapSection() {
  const [active, setActive] = useState("casablanca");
  const activeCity = MAP_CITIES.find((c) => c.slug === active) ?? MAP_CITIES[0];

  return (
    <section id="signature-map" className="bg-[#071B33] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center lg:mb-16">
          <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C2A368]">
            Explorez le Maroc
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.75rem]">
            La carte intelligente de
            <br className="hidden sm:block" /> l&apos;immobilier marocain
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
            Explorez les villes marocaines avec des repères indicatifs, des annonces analysées et des signaux de fiabilité visibles.
          </p>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden items-center gap-10 lg:flex xl:gap-14">
          {/* Morocco SVG map */}
          <div className="relative min-w-0 flex-1">
            <div className="relative mx-auto max-w-[580px]">
              {/* Glow halo behind map */}
              <div className="absolute inset-0 scale-90 rounded-full bg-[#0f3a6e]/40 blur-3xl" />
              <img
                src="/maps/morocco-official.svg"
                alt="Carte indicative du Maroc — repères simplifiés pour l'exploration"
                width={580}
                height={580}
                className="relative w-full"
                style={{ filter: "brightness(0) invert(1)", opacity: 0.18 }}
              />
              <div className="absolute inset-0">
                <MapPins active={active} onSelect={setActive} />
              </div>
            </div>
          </div>

          {/* City card + quick selector */}
          <div className="w-72 flex-shrink-0 xl:w-80">
            <CityCard city={activeCity} />
            <div className="mt-4 flex flex-wrap gap-2">
              {MAP_CITIES.filter((c) => c.slug !== activeCity.slug).map((city) => (
                <button
                  key={city.slug}
                  onClick={() => setActive(city.slug)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/50 transition hover:border-white/30 hover:text-white/80"
                >
                  {city.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mobile layout ── */}
        <div className="lg:hidden">
          {/* Compact map with pins */}
          <div className="relative mx-auto max-w-[340px]">
            <div className="absolute inset-0 scale-90 rounded-full bg-[#0f3a6e]/35 blur-2xl" />
            <img
              src="/maps/morocco-official.svg"
              alt="Carte indicative du Maroc"
              width={340}
              height={340}
              className="relative w-full"
              style={{ filter: "brightness(0) invert(1)", opacity: 0.16 }}
            />
            <div className="absolute inset-0">
              <MapPins active={active} onSelect={setActive} mobile />
            </div>
          </div>

          {/* City pill selector */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {MAP_CITIES.map((city) => (
              <button
                key={city.slug}
                onClick={() => setActive(city.slug)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  city.slug === active
                    ? "border-[#C2A368]/60 bg-[#C2A368]/15 text-[#C2A368]"
                    : "border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80"
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>

          {/* Active city card */}
          <div className="mt-5">
            <CityCard city={activeCity} />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-center text-[11px] text-white/25">
          Carte indicative — repères simplifiés pour l&apos;exploration.
        </p>
      </div>

      {/* Accessibility: screen-reader links */}
      <ul className="sr-only">
        {MAP_CITIES.map(({ label, href }) => (
          <li key={label}>
            <Link href={href}>Explorer les annonces à {label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
