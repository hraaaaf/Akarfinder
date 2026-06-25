"use client";

import { useEffect, useState } from "react";
import {
  FAVORITES_STORAGE_EVENT,
  dispatchFavoritesUpdated,
  readFavoriteIds,
} from "@/lib/favorites/favorites-storage";

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function useFavoriteSelection() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const storage = getBrowserStorage();
    setIds(readFavoriteIds(storage));

    function syncFromStorage() {
      setIds(readFavoriteIds(storage));
    }

    function syncFromEvent(event: Event) {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      if (detail?.ids) {
        setIds(detail.ids);
        return;
      }
      syncFromStorage();
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(FAVORITES_STORAGE_EVENT, syncFromEvent as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(FAVORITES_STORAGE_EVENT, syncFromEvent as EventListener);
    };
  }, []);

  return {
    ids,
    setIds(nextIds: string[]) {
      setIds(nextIds);
      dispatchFavoritesUpdated(nextIds);
    },
  };
}
