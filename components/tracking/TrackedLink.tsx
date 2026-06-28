"use client";

// OVERNIGHT-MVP-HARDENING-1 — Phase 2 : Link qui émet un évènement de conversion
// au clic (fire-and-forget). Wrapper léger autour de next/link, n'altère pas la nav.

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/tracking/track";
import type { ConversionEventInput } from "@/lib/tracking/types";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: ConversionEventInput;
};

export function TrackedLink({ event, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
    />
  );
}
