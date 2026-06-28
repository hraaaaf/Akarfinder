"use client";

// OVERNIGHT-MVP-HARDENING-1 — Phase 2 : helper client de tracking.
// Fire-and-forget : n'attend pas, ne jette jamais. keepalive pour survivre à
// une navigation. Si l'appel échoue, l'UI continue normalement.

import type { ConversionEventInput } from "./types";

export function track(input: ConversionEventInput): void {
  try {
    const body = JSON.stringify(input);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // jamais bloquant
  }
}
