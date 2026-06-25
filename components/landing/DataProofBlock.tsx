"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";

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

const STAT_META = [
  {
    key: "total_listings" as const,
    label: "Annonces analysées",
    sub: "issues de sources publiques consolidées",
    fallbackLabel: "Multi-sources",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
  },
  {
    key: "avg_completeness" as const,
    label: "Complétude moyenne",
    sub: "niveau d'informations par annonce",
    fallbackLabel: "Données analysées",
    suffix: "/100",
    decimals: 0,
    format: (v: number) => String(Math.round(v)),
  },
  {
    key: "duplicates_detected" as const,
    label: "Doublons détectés",
    sub: "rapprochés automatiquement par similitude",
    fallbackLabel: "Score indicatif",
    suffix: "",
    decimals: 0,
    format: (v: number) => Math.round(v).toLocaleString("fr-FR"),
  },
  {
    key: "avg_reliability" as const,
    label: "Fiabilité moyenne",
    sub: "score basé sur la qualité des données",
    fallbackLabel: "Phase pilote",
    suffix: "/100",
    decimals: 0,
    format: (v: number) => String(Math.round(v)),
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
        <span className="text-[1.6rem] text-[#9B7838] sm:text-[2.2rem]">{suffix}</span>
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
    <section ref={sectionRef} className="bg-[#0C0C0C] py-24 sm:py-32">
      <Container>
        <div className="mb-14 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#C2A368]">
            Analyse intelligente du marché
          </span>
          <p className="mt-3 text-[14.5px] text-white/50">
            Données indicatives générées à partir d&apos;annonces publiques analysées automatiquement.
            {!hasRealData && loaded && (
              <span className="ml-1 text-white/30">(données en cours de collecte)</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-12">
          {STAT_META.map(({ key, label, sub, fallbackLabel, suffix, format }) => {
            const raw = stats[key];
            const hasValue = hasRealData && raw > 0;

            return (
              <div key={key} className="flex flex-col items-center text-center">
                {hasValue ? (
                  <p className="tabular-nums text-[3rem] font-extrabold leading-none tracking-[-0.04em] text-[#C2A368] sm:text-[4rem]">
                    <AnimatedCounter
                      target={raw}
                      suffix={suffix}
                      format={format}
                      duration={2200}
                      triggered={triggered}
                    />
                  </p>
                ) : (
                  <p className="text-[1.6rem] font-extrabold leading-none tracking-tight text-[#C2A368] sm:text-[1.9rem]">
                    {fallbackLabel}
                  </p>
                )}

                {/* Progress bar */}
                <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#9B7838] transition-all duration-[2000ms] ease-out"
                    style={{ width: triggered && hasValue ? "100%" : "0%" }}
                  />
                </div>

                <p className="mt-4 text-[14px] font-semibold text-white/80">{label}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-white/38">{sub}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
