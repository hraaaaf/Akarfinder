"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

import { MonProjetWizardP2 } from "@/components/companion/MonProjetWizardP2";

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isTabbable(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return element.isConnected
    && !element.hasAttribute("disabled")
    && style.visibility !== "hidden"
    && style.display !== "none"
    && element.getClientRects().length > 0;
}

export function FinderLauncher() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isTabbable);

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const active = document.activeElement;
      const currentIndex = focusable.findIndex((element) => element === active);
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex < 0 || currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;

      event.preventDefault();
      focusable[nextIndex]?.focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      launcherRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-[88px] right-4 z-[70] inline-flex min-h-12 items-center gap-2 rounded-full border border-[#CFE0F5] bg-white px-4 text-sm font-extrabold text-[#084FA8] shadow-[0_16px_45px_rgba(7,27,51,0.18)] transition hover:-translate-y-0.5 hover:border-[#0B63CE] sm:bottom-6 sm:right-6"
        data-finder-launcher
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0B63CE] text-white"><Sparkles size={16} aria-hidden="true" /></span>
        Akar Sense
      </button>

      {open ? <div className="fixed inset-0 z-[100]" role="presentation">
        <button type="button" tabIndex={-1} aria-label="Fermer Akar Sense" onClick={() => setOpen(false)} className="absolute inset-0 hidden bg-[#071B33]/30 backdrop-blur-[2px] sm:block" />
        <section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Akar Sense, assistant de projet immobilier" className="absolute inset-0 flex h-[100dvh] w-full flex-col bg-[#F4F8FC] sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(520px,94vw)] sm:shadow-[-24px_0_70px_rgba(7,27,51,0.18)]" data-finder-panel>
          <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#DCE8F5] bg-white px-4 sm:px-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">AkarFinder</p>
              <p className="text-sm font-extrabold text-[#071B33]">Akar Sense · Affinez sans quitter la recherche</p>
            </div>
            <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Fermer Akar Sense" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"><X size={18} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
            <MonProjetWizardP2 />
          </div>
        </section>
      </div> : null}
    </>
  );
}
