"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Listing } from "@/lib/listings/types";
import {
  EMPTY_PROPERTY_SELECTION,
  clearPropertyHover,
  getCanonicalPropertyId,
  hoverProperty,
  isListingInSelectedProperty,
  selectProperty,
  type PropertySelectionState,
} from "@/lib/ux/property-selection";

type PropertySelectionContextValue = {
  selection: PropertySelectionState;
  activeListing: Listing | null;
  visibleListings: Listing[];
  registerListing: (listing: Listing) => () => void;
  hoverListing: (listing: Listing, origin?: "list" | "map") => void;
  clearHover: () => void;
  selectListing: (listing: Listing, origin?: "list" | "map" | "preview") => void;
  clearSelection: () => void;
  isActive: (listing: Pick<Listing, "id" | "duplicate_group_id">) => boolean;
};

const PropertySelectionContext = createContext<PropertySelectionContextValue | null>(null);

export function PropertySelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<PropertySelectionState>(EMPTY_PROPERTY_SELECTION);
  const [activeListing, setActiveListing] = useState<Listing | null>(null);
  const [registeredListings, setRegisteredListings] = useState<Map<string, Listing>>(() => new Map());

  const registerListing = useCallback((listing: Listing) => {
    const key = `${getCanonicalPropertyId(listing)}:${listing.id}`;
    setRegisteredListings((current) => {
      const existing = current.get(key);
      if (existing === listing) return current;
      const next = new Map(current);
      next.set(key, listing);
      return next;
    });
    return () => {
      setRegisteredListings((current) => {
        if (!current.has(key)) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    };
  }, []);

  const hoverListing = useCallback((listing: Listing, origin: "list" | "map" = "list") => {
    setSelection((current) => {
      if (current.interaction === "selected") return current;
      setActiveListing(listing);
      return hoverProperty(listing, origin);
    });
  }, []);

  const clearHover = useCallback(() => {
    setSelection((current) => {
      const next = clearPropertyHover(current);
      if (next.interaction === "idle") setActiveListing(null);
      return next;
    });
  }, []);

  const selectListing = useCallback((listing: Listing, origin: "list" | "map" | "preview" = "list") => {
    setActiveListing(listing);
    setSelection(selectProperty(listing, origin));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_PROPERTY_SELECTION);
    setActiveListing(null);
  }, []);

  const isActive = useCallback(
    (listing: Pick<Listing, "id" | "duplicate_group_id">) => isListingInSelectedProperty(listing, selection),
    [selection],
  );

  const value = useMemo<PropertySelectionContextValue>(
    () => ({
      selection,
      activeListing,
      visibleListings: [...registeredListings.values()],
      registerListing,
      hoverListing,
      clearHover,
      selectListing,
      clearSelection,
      isActive,
    }),
    [activeListing, clearHover, clearSelection, hoverListing, isActive, registerListing, registeredListings, selectListing, selection],
  );

  return <PropertySelectionContext.Provider value={value}>{children}</PropertySelectionContext.Provider>;
}

export function useOptionalPropertySelection(): PropertySelectionContextValue | null {
  return useContext(PropertySelectionContext);
}

export function usePropertySelection(): PropertySelectionContextValue {
  const value = useOptionalPropertySelection();
  if (!value) throw new Error("usePropertySelection must be used inside PropertySelectionProvider");
  return value;
}
