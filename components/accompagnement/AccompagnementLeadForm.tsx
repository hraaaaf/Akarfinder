"use client";

import { useState } from "react";
import type { LeadApiResponse } from "@/lib/leads/types";

export function AccompagnementLeadForm({ intent = "neuf" }: { intent?: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  const phoneOk = phone.replace(/[\s\-().]/g, "").length >= 8;
  const canSubmit = phoneOk && consent && !pending;

  async function submit() {
    if (!canSubmit) return;
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            project: intent,
            name: name || undefined,
            phone,
            message: message || undefined,
            consentContact: true,
            consentIndicatif: true,
          },
          source_channel: "accompagnement",
          source_page: "/accompagnement",
        }),
      });
      const payload = (await response.json()) as LeadApiResponse;
      if (payload.ok) setResult({ ok: true });
      else setResult({ ok: false, error: payload.error });
    } catch {
      setResult({ ok: false, error: "Connexion impossible au serveur." });
    } finally {
      setPending(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-center">
        <h2 className="text-xl font-extrabold text-emerald-900">Demande enregistrée</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-800">Votre demande d’accompagnement a bien été transmise. Aucun projet ou disponibilité n’est garanti avant confirmation.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,35,65,0.08)] sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Nom
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" />
        </label>
        <label className="text-sm font-bold text-slate-700">Téléphone / WhatsApp
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6XX XXX XXX" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Votre demande
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Projet neuf recherché, ville, budget ou question..." className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#60A5FA]" />
        </label>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>J’accepte d’être recontacté au sujet de ma demande. Les informations sont indicatives et à confirmer avant toute décision.</span>
      </label>
      {result && !result.ok ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{result.error}</p> : null}
      <button type="button" onClick={submit} disabled={!canSubmit} className="mt-5 w-full rounded-xl bg-[#0B63CE] px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">
        {pending ? "Envoi en cours…" : "Demander à être recontacté"}
      </button>
    </div>
  );
}
