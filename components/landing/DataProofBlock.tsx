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
    <section ref={sectionRef} className="bg-surface py-16 sm:py-24 lg:py-28">
      <Container>
        <div className="mb-9 text-center sm:mb-14">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-accent">Preuves et référentiels</span>
          <h2 className="mt-3 text-[1.85rem] font-extrabold tracking-[-0.03em] text-foreground sm:mt-4 sm:text-[2.5rem]">Chaque chiffre dit ce qu'il mesure.</h2>
          <p className="mx-auto mt-3 max-w-[650px] text-[13.5px] leading-6 text-muted-foreground sm:text-[14.5px] sm:leading-7">
            Les volumes de l'index, les signaux calculés et les référentiels produit sont volontairement séparés pour éviter les chiffres décoratifs ou ambigus.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {cards.map(({ key, category, value, fallback, label, sub }) => (
            <div key={key} className="rounded-2xl border border-border/15 bg-card p-4 shadow-[0_8px_28px_rgba(7,27,51,0.05)] sm:p-6">
              <span className="text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">{category}</span>
              {value != null && value > 0 ? (
                <p className="mt-3 tabular-nums text-[2rem] font-extrabold leading-none tracking-[-0.04em] text-accent sm:mt-4 sm:text-[2.7rem]">
                  <AnimatedCounter target={value} triggered={triggered} />
                </p>
              ) : (
                <p className="mt-3 text-[1.1rem] font-extrabold leading-tight tracking-tight text-accent sm:mt-4 sm:text-[1.45rem] sm:leading-none">{fallback ?? "Non disponible"}</p>
              )}
              <p className="mt-3 text-[12px] font-extrabold leading-5 text-foreground sm:mt-5 sm:text-[14px]">{label}</p>
              <p className="mt-2 hidden text-[11.5px] leading-5 text-muted-foreground sm:block">{sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-muted-foreground sm:hidden">
          Les volumes techniques, signaux de rapprochement et référentiels géographiques sont des mesures distinctes ; ils ne décrivent pas tous le nombre de biens publiés dans Search.
        </p>
      </Container>
    </section>
  );
}
