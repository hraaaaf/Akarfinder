"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { GEO_CITIES, getValidatedMapNeighborhoods } from "@/lib/geo/geo-entity-registry";

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

function AnimatedCounter({ target, triggered }: { target: number; triggered: boolean }) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!triggered || target <= 0) return;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / 1400, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased).toLocaleString("fr-FR"));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, triggered]);

  return <span>{display}</span>;
}

export function DataProofBlock() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [triggered, setTriggered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/stats", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setStats(data as Stats);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTriggered(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      key: "index",
      category: "Index actuel",
      value: stats.total_listings > 0 ? stats.total_listings : null,
      fallback: "En construction",
      label: "Offres présentes dans l'index",
      sub: "Volume technique de l'index. Toutes les lignes ne sont pas nécessairement publiables dans la recherche publique.",
    },
    {
      key: "dedup",
      category: "Index actuel",
      value: stats.duplicates_detected > 0 ? stats.duplicates_detected : null,
      fallback: "Signal actif",
      label: "Rapprochements détectés",
      sub: "Signaux de ressemblance calculés pour réduire le bruit, sans certifier qu'il s'agit du même bien.",
    },
    {
      key: "cities",
      category: "Référentiel canonique",
      value: GEO_CITIES.length,
      fallback: null,
      label: "Villes normalisées",
      sub: "Entités du Geo Registry avec noms canoniques et variantes d'écriture reconnues.",
    },
    {
      key: "neighborhoods",
      category: "Référentiel canonique",
      value: getValidatedMapNeighborhoods().length,
      fallback: null,
      label: "Quartiers cartographiés",
      sub: "Quartiers validés pour la carte. Cela ne signifie pas qu'une page SEO est automatiquement publiée.",
    },
  ];

  return (
    <section ref={sectionRef} className="bg-surface py-24 sm:py-32">
      <Container>
        <div className="mb-14 text-center">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">Preuves et référentiels</span>
          <h2 className="mt-4 text-[2rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2.5rem]">Chaque chiffre dit ce qu'il mesure.</h2>
          <p className="mx-auto mt-3 max-w-[650px] text-[14.5px] leading-7 text-muted-foreground">
            Les volumes de l'index, les signaux calculés et les référentiels produit sont volontairement séparés pour éviter les chiffres décoratifs ou ambigus.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, category, value, fallback, label, sub }) => (
            <div key={key} className="rounded-2xl border border-border/15 bg-card p-6 shadow-[0_8px_28px_rgba(7,27,51,0.05)]">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">{category}</span>
              {value != null && value > 0 ? (
                <p className="mt-4 tabular-nums text-[2.7rem] font-extrabold leading-none tracking-[-0.04em] text-accent">
                  <AnimatedCounter target={value} triggered={triggered} />
                </p>
              ) : (
                <p className="mt-4 text-[1.45rem] font-extrabold leading-none tracking-tight text-accent">{fallback ?? "Non disponible"}</p>
              )}
              <p className="mt-5 text-[14px] font-extrabold text-foreground">{label}</p>
              <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
