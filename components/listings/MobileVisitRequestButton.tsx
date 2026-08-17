"use client";

import { useState, type FormEvent } from "react";
import { ui } from "@/components/ui/design-system";
import { normalizeVisitPhone } from "@/lib/leads/visit-request";
import type { VisitRequestApiResponse } from "@/lib/leads/types";

export function MobileVisitRequestButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/visit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          full_name: fullName,
          phone_whatsapp: normalizeVisitPhone(phone),
          consent_contact: consent,
          source_page: `/listings/${listingId}`,
        }),
      });
      const data = (await response.json()) as VisitRequestApiResponse;
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setSent(true);
      setOpen(false);
      setFullName("");
      setPhone("");
      setConsent(false);
    } catch {
      setError("Impossible d’envoyer la demande pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Demander une visite"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0B63CE] px-3 py-3 text-[13px] font-extrabold text-white shadow-[0_6px_18px_rgba(11,99,206,0.2)] transition hover:bg-[#0959B8] motion-reduce:transition-none"
      >
        {sent ? "Visite demandée" : "Visite"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Demander une visite">
          <div className="w-full rounded-t-[1.6rem] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[1.6rem]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={ui.eyebrow}>Demande de visite</p>
                <p className="mt-1 text-[13px] text-slate-600">Laissez vos coordonnées. La visite reste à confirmer.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 rounded-full border border-slate-200 text-lg text-slate-600" aria-label="Fermer">×</button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Nom
                <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={`${ui.field} mt-2 min-h-12 px-4 text-[14px] font-medium normal-case tracking-normal text-deepblue`} />
              </label>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Téléphone / WhatsApp
                <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${ui.field} mt-2 min-h-12 px-4 text-[14px] font-medium normal-case tracking-normal text-deepblue`} />
              </label>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-[12.5px] leading-5 text-slate-600">
                <input required type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                J’accepte d’être recontacté au sujet de cette demande de visite.
              </label>
              {error ? <p className="text-[12.5px] font-semibold text-red-600">{error}</p> : null}
              <button disabled={submitting} type="submit" className={`${ui.primaryAction} w-full disabled:opacity-60`}>
                {submitting ? "Envoi…" : "Envoyer ma demande"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
