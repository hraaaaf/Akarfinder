"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker, Popup as MapLibrePopup } from "maplibre-gl";
import type {
  NeighborhoodContextAnchorReadV1,
  NeighborhoodContextReadModelV1,
} from "@/lib/neighborhood-context/read-model";
import {
  availableMapPoiFilters,
  filterMapPoiAnchors,
  formatMapPoiDistance,
  mapPoiCategoryLabel,
  mapPoiCategorySymbol,
  NEIGHBORHOOD_MAP_POI_FILTER_META,
  type NeighborhoodMapPoiFilter,
} from "@/lib/neighborhood-context/map-poi-presentation";

type Placement = "market" | "national" | "generic";

type Props = {
  map: MapLibreMap | null;
  mapReady: boolean;
  citySlug: string | null;
  districtSlug: string | null;
  placement: Placement;
};

type ApiPayload =
  | { status: "ok"; context: NeighborhoodContextReadModelV1 }
  | { status: "not_found" | "invalid_request" | "unavailable"; [key: string]: unknown };

type LoadState = "idle" | "loading" | "ready" | "unavailable";

const PLACEMENT_CLASS: Record<Placement, string> = {
  market: "left-3 top-[278px] md:left-4 md:top-[216px]",
  national: "left-3 top-[116px] lg:left-[250px] lg:top-[92px]",
  generic: "left-3 top-[154px] lg:left-4 lg:top-[112px]",
};

function safeSlug(value: string | null): string | null {
  if (!value) return null;
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug && slug.length <= 120 ? slug : null;
}

function createMarkerElement(anchor: NeighborhoodContextAnchorReadV1): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.dataset.neighborhoodContextPoi = anchor.poi_id;
  element.dataset.neighborhoodContextPoiCategory = anchor.category;
  element.className = "group grid h-11 w-11 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2";
  element.setAttribute("aria-label", `${anchor.name} · ${mapPoiCategoryLabel(anchor.category)} · ${anchor.territorial_wording}`);

  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  visual.textContent = mapPoiCategorySymbol(anchor.category);
  visual.style.cssText = [
    "display:grid",
    "width:30px",
    "height:30px",
    "place-items:center",
    "border-radius:999px",
    "background:#ffffff",
    "border:2px solid #0B63CE",
    "box-shadow:0 7px 18px rgba(15,35,66,.20)",
    "color:#0B63CE",
    "font:800 11px/1 Arial,sans-serif",
    "transition:transform .15s ease,background .15s ease,color .15s ease",
  ].join(";");
  element.appendChild(visual);
  element.addEventListener("mouseenter", () => {
    visual.style.transform = "scale(1.08)";
    visual.style.background = "#0B63CE";
    visual.style.color = "#ffffff";
  });
  element.addEventListener("mouseleave", () => {
    visual.style.transform = "scale(1)";
    visual.style.background = "#ffffff";
    visual.style.color = "#0B63CE";
  });
  return element;
}

