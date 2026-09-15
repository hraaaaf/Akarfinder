"use client";

import { useCallback, useEffect, useRef } from "react";
import { PremiumInteractiveMap } from "@/components/map/PremiumInteractiveMap";

function toMapExploreHref(rawHref: string): string | null {
  const match = rawHref.match(/^\/immobilier\/([^/?#]+)\/([^/?#]+)(?:[?#].*)?$/);
  if (!match) return null;
  const [, city, district] = match;
  return `/map?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&layer=explore`;
}

export function PremiumInteractiveMapBridge() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const rewriteLinks = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>('a[href^="/immobilier/"]').forEach((anchor) => {
      const destination = toMapExploreHref(anchor.getAttribute("href") ?? "");
      if (destination) anchor.setAttribute("href", destination);
    });
  }, []);

  useEffect(() => {
    rewriteLinks();
    const root = rootRef.current;
    if (!root) return;
    const observer = new MutationObserver(rewriteLinks);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rewriteLinks]);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[href^="/map?"]');
    if (!anchor || !rootRef.current?.contains(anchor)) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!href.includes("city=") || !href.includes("district=") || !href.includes("layer=explore")) return;
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  }, []);

  return (
    <div ref={rootRef} onClickCapture={handleClickCapture} data-premium-map-bridge="n3">
      <PremiumInteractiveMap />
    </div>
  );
}
