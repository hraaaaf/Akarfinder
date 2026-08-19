"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

type NeighborhoodShareButtonProps = {
  title: string;
};

export function NeighborhoodShareButton({ title }: NeighborhoodShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Closing the native share sheet is not an application error.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="grid h-10 w-10 place-items-center rounded-xl border border-border/30 bg-white/85 text-muted-foreground shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/35"
      aria-label="Partager cette fiche quartier"
      data-akarfinder-neighborhood-share
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">{copied ? "Lien copié" : ""}</span>
    </button>
  );
}
