"use client";

// PUBLIC-INTELLIGENCE-SECTIONS-REALIGNMENT-1 — replaces the former
// "Annonces comparées / Complétude moyenne / Fiabilité moyenne (score /100)"
// framing (implied AkarFinder scores external annonces) with neutral,
// verifiable indicative markers: explored cities/neighborhoods (static,
// first-party map data) and comparative signals (existing safe metric).
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { CITIES } from "@/lib/cities";
import { NEIGHBORHOOD_POINTS } from "@/lib/map/neighborhood-data";

type Stats = {
  total_listings: number;
  avg_completeness: number;
  duplicates_detected: number;
  avg_reliability: number;
};

const FALLBACK: Stats = {
  total_listings: 0,
  avg_completeness: 0,
  duplicates_detected: 0,
  avg_reliability: 0,
};

const CITIES_EXPLORED_COUNT = CITIES.length;
const NEIGHBORHOODS_DOCUMENTED_COUNT = NEIGHBORHOOD_POINTS.length;
const PUBLIC_SOURCES_COUNT = 6; // Avito, Yakeey, Mubawab, Sarouty, Agenz, Logic-Immo

const STAT_META = [
  {
    key: "cities_explored" as const,
    label: "Villes explorées",
    sub: "repères de marché disponibles par ville",
    fallbackLabel: "Multi-villes",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
    staticValue: CITIES_EXPLORED_COUNT,
  },
  {
    key: "neighborhoods_documented" as const,
    label: "Quartiers documentés",
    sub: "repères indicatifs par quartier",
    fallbackLabel: "Repères disponibles",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
    staticValue: NEIGHBORHOODS_DOCUMENTED_COUNT,
  },
  {
    key: "duplicates_detected" as const,
    label: "Repères comparatifs",
    sub: "rapprochements par similitude pour un repérage plus clair",
    fallbackLabel: "Repères disponibles",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
    staticValue: null,
  },
  {
    key: "public_sources" as const,
    label: "Sources publiques accessibles",
    sub: "résultats web externes, source originale toujours indiquée",
    fallbackLabel: "Multi-sources",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
    staticValue: PUBLIC_SOURCES_COUNT,
  },
];

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedCounter({
  target,
  suffix,
  format,
  duration = 2000,
  triggered,
}: {
  target: number;
  suffix: string;
  format: (v: number) => string;
  duration?: number;
  triggered: boolean;
}) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!triggered || hasRun.current || target === 0) return;
    hasRun.current = true;

    const step = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = target * easeOut(progress);
      setDisplay(format(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(format(target));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [triggered, target, duration, format]);

  return (
    <span>
      {display}
      {suffix && (
        <span className="text-[1.6rem] text-accent sm:text-[2.2rem]">{suffix}</span>
      )}
    </span>
  );
}

export function DataProofBlock() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Stats;
          setStats(data);
        }
      } catch {
        // silently keep fallback
      } finally {
        setLoaded(true);
      }
    }
    void fetchStats();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasRealData = stats.total_listings > 0;

  return (
    <section ref={sectionRef} className="bg-surface py-24 sm:py-32">
      <Container>
        <div className="mb-14 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Repères marché
          </span>
          <p className="mt-3 text-[14.5px] text-muted-foreground">
            Comparez les villes, les quartiers et les repères indicatifs avant de contacter une source.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          {STAT_META.map(({ key, label, sub, fallbackLabel, suffix, format, staticValue }) => {
            const raw = staticValue ?? stats.duplicates_detected;
            const hasValue = staticValue != null ? true : hasRealData && raw > 0;

            return (
              <div key={key} className="flex flex-col items-center text-center">
                {hasValue ? (
                  <p className="tabular-nums text-[3rem] font-extrabold leading-none tracking-[-0.04em] text-accent sm:text-[4rem]">
                    <AnimatedCounter
                      target={raw}
                      suffix={suffix}
                      format={format}
                      duration={2200}
                      triggered={triggered}
                    />
                  </p>
                ) : (
                  <p className="text-[1.6rem] font-extrabold leading-none tracking-tight text-accent sm:text-[1.9rem]">
                    {fallbackLabel}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-[2000ms] ease-out"
                    style={{ width: triggered && hasValue ? "100%" : "0%" }}
                  />
                </div>

                <p className="mt-4 text-[14px] font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{sub}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
