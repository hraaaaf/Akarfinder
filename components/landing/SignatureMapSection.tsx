"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";

type CitySlug = "tanger" | "rabat" | "casablanca" | "fes" | "marrakech" | "agadir";
type Filter = CitySlug | "all";
type IconType = "pin" | "bar" | "shield";

type MapCity = {
  slug: CitySlug;
  label: string;
  tag: string;
  description: string;
  href: string;
  image: string;
  alt: string;
  pin: { x: string; y: string };
};

const MAP_CITIES: MapCity[] = [
  {
    slug: "tanger",
    label: "Tanger",
    tag: "Port & International",
    description: "Ouverture internationale, front de mer et opportunites.",
    href: "/search?city=Tanger",
    image: "/images/cities/tanger.jpg",
    alt: "Port de Tanger avec vue sur le detroit de Gibraltar",
    pin: { x: "66.25%", y: "7.75%" },
  },
  {
    slug: "rabat",
    label: "Rabat",
    tag: "Capitale & Residentiel",
    description: "Stabilite, qualite de vie et quartiers d'exception.",
    href: "/search?city=Rabat",
    image: "/images/cities/rabat.jpg",
    alt: "Vue de Rabat avec architecture institutionnelle",
    pin: { x: "60.95%", y: "17.65%" },
  },
  {
    slug: "casablanca",
    label: "Casablanca",
    tag: "Economique & Affaires",
    description: "Dynamisme economique, CBD moderne et rendement.",
    href: "/search?city=Casablanca",
    image: "/images/cities/casablanca.jpg",
    alt: "Skyline de Casablanca et marina",
    pin: { x: "57.25%", y: "20.1%" },
  },
  {
    slug: "fes",
    label: "Fes",
    tag: "Historique & Culturelle",
    description: "Patrimoine vivant, authenticite et art de vivre.",
    href: "/search?city=F%C3%A8s",
    image: "/images/cities/fes.jpg",
    alt: "Vue de Fes avec la medina et ses reliefs",
    pin: { x: "70.25%", y: "17.6%" },
  },
  {
    slug: "marrakech",
    label: "Marrakech",
    tag: "Touristique & Prestige",
    description: "Attractivite touristique, villas et biens d'exception.",
    href: "/search?city=Marrakech",
    image: "/images/cities/marrakech.jpg",
    alt: "Koutoubia et palmiers a Marrakech au coucher du soleil",
    pin: { x: "55.15%", y: "31.25%" },
  },
  {
    slug: "agadir",
    label: "Agadir",
    tag: "Littoral & Douceur de Vivre",
    description: "Climat doux, front de mer et qualite de vie.",
    href: "/search?city=Agadir",
    image: "/images/cities/agadir.jpg",
    alt: "Plage et corniche d'Agadir",
    pin: { x: "47.1%", y: "38.15%" },
  },
];

const SIDE_STATS = [
  { value: "6", label: "Villes cles", icon: "pin" as const },
  { value: "Multi", label: "Sources visibles", icon: "bar" as const },
  { value: "Visible", label: "Indices de fiabilite", icon: "shield" as const },
];

const BOTTOM_SIGNALS = [
  {
    label: "Signaux de fiabilite integres",
    description:
      "Prix indicatifs, tendances de marche, qualite des quartiers et scoring de fiabilite pour mieux comparer.",
    icon: "shield" as const,
  },
  {
    label: "Resultats web",
    description:
      "Des resultats provenant des sources originales, avec source visible et lien direct vers l'annonce.",
    icon: "bar" as const,
  },
  {
    label: "Reperes utiles",
    description:
      "Villes, quartiers, accessibilite et contexte local mis en avant pour orienter la recherche.",
    icon: "pin" as const,
  },
];

// Dark theme: deep navy Morocco with an electric-blue glow.
const DARK_MAP_FILTER = [
  "brightness(0)",
  "invert(1)",
  "sepia(1)",
  "saturate(5.4)",
  "hue-rotate(184deg)",
  "brightness(0.42)",
  "drop-shadow(0 0 34px rgba(96,165,250,0.52))",
  "drop-shadow(0 0 10px rgba(96,165,250,0.82))",
  "drop-shadow(0 0 3px rgba(191,219,254,0.92))",
].join(" ");

// Light theme: pale blue Morocco with a soft cloud-like shadow.
const LIGHT_MAP_FILTER = [
  "brightness(0)",
  "invert(72%)",
  "sepia(18%)",
  "saturate(1450%)",
  "hue-rotate(181deg)",
  "brightness(101%)",
  "drop-shadow(0 10px 22px rgba(96,165,250,0.22))",
  "drop-shadow(0 0 1px rgba(37,99,235,0.35))",
].join(" ");

