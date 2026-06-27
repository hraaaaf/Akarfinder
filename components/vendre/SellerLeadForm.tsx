"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Home } from "lucide-react";
import type { LeadApiResponse } from "@/lib/leads/types";

// SELLER-MVP — seller dossier form. Posts to the existing /api/leads endpoint
// with source_channel="seller" + project="vendre". No schema migration.
// Wording: demande indicative / accompagnement — pas d'estimation officielle ni vente garantie.

const PROPERTY_TYPES = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau"] as const;

const DELAIS = [
  "Dès que possible",
  "1 à 3 mois",
  "3 à 6 mois",
  "Je me renseigne",
] as const;

type SellerState = {
  name: string;
  phone: string;
  city: string;
  propertyType: string;
  surface: string;
  price: string;
  delai: string;
  message: string;
  consent: boolean;
};

const INITIAL: SellerState = {
  name: "",
  phone: "",
  city: "",
  propertyType: "",
  surface: "",
  price: "",
  delai: "",
  message: "",
  consent: false,
};

function Field({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  id: string;
  type?: "text" | "tel" | "number";
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-gray-500">
        {label}
        {optional ? <span className="ml-1.5 normal-case font-normal text-gray-400">(optionnel)</span> : null}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3 text-[14px] text-deepblue placeholder:text-gray-400 outline-none focus:border-deepblue focus:ring-2 focus:ring-deepblue/10 transition"
      />
    </div>
  );
}

export function SellerLeadForm() {
  const [form, setForm] = useState<SellerState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string } | null>(null);

  function set<K extends keyof SellerState>(key: K, value: SellerState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const phoneOk = form.phone.replace(/[\s\-().]/g, "").length >= 8;
  const canSubmit = phoneOk && form.consent && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            project: "vendre",
            city: form.city || undefined,
            propertyType: form.propertyType || undefined,
            surface: form.surface ? Number(form.surface) : undefined,
            budgetTotal: form.price ? Number(form.price) : undefined,
            timing: form.delai || undefined,
            name: form.name || undefined,
            phone: form.phone,
            message: form.message || undefined,
            consentContact: true,
            consentIndicatif: true,
          },
          source_channel: "seller",
          source_page: "/vendre/dossier",
        }),
      });
      const data: LeadApiResponse = await res.json();
      if (data.ok) setResult({ ok: true });
      else setResult({ ok: false, error: data.error });
    } catch {
      setResult({ ok: false, error: "Connexion impossible au serveur." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-[1.6rem] border border-[#d8c8a3] bg-white p-8 text-center shadow-[0_8px_28px_rgba(7,27,51,0.08)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-[1.4rem] font-extrabold tracking-[-0.03em] text-deepblue">
          Demande envoyée
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-gray-500">
          Merci. Votre demande d&apos;accompagnement vendeur a bien été enregistrée. Demande
          indicative — non contractuelle. Vous serez recontacté au sujet de votre projet de vente.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/vendre"
            className="inline-flex items-center gap-2 rounded-xl bg-deepblue px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:bg-deepblue-700"
          >
            Retour à Vendre
            <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          <Link
            href="/search?transaction_type=buy"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8c8a3] bg-white px-5 py-3 text-[13.5px] font-extrabold text-deepblue transition hover:bg-[#f7f3ea]"
          >
            Comparer avec le marché
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-deepblue text-bronze-400">
          <Home size={20} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">
            Dossier vendeur
          </p>
          <h1 className="text-[1.5rem] font-extrabold tracking-[-0.04em] text-deepblue">
            Préparer ma vente
          </h1>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-6 text-gray-500">
        Décrivez votre bien pour recevoir des repères de marché et une demande d&apos;accompagnement.
        Estimation indicative — non contractuelle, ne constitue pas une estimation officielle.
      </p>

      <div className="mt-6 rounded-[1.6rem] border border-[#d8c8a3] bg-white p-6 shadow-[0_8px_28px_rgba(7,27,51,0.07)] sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" id="s-name" placeholder="Votre prénom ou nom" value={form.name} onChange={(v) => set("name", v)} optional />
          <Field label="Téléphone / WhatsApp" id="s-phone" type="tel" placeholder="+212 6XX XXX XXX" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Ville" id="s-city" placeholder="Casablanca, Rabat…" value={form.city} onChange={(v) => set("city", v)} optional />

          <div>
            <label htmlFor="s-type" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-gray-500">
              Type de bien <span className="ml-1.5 normal-case font-normal text-gray-400">(optionnel)</span>
            </label>
            <select
              id="s-type"
              value={form.propertyType}
              onChange={(e) => set("propertyType", e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3 text-[14px] text-deepblue outline-none focus:border-deepblue focus:ring-2 focus:ring-deepblue/10 transition"
            >
              <option value="">Sélectionner…</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <Field label="Surface (m²)" id="s-surface" type="number" placeholder="Ex: 120" value={form.surface} onChange={(v) => set("surface", v)} optional />
          <Field label="Prix souhaité (DH)" id="s-price" type="number" placeholder="Ex: 1500000" value={form.price} onChange={(v) => set("price", v)} optional />

          <div className="sm:col-span-2">
            <label htmlFor="s-delai" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-gray-500">
              Délai de vente <span className="ml-1.5 normal-case font-normal text-gray-400">(optionnel)</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DELAIS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("delai", form.delai === d ? "" : d)}
                  className={`rounded-xl border-2 px-4 py-2.5 text-[13px] font-bold transition active:scale-[0.97] ${
                    form.delai === d
                      ? "border-deepblue bg-deepblue text-white"
                      : "border-[#d8c8a3] bg-white text-deepblue hover:border-deepblue/50 hover:bg-[#f7f3ea]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="s-message" className="block text-[12px] font-extrabold uppercase tracking-[0.1em] text-gray-500">
              Commentaire <span className="ml-1.5 normal-case font-normal text-gray-400">(optionnel)</span>
            </label>
            <textarea
              id="s-message"
              rows={3}
              placeholder="Précisions sur votre bien et votre projet de vente…"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              className="mt-2 w-full resize-none rounded-xl border border-[#d8c8a3] bg-white px-4 py-3 text-[14px] text-deepblue placeholder:text-gray-400 outline-none focus:border-deepblue focus:ring-2 focus:ring-deepblue/10 transition"
            />
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#f7f5ef] p-4 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-[#d8c8a3] accent-deepblue"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
          />
          <span className="text-[13px] leading-5 text-gray-700">
            J&apos;accepte d&apos;être recontacté au sujet de ma vente. Je comprends que cette demande
            est indicative et non contractuelle — elle ne constitue ni une estimation officielle ni
            une promesse de vente.
          </span>
        </label>

        {result && !result.ok ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {result.error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-6 py-3.5 text-[15px] font-extrabold text-white shadow-[0_6px_18px_rgba(155,120,56,0.35)] transition hover:from-bronze-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
          {!submitting && <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />}
        </button>

        <p className="mt-4 text-center text-[11.5px] leading-5 text-gray-400">
          Repères indicatifs — à confirmer avant décision. AkarFinder n&apos;est pas expert immobilier
          ni partie à la transaction.
        </p>
      </div>
    </div>
  );
}
