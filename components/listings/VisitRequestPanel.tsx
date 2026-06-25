"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Listing } from "@/lib/listings/types";
import {
  formatVisitSlot,
  getVisitSuccessCopy,
  normalizeVisitPhone,
} from "@/lib/leads/visit-request";
import type { VisitDaypart, VisitRequestApiResponse } from "@/lib/leads/types";

const DAYPARTS: VisitDaypart[] = [
  "Matin",
  "Midi",
  "Après-midi",
  "Soir",
  "Flexible",
];

type VisitRequestPanelProps = {
  listing: Listing;
  compact?: boolean;
};

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VisitRequestPanel({
  listing,
  compact = false,
}: VisitRequestPanelProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<VisitRequestApiResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneWhatsApp, setPhoneWhatsApp] = useState("");
  const [preferredSlot1, setPreferredSlot1] = useState("");
  const [preferredSlot2, setPreferredSlot2] = useState("");
  const [daypart, setDaypart] = useState<VisitDaypart | "">("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);

  const successCopy = useMemo(
    () => getVisitSuccessCopy(listing.source_access_level ?? "indexed_only"),
    [listing.source_access_level]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/visit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listing.id,
          full_name: fullName,
          phone_whatsapp: normalizeVisitPhone(phoneWhatsApp),
          preferred_slot_1: preferredSlot1 || undefined,
          preferred_slot_2: preferredSlot2 || undefined,
          visit_preferred_daypart: daypart || undefined,
          visit_message: message || undefined,
          consent_contact: consent,
          source_page: `/listings/${listing.id}`,
        }),
      });

      const data = (await response.json()) as VisitRequestApiResponse;
      if (!data.ok) {
        setError(data.error);
        return;
      }

      setSuccess(data);
      setOpen(false);
      setFullName("");
      setPhoneWhatsApp("");
      setPreferredSlot1("");
      setPreferredSlot2("");
      setDaypart("");
      setMessage("");
      setConsent(false);
    } catch {
      setError(
        "Impossible d'envoyer la demande pour le moment. Réessayez ou contactez-nous via WhatsApp."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const wrapperClass = compact
    ? "rounded-[1.25rem] border border-[#eadfca] bg-white p-4 shadow-[0_6px_22px_rgba(7,27,51,0.05)]"
    : "rounded-[1.25rem] border border-[#e3d1aa] bg-[#fffaf0] p-4";

  return (
    <>
      {/* Compact trigger block — always visible in sidebar / mobile inline */}
      <div className={wrapperClass}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-bronze-700">
          Demande de visite
        </p>

        {success?.ok ? (
          <>
            <p className="mt-1 text-[12.5px] leading-5 text-gray-600">
              Demande enregistrée par AkarFinder.
            </p>
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[13px] font-extrabold text-emerald-800">
                {successCopy.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-5 text-emerald-700">
                {successCopy.description}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-emerald-700/80">
                {successCopy.pendingLabel}
              </p>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="mt-3 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-[12.5px] font-bold text-emerald-800 transition hover:bg-emerald-50"
              >
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-[12.5px] leading-5 text-gray-600">
              Proposez un créneau. La visite reste en attente de confirmation.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#9b7838] to-[#b08942] px-4 py-3 text-[13.5px] font-extrabold text-white shadow-[0_10px_22px_rgba(155,120,56,0.24)] transition hover:brightness-105"
            >
              Demander une visite
            </button>
          </>
        )}
      </div>

      {/* Modal — bottom sheet on mobile, centered on sm+ */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative z-10 w-full max-h-[92dvh] overflow-y-auto rounded-t-[1.8rem] bg-[#fffdf8] shadow-[0_-8px_40px_rgba(7,27,51,0.18)] sm:max-w-[560px] sm:rounded-[1.8rem] sm:shadow-[0_20px_60px_rgba(7,27,51,0.22)]">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eadfca] bg-[#fffdf8] px-6 py-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
                  Demande de visite
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12.5px] text-gray-500">
                  {listing.title}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="ml-3 shrink-0 rounded-full bg-[#f0ebe0] p-2 text-deepblue transition hover:bg-[#e8e0d0]"
                aria-label="Fermer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l12 12M14 2L2 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              ) : null}

              {/* Nom + Téléphone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                    Nom <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3.5 text-[14px] text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10"
                    placeholder="Votre nom"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                    Téléphone WhatsApp <span className="text-red-500">*</span>
                  </span>
                  <input
                    required
                    type="tel"
                    value={phoneWhatsApp}
                    onChange={(e) => setPhoneWhatsApp(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3.5 text-[14px] text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10"
                    placeholder="+212 6XX XXX XXX"
                  />
                </label>
              </div>

              {/* Créneaux */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                    Créneau préféré 1
                  </span>
                  <input
                    type="datetime-local"
                    value={preferredSlot1}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setPreferredSlot1(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3.5 text-[14px] text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10"
                  />
                  {preferredSlot1 ? (
                    <p className="mt-1 text-[11.5px] font-medium text-gray-400">
                      {formatVisitSlot(preferredSlot1)}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                    Créneau préféré 2{" "}
                    <span className="font-normal lowercase text-gray-400">
                      (optionnel)
                    </span>
                  </span>
                  <input
                    type="datetime-local"
                    value={preferredSlot2}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setPreferredSlot2(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3.5 text-[14px] text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10"
                  />
                  {preferredSlot2 ? (
                    <p className="mt-1 text-[11.5px] font-medium text-gray-400">
                      {formatVisitSlot(preferredSlot2)}
                    </p>
                  ) : null}
                </label>
              </div>

              {/* Moment préféré — chips */}
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                  Moment préféré
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYPARTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDaypart(daypart === item ? "" : item)}
                      className={`rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
                        daypart === item
                          ? "bg-deepblue text-white"
                          : "border border-[#d8c8a3] bg-white text-deepblue hover:bg-[#f7f3ea]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <label className="block">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
                  Message{" "}
                  <span className="font-normal lowercase text-gray-400">
                    (optionnel)
                  </span>
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3 text-[14px] text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10"
                  placeholder="Précisez vos disponibilités ou une demande particulière."
                />
              </label>

              {/* Consentement */}
              <div className="rounded-2xl border border-[#efe3cc] bg-white px-5 py-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#d8c8a3] accent-deepblue"
                  />
                  <span className="text-[13.5px] leading-5 text-gray-700">
                    J&apos;accepte d&apos;être recontacté au sujet de cette
                    demande de visite.
                  </span>
                </label>
                <p className="mt-2.5 text-[12px] leading-5 text-gray-500">
                  La visite reste en attente de confirmation.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#9b7838] to-[#b08942] px-5 py-3.5 text-[14px] font-extrabold text-white shadow-[0_10px_24px_rgba(155,120,56,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {submitting
                    ? "Envoi en cours…"
                    : "Envoyer ma demande de visite"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center rounded-xl border border-[#d8c8a3] bg-white px-5 py-3.5 text-[13.5px] font-bold text-deepblue transition hover:bg-[#f7f3ea]"
                >
                  Fermer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
