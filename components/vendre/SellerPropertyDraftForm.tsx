"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Home,
  ImagePlus,
  Info,
  ShieldCheck,
} from "lucide-react";
import { PropertyTypeVisualSelector } from "@/components/property-types/PropertyTypeVisualSelector";
import { ui } from "@/components/ui/design-system";
import type { LeadApiResponse } from "@/lib/leads/types";
import type { ListingPropertyType } from "@/lib/listings/types";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import { calculateSellerReadiness, type SellerIntent } from "@/lib/seller/readiness";

const PROPERTY_TYPES: readonly ListingPropertyType[] = [
  ...OPTION_A_PROPERTY_TYPES.map((item) => item.value),
  "Maison",
];
const CONDITIONS = ["Bon état", "À rafraîchir", "À rénover", "Neuf / récent"] as const;
const STORAGE_KEY = "akarfinder:seller-draft:v1";

const INTENT_COPY: Record<SellerIntent, { eyebrow: string; title: string; submit: string }> = {
  publish: { eyebrow: "Publier mon annonce", title: "Préparons une annonce claire et rassurante", submit: "Enregistrer mon dossier" },
  estimate: { eyebrow: "Estimer mon bien", title: "Décrivons le même bien avant toute estimation", submit: "Enregistrer et demander mes repères" },
  professional: { eyebrow: "Être accompagné", title: "Préparons un dossier utile pour le professionnel", submit: "Enregistrer et demander un accompagnement" },
};

type FormState = {
  phone: string;
  name: string;
  city: string;
  neighborhood: string;
  propertyType: "" | ListingPropertyType;
  surface: string;
  bedrooms: string;
  condition: string;
  price: string;
  message: string;
  consent: boolean;
};

type SavedDraft = Pick<FormState, "city" | "neighborhood" | "propertyType" | "surface" | "bedrooms" | "condition" | "price" | "message">;

type PhotoCheck = {
  id: string;
  name: string;
  accepted: boolean;
  message: string;
  width?: number;
  height?: number;
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

const inputClass = `${ui.field} mt-2 w-full px-4 py-3 text-sm`;
const labelClass = "block text-[12px] font-extrabold text-foreground";

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      reject(new Error("invalid-image"));
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

async function inspectPhoto(file: File): Promise<PhotoCheck> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { id, name: file.name, accepted: false, message: "Choisissez une photo JPG, PNG ou WebP." };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { id, name: file.name, accepted: false, message: "Cette photo est trop lourde. Essayez une version de moins de 15 Mo." };
  }
  try {
    const { width, height } = await readImageSize(file);
    if (width < 1200 || height < 800) {
      return {
        id,
        name: file.name,
        accepted: false,
        width,
        height,
        message: "La photo est un peu petite. Une image d’au moins 1200 × 800 sera plus agréable à regarder.",
      };
    }
    return { id, name: file.name, accepted: true, width, height, message: "Bonne taille pour présenter votre bien." };
  } catch {
    return { id, name: file.name, accepted: false, message: "Cette image ne peut pas être lue. Choisissez la photo originale." };
  }
}

