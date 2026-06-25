"use client";

import { useEffect, useState } from "react";
import {
  COMPARE_STORAGE_EVENT,
  dispatchCompareUpdated,
  readCompareIds,
  type StorageLike,
} from "@/lib/compare/compare-storage";

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function useCompareSelection() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const storage = getBrowserStorage();
    setIds(readCompareIds(storage));

    function syncFromStorage() {
      setIds(readCompareIds(storage));
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
    window.addEventListener(COMPARE_STORAGE_EVENT, syncFromEvent as EventListener);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(COMPARE_STORAGE_EVENT, syncFromEvent as EventListener);
    };
  }, []);

  return {
    ids,
    setIds(nextIds: string[]) {
      setIds(nextIds);
      dispatchCompareUpdated(nextIds);
    },
  };
}
