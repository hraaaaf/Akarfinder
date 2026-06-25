"use client";

import { useState } from "react";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResultsGrid } from "@/components/search/SearchResultsGrid";
import { SearchResultsHeader } from "@/components/search/SearchResultsHeader";
import { MapPreview } from "@/components/search/MapPreview";
import type { Listing } from "@/lib/listings/types";
import {
  defaultListingFilters,
  filterListings,
  getMapSummaries,
  getNeighborhoodsForCity,
  getPropertyTypes,
  getSearchCities
} from "@/lib/listings/utils";

export function SearchShell({ listings }: { listings: Listing[] }) {
  const [filters, setFilters] = useState(defaultListingFilters);

  const filteredListings = filterListings(listings, filters);
  const cities = getSearchCities(listings);
  const neighborhoods = getNeighborhoodsForCity(listings, filters.city);
  const propertyTypes = getPropertyTypes(listings);
  const mapSummaries = getMapSummaries(filteredListings);

  return (
    <div className="space-y-6">
      <SearchFilters
        filters={filters}
        cities={cities}
        neighborhoods={neighborhoods}
        propertyTypes={propertyTypes}
        onChange={setFilters}
        onReset={() => setFilters(defaultListingFilters)}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SearchResultsHeader resultCount={filteredListings.length} />
          <SearchResultsGrid listings={filteredListings} />
        </div>

        <MapPreview cityCounts={mapSummaries} />
      </div>
    </div>
  );
}