export function SellerPropertyDraftForm({
  initialPropertyType,
  initialIntent = "publish",
}: {
  initialPropertyType?: ListingPropertyType;
  initialIntent?: SellerIntent;
}) {
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL, propertyType: initialPropertyType ?? "" }));
  const [intent, setIntent] = useState<SellerIntent>(initialIntent);
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<PhotoCheck[]>([]);
  const [busy, setBusy] = useState(false);
  const [checkingPhotos, setCheckingPhotos] = useState(false);
  const [restored, setRestored] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { form?: Partial<SavedDraft>; intent?: SellerIntent };
      if (parsed.form) setForm((current) => ({ ...current, ...parsed.form, phone: "", name: "", consent: false }));
      if (parsed.intent) setIntent(parsed.intent);
      setRestored(true);
    } catch {
      // A damaged local draft is ignored; the user can continue normally.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedForm: SavedDraft = {
        city: form.city,
        neighborhood: form.neighborhood,
        propertyType: form.propertyType,
        surface: form.surface,
        bedrooms: form.bedrooms,
        condition: form.condition,
        price: form.price,
        message: form.message,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form: savedForm, intent }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [form.city, form.neighborhood, form.propertyType, form.surface, form.bedrooms, form.condition, form.price, form.message, intent]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const acceptedPhotoCount = photos.filter((photo) => photo.accepted).length;
  const readiness = useMemo(
    () => calculateSellerReadiness({
      city: form.city,
      neighborhood: form.neighborhood,
      propertyType: form.propertyType,
      surface: Number(form.surface) || undefined,
      bedrooms: form.bedrooms === "" ? undefined : Number(form.bedrooms),
      condition: form.condition,
      price: Number(form.price) || undefined,
      description: form.message,
      phone: form.phone,
      photoCount: photos.length,
      acceptedPhotoCount,
    }),
    [acceptedPhotoCount, form, photos.length],
  );

  const canSubmit = readiness.essentialsComplete && form.consent && !busy;
  const copy = INTENT_COPY[intent];

  const comparableHref = useMemo(() => {
    const params = new URLSearchParams({ transaction_type: "buy" });
    if (form.city.trim()) params.set("city", form.city.trim());
    if (form.propertyType) params.set("property_type", form.propertyType);
    return `/search?${params.toString()}`;
  }, [form.city, form.propertyType]);

  async function handlePhotos(files: FileList | null) {
    if (!files?.length) return;
    setCheckingPhotos(true);
    const checks = await Promise.all(Array.from(files).slice(0, 12).map(inspectPhoto));
    setPhotos((current) => {
      const merged = [...current, ...checks];
      return Array.from(new Map(merged.map((item) => [item.id, item])).values()).slice(0, 12);
    });
    setCheckingPhotos(false);
  }

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
            message: `[${intent}] ${form.message || ""}`.trim(),
            consentContact: true,
            consentIndicatif: true,
          },
        }),
      });
      const payload = (await response.json()) as LeadApiResponse;
      if (payload.ok) {
        window.localStorage.removeItem(STORAGE_KEY);
        setResult({ ok: true });
      } else {
        setResult({ ok: false, error: payload.error });
      }
    } catch {
      setResult({ ok: false, error: "La connexion a été interrompue. Les informations non sensibles de votre brouillon restent enregistrées sur cet appareil." });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) {
    return (
      <div className={`${ui.surface} mx-auto max-w-xl p-8 text-center`}>
        <CheckCircle2 className="mx-auto text-emerald-600" size={38} aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold">Brouillon du bien enregistré</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Ces faits déclarés restent séparés des informations vérifiées. Rien n’est publié automatiquement et vous gardez la main sur la suite.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/vendre" className={ui.primaryAction}>Retour à Vendre</Link>
          <Link href={comparableHref} className={ui.secondaryAction}>Voir des biens comparables</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div>
        <Link href="/vendre" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={16} aria-hidden="true" /> Retour</Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Home size={20} aria-hidden="true" /></span>
          <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.title}</h1></div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Vendre, estimer ou demander de l’aide commence par le même dossier. Vous avancez à votre rythme et les informations non sensibles de votre brouillon restent sur cet appareil.</p>
        {restored ? <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Check size={14} aria-hidden="true" /> Votre brouillon a été repris.</p> : null}

        <nav aria-label="Étapes du dossier" className="mt-6 grid grid-cols-4 gap-2">
          {["Votre bien", "Détails", "Photos", "Contact"].map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const done = step > number;
            return (
              <button key={label} type="button" onClick={() => setStep(number)} aria-current={active ? "step" : undefined} className={`min-h-14 rounded-xl border px-2 py-2 text-[11px] font-extrabold transition ${active ? "border-primary bg-primary text-primary-foreground" : done ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-border/30 bg-card text-muted-foreground"}`}>
                <span className="block text-[10px] opacity-75">{done ? "✓" : number}</span>{label}
              </button>
            );
          })}
        </nav>

        <section className={`${ui.surface} mt-4 p-5 sm:p-7`} aria-live="polite">
          {step === 1 ? (
            <div>
              <h2 className="text-xl font-extrabold">Commençons par l’essentiel</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ces informations permettent de comprendre de quel bien il s’agit.</p>
              <div className="mt-6">
                <PropertyTypeVisualSelector value={form.propertyType} onChange={(propertyType) => set("propertyType", propertyType === "all" ? "" : propertyType)} ariaLabel="Quel type de bien souhaitez-vous vendre ?" />
                <label className={`${labelClass} mt-4 max-w-sm`}>Autre choix
                  <select className={inputClass} value={form.propertyType} onChange={(event) => set("propertyType", event.target.value as FormState["propertyType"])}>
                    <option value="">Sélectionner</option>{PROPERTY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Ville<input autoComplete="address-level2" className={inputClass} value={form.city} onChange={(event) => set("city", event.target.value)} /></label>
                <label className={labelClass}>Quartier <span className="font-normal text-muted-foreground">— recommandé</span><input autoComplete="address-level3" className={inputClass} value={form.neighborhood} onChange={(event) => set("neighborhood", event.target.value)} /></label>
                <label className={labelClass}>Surface en m²<input type="number" min="1" inputMode="numeric" className={inputClass} value={form.surface} onChange={(event) => set("surface", event.target.value)} /></label>
                <label className={labelClass}>Nombre de chambres<input type="number" min="0" inputMode="numeric" className={inputClass} value={form.bedrooms} onChange={(event) => set("bedrooms", event.target.value)} /></label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="text-xl font-extrabold">Aidez les visiteurs à se projeter</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ajoutez seulement ce que vous connaissez. Une information inconnue peut rester vide.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>État du bien
                  <select className={inputClass} value={form.condition} onChange={(event) => set("condition", event.target.value)}><option value="">Je ne sais pas encore</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select>
                </label>
                <label className={labelClass}>Prix souhaité en DH <span className="font-normal text-muted-foreground">— facultatif</span><input type="number" min="0" inputMode="numeric" className={inputClass} value={form.price} onChange={(event) => set("price", event.target.value)} /></label>
                <label className={`${labelClass} sm:col-span-2`}>Présentez votre bien
                  <textarea rows={6} maxLength={2000} className={inputClass} value={form.message} onChange={(event) => set("message", event.target.value)} placeholder="Exemple : appartement lumineux, deux façades, proche des écoles, cuisine rénovée…" />
                  <span className="mt-2 block text-xs font-normal text-muted-foreground">{form.message.trim().length}/80 caractères conseillés</span>
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="text-xl font-extrabold">Choisissez des photos qui montrent vraiment le bien</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Les photos sont vérifiées sur votre appareil et restent privées pendant cette préparation. Vous pourrez les remplacer avant toute publication.</p>
              <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-surface-muted p-6 text-center transition hover:border-primary">
                <ImagePlus size={30} className="text-primary" aria-hidden="true" />
                <span className="mt-3 text-sm font-extrabold">Ajouter jusqu’à 12 photos</span>
                <span className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP · 15 Mo maximum · format original conseillé</span>
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handlePhotos(event.target.files)} />
              </label>
              {checkingPhotos ? <p className="mt-3 text-sm font-bold text-primary">Vérification des photos…</p> : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {photos.map((photo) => (
                  <div key={photo.id} className={`rounded-xl border p-3 ${photo.accepted ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : "border-amber-200 bg-amber-50 dark:bg-amber-950/30"}`}>
                    <div className="flex items-start gap-2"><Camera size={16} className={photo.accepted ? "text-emerald-700" : "text-amber-700"} aria-hidden="true" /><div className="min-w-0"><p className="truncate text-xs font-extrabold">{photo.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{photo.message}</p></div></div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-primary/8 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Pour une annonce très complète :</strong> façade ou extérieur, séjour, cuisine, chambres, salle de bain et vue lorsque c’est pertinent.</div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h2 className="text-xl font-extrabold">Comment pouvons-nous vous recontacter ?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Votre numéro reste privé et n’est pas enregistré dans le brouillon local.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Téléphone<input autoComplete="tel" inputMode="tel" className={inputClass} value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
                <label className={labelClass}>Nom <span className="font-normal text-muted-foreground">— facultatif</span><input autoComplete="name" className={inputClass} value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-muted p-4 text-sm leading-6"><input type="checkbox" checked={form.consent} onChange={(event) => set("consent", event.target.checked)} className="mt-1 h-4 w-4" /><span>Je confirme que ces informations décrivent mon bien et j’accepte d’être recontacté. Je comprends que rien n’est publié automatiquement.</span></label>
              {!readiness.essentialsComplete ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Ajoutez le type de bien, la ville, la surface et un téléphone pour enregistrer le dossier.</p> : null}
              {result && !result.ok ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{result.error}</p> : null}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border/20 pt-5">
            <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className={`${ui.secondaryAction} disabled:invisible`}><ArrowLeft size={15} aria-hidden="true" /> Précédent</button>
            {step < 4 ? <button type="button" onClick={() => setStep((current) => Math.min(4, current + 1))} className={ui.primaryAction}>Continuer <ArrowRight size={15} aria-hidden="true" /></button> : <button type="button" disabled={!canSubmit} onClick={() => void submit()} className={`${ui.primaryAction} disabled:cursor-not-allowed disabled:opacity-50`}>{busy ? "Enregistrement…" : copy.submit}{!busy ? <ArrowRight size={15} aria-hidden="true" /> : null}</button>}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24" aria-label="Préparation de l’annonce">
        <section className={`${ui.surface} p-5`}>
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Annonce prête</p><p className="mt-1 text-lg font-extrabold">{readiness.label}</p></div><div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground" aria-label={`${readiness.score} pour cent`}>{readiness.score}%</div></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${readiness.score}%` }} /></div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Plus votre dossier est clair, plus il aide les visiteurs à comprendre le bien.</p>
          {readiness.suggestions.length > 0 ? <div className="mt-5 border-t border-border/20 pt-4"><p className="text-xs font-extrabold">Pour l’améliorer</p><ul className="mt-3 space-y-2">{readiness.suggestions.map((suggestion) => <li key={suggestion.key} className="flex items-start justify-between gap-3 text-xs"><span className="text-muted-foreground">{suggestion.label}</span><span className="shrink-0 font-extrabold text-primary">+{suggestion.gain}%</span></li>)}</ul></div> : <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 size={16} aria-hidden="true" /> Votre dossier est très complet.</p>}
        </section>
        <section className={`${ui.surfaceMuted} mt-4 p-4`}><p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={16} className="text-primary" aria-hidden="true" /> Vos informations restent maîtrisées</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Les photos restent sur votre appareil pendant cette préparation. Le téléphone et le nom ne sont pas conservés dans le brouillon local.</p></section>
        <section className="mt-4 flex gap-2 rounded-xl border border-border/20 bg-card p-4 text-xs leading-5 text-muted-foreground"><Info size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><p>“Annonce prête” mesure uniquement la qualité des informations fournies. Ce n’est ni une estimation du prix, ni une garantie de vente.</p></section>
      </aside>
    </div>
  );
}
