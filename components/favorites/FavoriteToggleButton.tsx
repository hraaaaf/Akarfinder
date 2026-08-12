"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import motion from "@/components/ui/perceived-quality.module.css";
import {
  dispatchFavoritesUpdated,
  isFavorited,
  toggleFavoriteId,
} from "@/lib/favorites/favorites-storage";

type FavoriteToggleButtonProps = {
  listingId: string;
  /** "icon" = round icon only (cards). "block" = full-width text button (detail sidebar). */
  variant?: "icon" | "block";
  className?: string;
};

export function FavoriteToggleButton({
  listingId,
  variant = "icon",
  className = "",
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function sync() {
      setFavorited(isFavorited(listingId, window.localStorage));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("akarfinder:favorites-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("akarfinder:favorites-updated", sync);
    };
  }, [listingId]);

  function handleToggle() {
    if (typeof window === "undefined") return;
    const next = toggleFavoriteId(listingId, window.localStorage);
    const nowFavorited = next.includes(listingId);
    setFavorited(nowFavorited);
    dispatchFavoritesUpdated(next);
    setFeedback(nowFavorited ? "Ajouté aux favoris" : "Retiré des favoris");
    setTimeout(() => setFeedback(""), 2200);
  }

  if (variant === "block") {
    return (
      <div className={`space-y-1 ${className}`}>
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={favorited}
          aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13.5px] font-extrabold transition duration-150 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
            favorited
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-[#d8c8a3] bg-[#fffdf8] text-deepblue hover:bg-[#f7f3ea]"
          }`}
        >
          <Heart
            size={16}
            strokeWidth={2}
            fill={favorited ? "currentColor" : "none"}
            className={favorited ? "heart-pop motion-reduce:animate-none" : ""}
            aria-hidden="true"
          />
          {favorited ? "Retiré des favoris" : "Ajouter aux favoris"}
        </button>
        <p aria-live="polite" className="min-h-4 text-center text-[11px] font-semibold text-gray-500">
          {feedback ? <span className={motion.feedbackEnter}>{feedback}</span> : null}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={favorited}
        aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-white transition duration-150 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none ${
          favorited
            ? "border-red-200 text-red-500 hover:bg-red-50"
            : "border-slate-200 text-slate-500 shadow-sm hover:border-red-200 hover:text-red-500"
        }`}
      >
        <Heart
          size={17}
          strokeWidth={2}
          fill={favorited ? "currentColor" : "none"}
          className={favorited ? "heart-pop motion-reduce:animate-none" : ""}
          aria-hidden="true"
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {feedback}
      </span>
    </div>
  );
}