function Icon({ type, size = 16 }: { type: IconType; size?: number }) {
  const s = { width: size, height: size };
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "pin") {
    return (
      <svg {...s} viewBox="0 0 24 24" {...p}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  }

  if (type === "bar") {
    return (
      <svg {...s} viewBox="0 0 24 24" {...p}>
        <rect x="3" y="13" width="4" height="8" />
        <rect x="10" y="8" width="4" height="13" />
        <rect x="17" y="4" width="4" height="17" />
      </svg>
    );
  }

  return (
    <svg {...s} viewBox="0 0 24 24" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CityIcon({ slug }: { slug: CitySlug }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (slug === "tanger") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="8" x2="12" y2="22" />
        <path d="M5 15h14M3 22h18" />
      </svg>
    );
  }

  if (slug === "rabat") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
        <path d="M3 22h18M6 22V8l6-5 6 5v14M9 22v-6h6v6" />
      </svg>
    );
  }

  if (slug === "casablanca") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  if (slug === "fes") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
        <path d="M2 21h20M5 21V10a7 7 0 0 1 14 0v11M9 21v-5h6v5" />
      </svg>
    );
  }

  if (slug === "marrakech") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
        <path d="M12 22V12M12 12c0-3 2-6 5-9M12 12c0-3-2-6-5-9M12 12c3-1 6 0 8 3M12 12c-3-1-6 0-8 3" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...p}>
      <path d="M2 12c2.5-5 5-5 7.5 0s5 5 7.5 0 5-5 7.5 0" />
      <path d="M2 17c2.5-5 5-5 7.5 0s5 5 7.5 0 5-5 7.5 0" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1.75 6h8.5M7 2.75L10.25 6 7 9.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Topography() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 22% 82%, rgba(96,165,250,0.14) 0, rgba(96,165,250,0.02) 16%, transparent 32%)",
              "radial-gradient(circle at 76% 28%, rgba(75,123,197,0.18) 0, rgba(75,123,197,0.03) 20%, transparent 42%)",
            ].join(","),
          }}
        />
        <svg viewBox="0 0 1200 900" className="h-full w-full">
          {[220, 300, 380, 460, 540].map((r, index) => (
            <ellipse
              key={r}
              cx="480"
              cy="350"
              rx={r}
              ry={r * 0.64}
              fill="none"
              stroke="rgba(84,125,187,0.14)"
              strokeWidth={index === 0 ? 1.2 : 1}
            />
          ))}
        </svg>
      </div>
      <div
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(59,130,246,0.12)" }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(35,82,153,0.24)" }}
      />
    </>
  );
}

function DropPin({ active }: { active: boolean }) {
  return (
    <span
      className="relative block h-10 w-8"
      style={{
        filter: active
          ? "drop-shadow(0 0 10px rgba(96,165,250,0.9)) drop-shadow(0 0 22px rgba(96,165,250,0.42))"
          : "drop-shadow(0 0 4px rgba(96,165,250,0.36))",
      }}
    >
      <span
        className="absolute left-1/2 top-[3px] h-5 w-5 -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, #dbeafe 0%, #60a5fa 42%, #2563eb 74%, #0b1f3a 100%)",
          boxShadow: active ? "0 0 18px rgba(96,165,250,0.72)" : "0 0 10px rgba(96,165,250,0.34)",
        }}
      />
      <span
        className="absolute left-1/2 top-5 h-5 w-5 -translate-x-1/2 rotate-45 rounded-[0.3rem]"
        style={{
          background: "linear-gradient(180deg, #60a5fa 0%, #0b63ce 100%)",
          borderBottomRightRadius: "0.6rem",
        }}
      />
      <span
        className="absolute left-1/2 top-[9px] h-[7px] w-[7px] -translate-x-1/2 rounded-full"
        style={{ background: "#eff6ff" }}
      />
    </span>
  );
}

