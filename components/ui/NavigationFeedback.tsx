"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./navigation-feedback.module.css";

const SHOW_DELAY_MS = 280;
const FAILSAFE_MS = 8_000;

function isSameDocumentHashNavigation(destination: URL, current: URL) {
  return (
    destination.origin === current.origin &&
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash !== current.hash
  );
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    showTimerRef.current = null;
    failsafeTimerRef.current = null;
    setVisible(false);
  }, []);

  const begin = useCallback(() => {
    reset();
    showTimerRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    failsafeTimerRef.current = setTimeout(reset, FAILSAFE_MS);
  }, [reset]);

  useEffect(() => {
    reset();
  }, [pathname, searchKey, reset]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const element = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(element instanceof HTMLAnchorElement)) return;
      if (element.target === "_blank" || element.hasAttribute("download")) return;
      if (element.dataset.navigationFeedback === "off") return;

      const href = element.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const current = new URL(window.location.href);
      const destination = new URL(element.href, current);
      if (destination.href === current.href || isSameDocumentHashNavigation(destination, current)) return;

      begin();
    };

    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.navigationFeedback === "off") return;
      begin();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", reset);
    window.addEventListener("popstate", reset);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("popstate", reset);
      reset();
    };
  }, [begin, reset]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} data-navigation-feedback role="status" aria-live="polite">
      <div className={styles.card}>
        <span className={styles.radar} aria-hidden="true">
          <span className={styles.wave} />
          <span className={`${styles.wave} ${styles.waveTwo}`} />
          <MapPin className={styles.pin} strokeWidth={2.3} />
        </span>
        <span className={styles.label}>Chargement…</span>
      </div>
    </div>
  );
}
