"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const MapNeighborhoodExperienceDynamic = dynamic(
  () =>
    import("@/components/map/MapNeighborhoodExperience").then((mod) => ({
      default: mod.MapNeighborhoodExperience,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-deepblue">
        <div className="text-center text-white">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-[14px] font-bold text-white/72">Chargement de la carte…</p>
        </div>
      </div>
    ),
  },
);

type MapNeighborhoodClientProps = { initialCity?: string };

export function MapNeighborhoodClient(props: MapNeighborhoodClientProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  // Compatibility adapter for the legacy MapLibre marker factory. A city marker
  // is an exploration control, not an implicit Search CTA: keep the user inside
  // /map and reload the map with that canonical city selected.
  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const cluster = target?.closest("a.maplibre-cluster-marker") as HTMLAnchorElement | null;
    if (!cluster) return;
    const href = cluster.getAttribute("href");
    if (!href) return;
    const url = new URL(href, window.location.origin);
    const city = url.searchParams.get("city");
    if (!city) return;
    event.preventDefault();
    event.stopPropagation();
    router.push(`/map?city=${encodeURIComponent(city)}`);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyPublicWording = () => {
      for (const paragraph of root.querySelectorAll("p")) {
        const text = paragraph.textContent?.trim() ?? "";
        if (text === "Intelligence quartier · Repères indicatifs") {
          paragraph.textContent = "Repères quartier · Données indicatives";
        } else if (text === "Intelligence quartier · AkarFinder") {
          paragraph.textContent = "Repères quartier · AkarFinder";
        }
      }
    };

    applyPublicWording();
    const observer = new MutationObserver(applyPublicWording);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} onClickCapture={handleClickCapture}>
      <MapNeighborhoodExperienceDynamic {...props} />
    </div>
  );
}