function appendText(parent: HTMLElement, text: string, className: string) {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function createPopupContent(anchor: NeighborhoodContextAnchorReadV1, close: () => void): HTMLElement {
  const card = document.createElement("div");
  card.dataset.neighborhoodContextPoiPopup = anchor.poi_id;
  card.className = "relative min-w-[230px] max-w-[290px] rounded-[18px] border border-white/80 bg-white p-3.5 pr-12 text-[#0B1F3A] shadow-[0_18px_48px_rgba(15,35,66,0.20)] dark:border-white/10 dark:bg-[#0A1A2F] dark:text-white";

  appendText(card, mapPoiCategoryLabel(anchor.category).toUpperCase(), "text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]");
  appendText(card, anchor.name, "mt-1 text-[15px] font-extrabold leading-5 tracking-[-0.02em]");

  const distance = formatMapPoiDistance(anchor.distance_to_reference_m);
  appendText(
    card,
    distance ? `${anchor.territorial_wording} · ${distance}` : anchor.territorial_wording,
    "mt-1.5 text-[10.5px] font-semibold leading-4 text-slate-500 dark:text-slate-300",
  );
  appendText(
    card,
    `${anchor.attribution} · observé ${new Date(anchor.observed_at).toLocaleDateString("fr-FR")}`,
    "mt-2 border-t border-slate-200 pt-2 text-[9px] font-semibold leading-4 text-slate-400 dark:border-white/10 dark:text-slate-400",
  );

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-xl text-[18px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] dark:hover:bg-white/10 dark:hover:text-white";
  closeButton.setAttribute("aria-label", `Fermer ${anchor.name}`);
  closeButton.textContent = "×";
  closeButton.addEventListener("click", close);
  card.appendChild(closeButton);
  return card;
}

export function NeighborhoodContextPoiOverlay({
  map,
  mapReady,
  citySlug,
  districtSlug,
  placement,
}: Props) {
  const city = useMemo(() => safeSlug(citySlug), [citySlug]);
  const district = useMemo(() => safeSlug(districtSlug), [districtSlug]);
  const [context, setContext] = useState<NeighborhoodContextReadModelV1 | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [enabled, setEnabled] = useState(true);
  const [filter, setFilter] = useState<NeighborhoodMapPoiFilter>("all");
  const popupRef = useRef<MapLibrePopup | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  useEffect(() => {
    popupRef.current?.remove();
    popupRef.current = null;
    setContext(null);
    setFilter("all");
    setEnabled(true);
    if (!city || !district) {
      setLoadState("idle");
      return;
    }

    const controller = new AbortController();
    setLoadState("loading");
    void fetch(`/api/geo/neighborhood-context?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as ApiPayload;
        if (!response.ok || payload.status !== "ok") throw new Error(`context ${response.status}`);
        return payload.context;
      })
      .then((nextContext) => {
        if (controller.signal.aborted) return;
        setContext(nextContext);
        setEnabled(nextContext.anchor_count > 0);
        setLoadState(nextContext.anchor_count > 0 ? "ready" : "unavailable");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn("[NeighborhoodContextPoiOverlay]", error);
        setContext(null);
        setLoadState("unavailable");
      });

    return () => controller.abort();
  }, [city, district]);

  const filters = useMemo(() => availableMapPoiFilters(context?.anchors ?? []), [context]);
  const visibleAnchors = useMemo(
    () => enabled ? filterMapPoiAnchors(context?.anchors ?? [], filter) : [],
    [context, enabled, filter],
  );

  useEffect(() => {
    popupRef.current?.remove();
    popupRef.current = null;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];
    if (!map || !mapReady || !enabled || !visibleAnchors.length) return;

    let cancelled = false;
    void import("maplibre-gl").then(({ Marker, Popup }) => {
      if (cancelled) return;
      for (const anchor of visibleAnchors) {
        const element = createMarkerElement(anchor);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          popupRef.current?.remove();
          const popup = new Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: "300px",
            offset: 18,
            className: "akarfinder-neighborhood-context-popup",
          });
          const content = createPopupContent(anchor, () => popup.remove());
          popup
            .setLngLat([anchor.longitude, anchor.latitude])
            .setDOMContent(content)
            .addTo(map);
          popupRef.current = popup;
        });
        const marker = new Marker({ element, anchor: "center" })
          .setLngLat([anchor.longitude, anchor.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      }
    });

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
    };
  }, [enabled, map, mapReady, visibleAnchors]);

  if (!city || !district || loadState === "idle" || loadState === "loading") return null;

  return (
    <>
      <style>{`
        .akarfinder-neighborhood-context-popup { z-index: 60 !important; }
        .akarfinder-neighborhood-context-popup .maplibregl-popup-content { background: transparent; border-radius: 18px; box-shadow: none; padding: 0; }
        .akarfinder-neighborhood-context-popup .maplibregl-popup-tip { border-top-color: rgba(255,255,255,.96); }
      `}</style>
      <div
        className={`pointer-events-auto absolute z-40 max-w-[calc(100vw-24px)] ${PLACEMENT_CLASS[placement]}`}
        data-neighborhood-context-poi-controls
        data-neighborhood-context-poi-placement={placement}
      >
        {loadState === "unavailable" || !context ? (
          <div
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/80 bg-white/92 px-3.5 text-[10.5px] font-extrabold text-slate-500 shadow-[0_10px_28px_rgba(15,35,66,0.13)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/92 dark:text-slate-300"
            data-neighborhood-context-poi-unavailable
          >
            <MapPin size={14} aria-hidden="true" />
            Repères indisponibles
          </div>
        ) : (
          <div className={placement === "national" ? "flex max-w-[calc(100vw-24px)] items-center gap-1.5 overflow-x-auto" : "grid gap-1.5"}>
            <button
              type="button"
              aria-pressed={enabled}
              onClick={() => setEnabled((value) => !value)}
              className={`inline-flex min-h-10 w-max shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-extrabold shadow-[0_10px_28px_rgba(15,35,66,0.12)] backdrop-blur-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${enabled ? "border-brand-primary bg-brand-primary text-white" : "border-white/80 bg-white/94 text-[#0B1F3A] dark:border-white/10 dark:bg-[#0A1A2F]/94 dark:text-white"}`}
              data-neighborhood-context-poi-toggle
            >
              <MapPin size={13} aria-hidden="true" />
              Repères · {context.anchor_count}
            </button>

            {enabled && filters.length > 1 ? (
              <div
                className="flex max-w-[min(720px,calc(100vw-24px))] shrink-0 gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/94 p-1 shadow-[0_10px_28px_rgba(15,35,66,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0A1A2F]/94"
                data-neighborhood-context-poi-filters
              >
                {filters.map((candidate) => {
                  const meta = NEIGHBORHOOD_MAP_POI_FILTER_META.find((item) => item.id === candidate)!;
                  const active = filter === candidate;
                  return (
                    <button
                      key={candidate}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(candidate)}
                      className={`min-h-9 shrink-0 rounded-full px-3 text-[9.5px] font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${active ? "bg-brand-primary text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"}`}
                      data-neighborhood-context-poi-filter={candidate}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
