"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Home } from "lucide-react";
import type { LeadApiResponse } from "@/lib/leads/types";

const PROPERTY_TYPES = ["Appartement", "Villa", "Maison", "Studio", "Terrain", "Bureau"] as const;
const CONDITIONS = ["Bon état", "À rafraîchir", "À rénover", "Neuf / récent"] as const;

type FormState = {
  phone: string;
  name: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  surface: string;
  bedrooms: string;
  condition: string;
  price: string;
  message: string;
  consent: boolean;
};

const INITIAL: FormState = {
  phone: "",
  name: "",
  city: "",
  neighborhood: "",
  propertyType: "",
  surface: "",
  bedrooms: "",
  condition: "",
  price: "",
  message: "",
  consent: false,
};

const inputClass = "mt-2 w-full rounded-xl border border-[#d8c8a3] bg-white px-4 py-3 text-sm text-deepblue outline-none transition focus:border-deepblue focus:ring-2 focus:ring-deepblue/10";
const labelClass = "block text-[11px] font-extrabold uppercase tracking-[0.1em] text-gray-500";

export function SellerPropertyDraftForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSubmit =
    form.phone.replace(/[\s\-().]/g, "").length >= 8 &&
    Boolean(form.city.trim()) &&
    Boolean(form.propertyType) &&
    Number(form.surface) > 0 &&
    form.consent &&
    !busy;

  const comparableHref = useMemo(() => {
    const params = new URLSearchParams({ transaction_type: "buy" });
    if (form.city.trim()) params.set("city", form.city.trim());
    if (form.propertyType) params.set("property_type", form.propertyType);
    return `/search?${params.toString()}`;
  }, [form.city, form.propertyType]);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_channel: "seller",
          source_page: "/vendre/dossier",
          profile: {
            project: "vendre",
            phone: form.phone,
            name: form.name || undefined,
            city: form.city.trim(),
            neighborhood: form.neighborhood.trim() || undefined,
            propertyType: form.propertyType,
            surface: Number(form.surface),
            bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
            condition: form.condition || undefined,
            budgetTotal: form.price ? Number(form.price) : undefined,
            message: form.message || undefined,
            consentContact: true,
            consentIndicatif: true,
          },
        }),
      });
      const payload = (await response.json()) as LeadApiResponse;
      setResult(payload.ok ? { ok: true } : { ok: false, error: payload.error });
    } catch {
      setResult({ ok: false, error: "Connexion impossible au serveur." });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#d8c8a3] bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-emerald-600" size={36} aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-deepblue">Brouillon du bien enregistré</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Les faits déclarés sur votre bien ont été enregistrés séparément de votre demande de contact. Ce brouillon n&apos;est ni une annonce publiée, ni une vérification AkarFinder.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/vendre" className="rounded-xl bg-deepblue px-5 py-3 text-sm font-extrabold text-white">Retour à Vendre</Link>
          <Link href={comparableHref} className="rounded-xl border border-[#d8c8a3] px-5 py-3 text-sm font-extrabold text-deepblue">Voir les offres comparables</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-deepblue text-bronze-400"><Home size={20} aria-hidden="true" /></span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-700">Brouillon vendeur</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-deepblue">Décrire mon bien</h1>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        Les informations saisies restent des faits déclarés par vous. Elles sont stockées séparément des futurs calculs AkarFinder et ne deviennent jamais vérifiées automatiquement.
      </p>

      <div className="mt-6 rounded-3xl border border-[#d8c8a3] bg-white p-6 shadow-sm sm:p-8">
        <p className="rounded-xl bg-[#f7f5ef] p-4 text-xs leading-5 text-gray-600">
          <strong className="text-deepblue">Minimum requis :</strong> ville, type de bien et surface. Les autres informations améliorent le brouillon mais peuvent rester inconnues.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Téléphone<input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
          <label className={labelClass}>Nom <span className="normal-case font-normal">(optionnel)</span><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className={labelClass}>Ville<input className={inputClass} value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
          <label className={labelClass}>Quartier <span className="normal-case font-normal">(optionnel)</span><input className={inputClass} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} /></label>

          <label className={labelClass}>Type de bien
            <select className={inputClass} value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
              <option value="">Sélectionner…</option>
              {PROPERTY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className={labelClass}>Surface (m²)<input type="number" min="1" className={inputClass} value={form.surface} onChange={(e) => set("surface", e.target.value)} /></label>
          <label className={labelClass}>Chambres <span className="normal-case font-normal">(optionnel)</span><input type="number" min="0" className={inputClass} value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></label>
          <label className={labelClass}>Prix souhaité (DH) <span className="normal-case font-normal">(optionnel)</span><input type="number" min="0" className={inputClass} value={form.price} onChange={(e) => set("price", e.target.value)} /></label>

          <label className={`${labelClass} sm:col-span-2`}>État déclaré <span className="normal-case font-normal">(optionnel)</span>
            <select className={inputClass} value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              <option value="">Non renseigné</option>
              {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
            </select>
          </label>

          <label className={`${labelClass} sm:col-span-2`}>Commentaire <span className="normal-case font-normal">(optionnel)</span>
            <textarea rows={3} className={inputClass} value={form.message} onChange={(e) => set("message", e.target.value)} />
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f5ef] p-4 text-sm leading-5 text-gray-700">
          <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5" />
          <span>Je confirme que ces informations sont mes déclarations et j&apos;accepte d&apos;être recontacté. Je comprends que ce brouillon n&apos;est ni une publication, ni une vérification, ni une estimation officielle.</span>
        </label>

        {result && !result.ok ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{result.error}</p> : null}

        <button type="button" disabled={!canSubmit} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-6 py-3.5 text-sm font-extrabold text-white disabled:opacity-50">
          {busy ? "Enregistrement…" : "Enregistrer mon brouillon et ma demande"}
          {!busy ? <ArrowRight size={15} aria-hidden="true" /> : null}
        </button>
      </div>
    </div>
  );
}
