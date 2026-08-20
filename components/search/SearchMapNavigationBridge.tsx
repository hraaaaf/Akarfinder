"use client";

import { useEffect } from "react";
import { CANONICAL_SEARCH_SESSION_EVENT } from "@/components/search/useCanonicalSearchSession";
import {
  buildMapHref,
  mapNavigationStateFromUrlSearchParams,
} from "@/lib/map/map-navigation-state";
import {
  buildListingDetailHref,
  sanitizeReturnHref,
} from "@/lib/ux/navigation-continuity";

type SearchMapNavigationBridgeProps = {
  projectId?: string;
};

export function SearchMapNavigationBridge({ projectId }: SearchMapNavigationBridgeProps) {
  useEffect(() => {
    const syncNavigationLinks = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const state = mapNavigationStateFromUrlSearchParams(searchParams);
      if (projectId) state.project_id = projectId;
      const mapHref = buildMapHref(state);
      const returnHref = sanitizeReturnHref(
        `${window.location.pathname}${window.location.search}`,
      );
      const continuityProjectId = projectId ?? searchParams.get("project_id");

      for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="/map"]')) {
        if (anchor.getAttribute("href") !== mapHref) anchor.setAttribute("href", mapHref);
      }

      if (returnHref) {
        for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="/listings/"]')) {
          const currentHref = anchor.getAttribute("href");
          if (!currentHref) continue;
          const nextHref = buildListingDetailHref(
            currentHref,
            returnHref,
            continuityProjectId,
          );
          if (currentHref !== nextHref) anchor.setAttribute("href", nextHref);
        }
      }
    };

    syncNavigationLinks();
    const observer = new MutationObserver(syncNavigationLinks);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    window.addEventListener(CANONICAL_SEARCH_SESSION_EVENT, syncNavigationLinks);
    window.addEventListener("popstate", syncNavigationLinks);

    return () => {
      observer.disconnect();
      window.removeEventListener(CANONICAL_SEARCH_SESSION_EVENT, syncNavigationLinks);
      window.removeEventListener("popstate", syncNavigationLinks);
    };
  }, [projectId]);

  return null;
}
