"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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

  const value = useMemo<PropertySelectionContextValue>(
    () => ({
      selection,
      activeListing,
      visibleListings: [...registeredListings.values()],
      registerListing: (listing) => {
        const key = `${getCanonicalPropertyId(listing)}:${listing.id}`;
        setRegisteredListings((current) => {
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
      },
      hoverListing: (listing, origin = "list") => {
        setSelection((current) => {
          if (current.interaction === "selected") return current;
          setActiveListing(listing);
          return hoverProperty(listing, origin);
        });
      },
      clearHover: () => {
        setSelection((current) => {
          const next = clearPropertyHover(current);
          if (next.interaction === "idle") setActiveListing(null);
          return next;
        });
      },
      selectListing: (listing, origin = "list") => {
        setActiveListing(listing);
        setSelection(selectProperty(listing, origin));
      },
      clearSelection: () => {
        setSelection(EMPTY_PROPERTY_SELECTION);
        setActiveListing(null);
      },
      isActive: (listing) => isListingInSelectedProperty(listing, selection),
    }),
    [activeListing, registeredListings, selection],
  );

  return <PropertySelectionContext.Provider value={value}>{children}</PropertySelectionContext.Provider>;
}

export function usePropertySelection(): PropertySelectionContextValue {
  const value = useContext(PropertySelectionContext);
  if (!value) {
    throw new Error("usePropertySelection must be used inside PropertySelectionProvider");
  }
  return value;
}
