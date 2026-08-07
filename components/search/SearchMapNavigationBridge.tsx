"use client";

import { useEffect } from "react";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import {
  buildMapHref,
  mapNavigationStateFromUrlSearchParams,
} from "@/lib/map/map-navigation-state";

type SearchMapNavigationBridgeProps = {
  projectId?: string;
};

export function SearchMapNavigationBridge({ projectId }: SearchMapNavigationBridgeProps) {
  useEffect(() => {
    const syncMapLinks = () => {
      const state = mapNavigationStateFromUrlSearchParams(
        new URLSearchParams(window.location.search),
      );
      if (projectId) state.project_id = projectId;
      const href = buildMapHref(state);

      for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="/map"]')) {
        if (anchor.getAttribute("href") !== href) anchor.setAttribute("href", href);
      }
    };

    syncMapLinks();
    const observer = new MutationObserver(syncMapLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    window.addEventListener(CANONICAL_SEARCH_SESSION_EVENT, syncMapLinks);
    window.addEventListener("popstate", syncMapLinks);

    return () => {
      observer.disconnect();
      window.removeEventListener(CANONICAL_SEARCH_SESSION_EVENT, syncMapLinks);
      window.removeEventListener("popstate", syncMapLinks);
    };
  }, [projectId]);

  return null;
}
