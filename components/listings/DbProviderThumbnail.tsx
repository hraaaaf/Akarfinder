"use client";

// MUBAWAB-DB-THUMBNAILS-RISK-ACCEPTED-1
// Risk-accepted single public thumbnail — remote URL only, never downloaded/
// cached/rehosted. Falls back to the deterministic placeholder visual on
// error or absence, so the card/hero is never broken or left blank.

import { useState } from "react";
import { ListingVisual } from "@/components/listings/ListingVisual";
import type { Listing } from "@/lib/listings/types";

export function DbProviderThumbnail({
  listing,
  thumbnailUrl,
  className,
  imgClassName,
}: {
  listing: Listing;
  thumbnailUrl: string;
  className?: string;
  imgClassName?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <ListingVisual listing={listing} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbnailUrl}
      alt={listing.title}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={imgClassName ?? className}
    />
  );
}
