"use client";

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

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedCounter({
  target,
  duration = 2000,
  triggered,
}: {
  target: number;
  duration?: number;
  triggered: boolean;
}) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!triggered || hasRun.current || target <= 0) return;
    hasRun.current = true;

    const step = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = target * easeOut(progress);
      setDisplay(Math.round(current).toLocaleString("fr-FR"));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(Math.round(target).toLocaleString("fr-FR"));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [triggered, target, duration]);

  return <span>{display}</span>;
}

export function DataProofBlock() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
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
        // Keep neutral fallbacks. Never invent a number when the API is unavailable.
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

  const cards = [
    {
      key: "cities",
      value: CITIES_EXPLORED_COUNT,
      qualitative: null,
      label: "Villes explorées",
      sub: "nombre calculé depuis le référentiel de villes AkarFinder",
    },
    {
      key: "neighborhoods",
      value: NEIGHBORHOODS_DOCUMENTED_COUNT,
      qualitative: null,
      label: "Quartiers documentés",
      sub: "nombre calculé depuis les points de quartier disponibles",
    },
    {
      key: "comparisons",
      value: stats.duplicates_detected > 0 ? stats.duplicates_detected : null,
      qualitative: stats.duplicates_detected > 0 ? null : "Disponibles",
      label: "Repères comparatifs",
      sub: "rapprochements réellement calculés lorsqu'ils sont disponibles",
    },
    {
      key: "sources",
      value: null,
      qualitative: "Multi-sources",
      label: "Sources publiques accessibles",
      sub: "aucun nombre affiché sans décompte issu du registre de sources",
    },
  ];

  return (
    <section ref={sectionRef} className="bg-surface py-24 sm:py-32">
      <Container>
        <div className="mb-14 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">
            Repères marché
          </span>
          <p className="mt-3 text-[14.5px] text-muted-foreground">
            Des compteurs calculés ou des libellés qualitatifs — jamais de chiffre décoratif inventé.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          {cards.map(({ key, value, qualitative, label, sub }) => (
            <div key={key} className="flex flex-col items-center text-center">
              {value != null && value > 0 ? (
                <p className="tabular-nums text-[3rem] font-extrabold leading-none tracking-[-0.04em] text-accent sm:text-[4rem]">
                  <AnimatedCounter target={value} duration={2200} triggered={triggered} />
                </p>
              ) : (
                <p className="text-[1.55rem] font-extrabold leading-none tracking-tight text-accent sm:text-[1.9rem]">
                  {qualitative ?? "Non disponible"}
                </p>
              )}

              <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-[2000ms] ease-out"
                  style={{ width: triggered ? "100%" : "0%" }}
                />
              </div>

              <p className="mt-4 text-[14px] font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
