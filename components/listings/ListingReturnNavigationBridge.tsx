"use client";

import { useEffect } from "react";
import { sanitizeReturnHref } from "@/lib/ux/navigation-continuity";

export function ListingReturnNavigationBridge({ returnHref }: { returnHref?: string | null }) {
  useEffect(() => {
    const safeReturnHref = sanitizeReturnHref(returnHref);
    if (!safeReturnHref) return;

    const root = document.querySelector<HTMLElement>('[data-announcement-premium-shell]');
    const anchor = root?.querySelector<HTMLAnchorElement>('main section > a[href="/search"]');
    if (anchor && anchor.getAttribute("href") !== safeReturnHref) {
      anchor.setAttribute("href", safeReturnHref);
    }
  }, [returnHref]);

  return null;
}