function MapPins({
  active,
  onSelect,
  compact = false,
}: {
  active: Filter;
  onSelect: (city: CitySlug) => void;
  compact?: boolean;
}) {
  return (
    <>
      {MAP_CITIES.map((city) => {
        const isActive = active === city.slug;
        return (
          <button
            key={city.slug}
            type="button"
            aria-label={`Explorer ${city.label}`}
            onClick={() => onSelect(city.slug)}
            onMouseEnter={!compact ? () => onSelect(city.slug) : undefined}
            className="group absolute -translate-x-1/2 -translate-y-[90%] focus-visible:outline-none"
            style={{ left: city.pin.x, top: city.pin.y }}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className="transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.08)" : "scale(1)" }}
              >
                <DropPin active={isActive} />
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.01em] shadow-[0_16px_35px_rgba(0,0,0,0.25)] transition ${
                  isActive
                    ? "border-[#60A5FA]/60 bg-[#0B63CE] text-white"
                    : "border-border/30 bg-card text-foreground group-hover:border-[#60A5FA]/60"
                } ${compact ? "text-[10px]" : ""}`}
              >
                {city.label}
              </span>
            </div>
          </button>
        );
      })}
    </>
  );
}

function PremiumMap({
  active,
  onSelect,
  compact = false,
}: {
  active: Filter;
  onSelect: (city: CitySlug) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const mapFilter = theme === "dark" ? DARK_MAP_FILTER : LIGHT_MAP_FILTER;
  return (
    <div
      className={`relative overflow-hidden ${
        compact ? "aspect-[1.08/1]" : "aspect-[1.02/0.98] min-h-[640px]"
      }`}
    >
      <Topography />
      <div
        className="pointer-events-none absolute inset-[18%_18%_8%_6%] rounded-full blur-3xl"
        style={{ background: "rgba(43,83,141,0.28)" }}
      />
      <img
        src="/maps/morocco-official.svg"
        alt="Carte indicative du Maroc"
        className={`relative z-10 mx-auto h-full w-full object-contain ${compact ? "scale-[1.09]" : "scale-[1.24]"}`}
        style={{ filter: mapFilter }}
      />
      <div className="absolute inset-0 z-20">
        <MapPins active={active} onSelect={onSelect} compact={compact} />
      </div>
    </div>
  );
}

function StatPanel() {
  return (
    <div className="w-[160px] rounded-[1.6rem] border border-border/15 bg-card/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur">
      {SIDE_STATS.map((stat, index) => (
        <div
          key={stat.label}
          className={`${index === 0 ? "" : "mt-5 border-t border-border/15 pt-5"} flex items-center gap-3`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/35 bg-surface-muted text-accent">
            <Icon type={stat.icon} />
          </div>
          <div>
            <p className="text-[0.45rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-[1.05rem] font-semibold text-card-foreground">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterPills({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (filter: Filter) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      {(["all", ...MAP_CITIES.map((city) => city.slug)] as Filter[]).map((item) => {
        const isActive = item === filter;
        const label = item === "all" ? "Toutes" : MAP_CITIES.find((city) => city.slug === item)?.label ?? item;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-5 py-2 text-[0.92rem] transition ${
              isActive
                ? "border-[#60A5FA]/60 bg-[#0B63CE] text-white"
                : "border-border/20 bg-card text-foreground hover:border-[#60A5FA]/38"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function CityCard({ city, highlighted }: { city: MapCity; highlighted: boolean }) {
  return (
    <article
      className={`overflow-hidden rounded-[1.45rem] border bg-card shadow-[0_24px_50px_rgba(0,0,0,0.12)] transition duration-300 ${
        highlighted
          ? "border-accent/60 shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_24px_55px_rgba(0,0,0,0.16)]"
          : "border-border/15 hover:border-accent/34"
      }`}
    >
      <div className="relative aspect-[1.14/0.76] overflow-hidden">
        <Image
          src={city.image}
          alt={city.alt}
          fill
          loading="eager"
          sizes="(min-width: 1280px) 240px, (min-width: 1024px) 30vw, 100vw"
          className="object-cover transition duration-500 hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091629]/72 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/26 bg-card text-accent shadow-[0_16px_30px_rgba(0,0,0,0.18)]">
          <CityIcon slug={city.slug} />
        </div>
      </div>
      <div className="p-4 pb-5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-accent">{city.tag}</p>
        <h3
          className="mt-2 text-[1.7rem] leading-none text-card-foreground xl:text-[1.9rem]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {city.label}
        </h3>
        <p className="mt-3 min-h-[56px] text-[0.95rem] leading-7 text-muted-foreground">{city.description}</p>
        <Link
          href={city.href}
          className="mt-4 inline-flex items-center gap-2 text-[0.98rem] font-medium text-accent transition hover:brightness-110"
        >
          Explorer {city.label}
          <ArrowIcon />
        </Link>
      </div>
    </article>
  );
}

function DesktopBottomBar() {
  return (
    <div className="mt-5 flex items-center justify-between gap-6 rounded-[1.55rem] border border-border/15 bg-card px-7 py-6 shadow-[0_24px_50px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/36 bg-surface-muted text-accent shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <Icon type="shield" size={18} />
        </div>
        <div>
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-accent">
            Signaux de fiabilite integres
          </p>
          <p className="mt-2 max-w-[620px] text-[1rem] leading-7 text-muted-foreground">
            Prix indicatifs, tendances de marche, qualite des quartiers, notre scoring de fiabilite vous guide vers de meilleures decisions.
          </p>
        </div>
      </div>
      <Link
        href="/onboarding"
        className="inline-flex min-w-[280px] items-center justify-center gap-3 rounded-[1.1rem] border border-accent/32 px-6 py-4 text-[1rem] font-medium text-accent transition hover:border-accent/52 hover:bg-accent/5"
      >
        Comprendre notre methode
        <ArrowIcon />
      </Link>
    </div>
  );
}

function MobileSignalBar() {
  return (
    <div className="mt-6 grid gap-3 rounded-[1.45rem] border border-border/15 bg-card p-4 shadow-[0_20px_45px_rgba(0,0,0,0.12)]">
      {BOTTOM_SIGNALS.map((item) => (
        <div key={item.label} className="flex items-start gap-4 rounded-[1.1rem] border border-border/10 bg-surface-muted px-4 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-card text-accent">
            <Icon type={item.icon} />
          </div>
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-accent">{item.label}</p>
            <p className="mt-1 text-[0.98rem] leading-7 text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SignatureMapSection() {
  const [filter, setFilter] = useState<Filter>("all");
  const { theme } = useTheme();

  return (
    <section
      id="signature-map"
      className="overflow-hidden bg-background text-foreground"
      style={
        theme === "dark"
          ? {
              backgroundImage:
                "radial-gradient(circle at 18% 12%, rgba(34,64,121,0.35) 0%, transparent 28%), radial-gradient(circle at 82% 18%, rgba(17,42,82,0.32) 0%, transparent 26%), linear-gradient(180deg, #04101f 0%, #051121 100%)",
            }
          : {
              backgroundImage:
                "radial-gradient(circle at 18% 12%, rgba(96,165,250,0.12) 0%, transparent 30%), radial-gradient(circle at 82% 18%, rgba(56,189,248,0.08) 0%, transparent 28%)",
            }
      }
    >
      <div className="mx-auto max-w-[1640px] px-7 pb-8 pt-12 md:px-10 lg:hidden">
        <p className="text-[0.98rem] font-medium uppercase tracking-[0.22em] text-accent">Explorer le Maroc</p>
        <div className="mt-4 h-[3px] w-14 rounded-full bg-accent" />
        <h2
          className="mt-5 max-w-[780px] text-[3rem] leading-[0.95] text-foreground sm:text-[4.2rem]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          La carte intelligente
          <br />
          de l&apos;immobilier marocain
        </h2>
        <p className="mt-5 max-w-[720px] text-[1.08rem] leading-[1.55] text-muted-foreground">
          Explorez les villes marocaines avec des reperes indicatifs et des signaux de fiabilite visibles pour mieux décider.
        </p>

        <div className="mt-7">
          <PremiumMap active={filter} onSelect={setFilter} compact />
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
          {MAP_CITIES.map((city) => (
            <CityCard key={city.slug} city={city} highlighted={filter === city.slug} />
          ))}
        </div>

        <MobileSignalBar />

        <Link
          href="/onboarding"
          className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[1.15rem] border border-accent/28 px-5 py-4 text-[1rem] font-medium text-accent transition hover:bg-accent/5"
        >
          Comprendre notre methode
          <ArrowIcon />
        </Link>
      </div>

      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1680px] px-8 pb-14 pt-14 xl:px-10">
          <div className="grid grid-cols-[1.08fr_1.04fr] gap-10 xl:gap-14">
            <div className="relative overflow-hidden rounded-[2rem]">
              <Topography />
              <div className="relative z-10 pt-6">
                <div className="max-w-[560px]">
                  <p className="text-[1rem] font-medium uppercase tracking-[0.22em] text-accent">Explorer le Maroc</p>
                  <div className="mt-4 h-[3px] w-16 rounded-full bg-accent" />
                  <h2
                    className="mt-6 text-[4.65rem] leading-[0.94] text-foreground xl:text-[5.05rem]"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    La carte intelligente
                    <br />
                    de l&apos;immobilier marocain
                  </h2>
                  <p className="mt-7 max-w-[500px] text-[1.14rem] leading-[1.65] text-muted-foreground">
                    Explorez les villes marocaines avec des reperes indicatifs et des signaux de fiabilite visibles pour mieux décider.
                  </p>
                </div>
                <div className="relative mt-10 pl-14">
                  <div className="absolute left-0 top-24 z-30">
                    <StatPanel />
                  </div>
                  <PremiumMap active={filter} onSelect={setFilter} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[0.98rem] font-medium uppercase tracking-[0.18em] text-accent">Explorer par ville</p>
              <FilterPills filter={filter} setFilter={setFilter} />

              <div className="mt-6 grid grid-cols-3 gap-4">
                {MAP_CITIES.map((city) => (
                  <CityCard key={city.slug} city={city} highlighted={filter === city.slug} />
                ))}
              </div>

              <DesktopBottomBar />
            </div>
          </div>
        </div>
      </div>

      <ul className="sr-only">
        {MAP_CITIES.map((city) => (
          <li key={city.slug}>
            <Link href={city.href}>Rechercher a {city.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
