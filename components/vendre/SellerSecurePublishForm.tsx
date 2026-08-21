"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ImagePlus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { PropertyTypeVisualSelector } from "@/components/property-types/PropertyTypeVisualSelector";
import { SellerAkarFinderPreview } from "@/components/vendre/SellerAkarFinderPreview";
import { SellerReviewStatusPanel } from "@/components/vendre/SellerReviewStatusPanel";
import { ui } from "@/components/ui/design-system";
import type { LeadApiResponse } from "@/lib/leads/types";
import type { ListingPropertyType } from "@/lib/listings/types";
import type { SellerIntent } from "@/lib/seller/readiness";
import {
  AKARFINDER_SELLER_MIN_PHOTOS,
  AKARFINDER_SELLER_SCORE_MIN_PUBLISH,
  calculateAkarFinderSellerScore,
} from "@/lib/seller/listing-score";

const field = `${ui.field} mt-2 w-full px-4 py-3 text-sm`;

type DraftPhoto = {
  id: string;
  file: File;
  preview: string;
  accepted: boolean;
  message: string;
};

type Props = {
  initialPropertyType?: ListingPropertyType;
  initialIntent?: SellerIntent;
};

type BooleanFeatureKey =
  | "hasElevator"
  | "hasParking"
  | "hasGarage"
  | "hasTerrace"
  | "hasBalcony"
  | "hasGarden"
  | "hasPool"
  | "hasEquippedKitchen"
  | "hasAirConditioning"
  | "hasHeating"
  | "hasSecurity"
  | "hasConcierge"
  | "hasGatedAccess"
  | "isFurnished"
  | "utilitiesWater"
  | "utilitiesElectricity"
  | "utilitiesSewer";

const STEPS = [
  "Type",
  "Localisation",
  "Caractéristiques",
  "Prix & confiance",
  "Médias",
  "Vérification",
] as const;

const initialFeatures: Record<BooleanFeatureKey, boolean | null> = {
  hasElevator: null,
  hasParking: null,
  hasGarage: null,
  hasTerrace: null,
  hasBalcony: null,
  hasGarden: null,
  hasPool: null,
  hasEquippedKitchen: null,
  hasAirConditioning: null,
  hasHeating: null,
  hasSecurity: null,
  hasConcierge: null,
  hasGatedAccess: null,
  isFurnished: null,
  utilitiesWater: null,
  utilitiesElectricity: null,
  utilitiesSewer: null,
};

async function inspect(file: File): Promise<DraftPhoto> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const preview = URL.createObjectURL(file);
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { id, file, preview, accepted: false, message: "Choisissez une photo JPG, PNG ou WebP." };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { id, file, preview, accepted: false, message: "Cette photo dépasse 15 Mo." };
  }
  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
      id,
      file,
      preview,
      accepted: image.naturalWidth >= 1200 && image.naturalHeight >= 800,
      message: image.naturalWidth >= 1200 && image.naturalHeight >= 800
        ? "Bonne taille pour présenter votre bien."
        : "Choisissez si possible une image d’au moins 1200 × 800.",
    });
    image.onerror = () => resolve({ id, file, preview, accepted: false, message: "Cette image ne peut pas être lue." });
    image.src = preview;
  });
}

const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);
const phoneValid = (value: string) => value.replace(/[\s\-().]/g, "").length >= 8;

export function SellerSecurePublishForm({ initialPropertyType, initialIntent = "publish" }: Props) {
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState<"" | ListingPropertyType>(initialPropertyType ?? "");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [residenceName, setResidenceName] = useState("");
  const [privateAddress, setPrivateAddress] = useState("");
  const [locationLandmark, setLocationLandmark] = useState("");
  const [surface, setSurface] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [rooms, setRooms] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [orientation, setOrientation] = useState("");
  const [viewType, setViewType] = useState("");
  const [constructionYear, setConstructionYear] = useState("");
  const [frontageM, setFrontageM] = useState("");
  const [roadAccessWidthM, setRoadAccessWidthM] = useState("");
  const [ceilingHeightM, setCeilingHeightM] = useState("");
  const [landConstructibleStatus, setLandConstructibleStatus] = useState("");
  const [zoningType, setZoningType] = useState("");
  const [features, setFeatures] = useState(initialFeatures);
  const [price, setPrice] = useState("");
  const [monthlyCharges, setMonthlyCharges] = useState("");
  const [negotiable, setNegotiable] = useState<boolean | null>(null);
  const [legalStatusDeclared, setLegalStatusDeclared] = useState("");
  const [documentsAvailable, setDocumentsAvailable] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    ok: boolean;
    error?: string;
    uploaded?: number;
    draftId?: string;
    uploadToken?: string;
  } | null>(null);

  const accepted = useMemo(() => photos.filter((photo) => photo.accepted), [photos]);
  const isLand = propertyType === "Terrain";
  const isProfessional = propertyType === "Bureau";
  const isHouseLike = propertyType === "Villa" || propertyType === "Maison" || propertyType === "Riad";

  const sellerProperty = useMemo(() => ({
    transactionType: "sale" as const,
    propertyType: propertyType || null,
    title,
    city,
    neighborhood,
    residenceName,
    privateAddress,
    locationLandmark,
    surface: numberOrNull(surface),
    price: numberOrNull(price),
    bedrooms: numberOrNull(bedrooms),
    bathrooms: numberOrNull(bathrooms),
    rooms: numberOrNull(rooms),
    floorNumber: numberOrNull(floorNumber),
    condition,
    orientation,
    viewType,
    constructionYear: numberOrNull(constructionYear),
    frontageM: numberOrNull(frontageM),
    roadAccessWidthM: numberOrNull(roadAccessWidthM),
    ceilingHeightM: numberOrNull(ceilingHeightM),
    landConstructibleStatus,
    zoningType,
    ...features,
    negotiable,
    monthlyCharges: numberOrNull(monthlyCharges),
    legalStatusDeclared,
    documentsAvailable,
    description,
    contactComplete: Boolean(name.trim() && phoneValid(phone)),
  }), [
    propertyType, title, city, neighborhood, residenceName, privateAddress, locationLandmark,
    surface, price, bedrooms, bathrooms, rooms, floorNumber, condition, orientation, viewType,
    constructionYear, frontageM, roadAccessWidthM, ceilingHeightM, landConstructibleStatus,
    zoningType, features, negotiable, monthlyCharges, legalStatusDeclared, documentsAvailable,
    description, name, phone,
  ]);

  const score = useMemo(() => calculateAkarFinderSellerScore({
    ...sellerProperty,
    acceptedPhotoCount: accepted.length,
    verifiedDocumentsCount: 0,
  }), [sellerProperty, accepted.length]);

  const complete =
    Boolean(propertyType) &&
    city.trim().length > 0 &&
    Number(surface) > 0 &&
    Number(price) > 0 &&
    Boolean(name.trim()) &&
    phoneValid(phone) &&
    consent &&
    accepted.length >= AKARFINDER_SELLER_MIN_PHOTOS &&
    score.score >= AKARFINDER_SELLER_SCORE_MIN_PUBLISH;

  const canAdvance =
    step === 0 ? Boolean(propertyType) :
    step === 1 ? Boolean(city.trim()) :
    step === 2 ? Number(surface) > 0 :
    step === 3 ? Number(price) > 0 :
    step === 4 ? accepted.length >= AKARFINDER_SELLER_MIN_PHOTOS :
    true;

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    const incoming = await Promise.all(Array.from(list).slice(0, 12).map(inspect));
    setPhotos((current) => Array.from(new Map([...current, ...incoming].map((photo) => [photo.id, photo])).values()).slice(0, 12));
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function move(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setFeature(key: BooleanFeatureKey, value: boolean) {
    setFeatures((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!complete) return;
    setBusy(true);
    setResult(null);
    setProgress(0);
    try {
      const leadResponse = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_channel: "seller",
          source_page: "/vendre/dossier",
          seller_property: sellerProperty,
          profile: {
            project: "vendre",
            phone,
            name: name || undefined,
            city: city.trim(),
            neighborhood: neighborhood.trim() || undefined,
            propertyType,
            surface: Number(surface),
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
            condition: condition || undefined,
            budgetTotal: Number(price),
            message: `[${initialIntent}] ${description}`.trim(),
            consentContact: true,
            consentIndicatif: true,
          },
        }),
      });
      const lead = await leadResponse.json() as LeadApiResponse;
      if (!lead.ok) throw new Error(lead.error);

      let uploaded = 0;
      if (!lead.seller_property_draft_id || !lead.seller_upload_token) {
        throw new Error("Le brouillon structuré n’a pas pu être préparé.");
      }

      for (const photo of accepted) {
        const form = new FormData();
        form.append("photo", photo.file, photo.file.name);
        const response = await fetch(`/api/seller-drafts/${encodeURIComponent(lead.seller_property_draft_id)}/photos`, {
          method: "POST",
          headers: { "x-draft-upload-token": lead.seller_upload_token },
          body: form,
        });
        const payload = await response.json() as { ok: boolean; error?: string };
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Une photo n’a pas pu être envoyée.");
        uploaded += 1;
        setProgress(Math.round(uploaded / accepted.length * 100));
      }

      setResult({
        ok: true,
        uploaded,
        draftId: lead.seller_property_draft_id,
        uploadToken: lead.seller_upload_token,
      });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : "Enregistrement impossible." });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) {
    return (
      <section className={`${ui.surface} mx-auto max-w-3xl p-6 text-center sm:p-8`}>
        <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Dossier AkarFinder</p>
        <h1 className="mt-2 text-2xl font-extrabold">Brouillon riche enregistré</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Score au dépôt : <strong>{score.score}/100</strong>. {result.uploaded} photo(s) privée(s) ont été conservées.
          Rien n’est publié automatiquement : la vérification humaine puis votre confirmation restent obligatoires.
        </p>
        {result.draftId && result.uploadToken ? (
          <SellerReviewStatusPanel draftId={result.draftId} uploadToken={result.uploadToken} />
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/vendre" className={ui.primaryAction}>Retour à Vendre</Link>
          <Link href="/search" className={ui.secondaryAction}>Voir des biens comparables</Link>
        </div>
      </section>
    );
  }

  return (
    <div data-p8-publication-v4 className="mx-auto max-w-[1480px]">
      <div className="mb-5 rounded-[22px] border border-[#D9E7F3] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(11,37,69,0.05)] lg:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[9.5px] font-black uppercase tracking-[0.15em] text-[#0B63CE]">Dossier AkarFinder</p>
            <p className="mt-1 text-sm font-black text-[#0B2545]">Étape {step + 1}/{STEPS.length} · {STEPS[step]}</p>
          </div>
          <p className="text-lg font-black text-[#0B2545]">{score.score}/100</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0B63CE]" style={{ width: `${Math.max(((step + 1) / STEPS.length) * 100, score.score)}%` }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_390px]">
        <aside className="hidden lg:block">
          <div className="sticky top-5 space-y-4">
            <section className="rounded-[22px] border border-[#D9E7F3] bg-white p-4 shadow-[0_12px_36px_rgba(11,37,69,0.05)]">
              <p className="text-[9.5px] font-black uppercase tracking-[0.15em] text-[#0B63CE]">Construire l’annonce</p>
              <ol className="mt-4 space-y-2">
                {STEPS.map((label, index) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => index <= step && setStep(index)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[11px] font-extrabold transition ${
                        index === step ? "bg-[#EEF6FF] text-[#0B63CE]" : index < step ? "text-[#0B2545]" : "text-slate-400"
                      }`}
                    >
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${index <= step ? "bg-[#0B63CE] text-white" : "bg-slate-100"}`}>
                        {index < step ? <Check size={12} strokeWidth={3} /> : index + 1}
                      </span>
                      {label}
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            <ScoreRail score={score} />
          </div>
        </aside>

        <section className="min-w-0 rounded-[26px] border border-[#D9E7F3] bg-white p-5 shadow-[0_18px_52px_rgba(11,37,69,0.07)] sm:p-7">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0B63CE]">Annonce AkarFinder · V4</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#0B2545] sm:text-3xl">{stepTitle(step)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{stepDetail(step)}</p>
          </div>

          <div className="mt-6">
            {step === 0 ? (
              <div>
                <PropertyTypeVisualSelector value={propertyType} onChange={(value) => setPropertyType(value === "all" ? "" : value)} ariaLabel="Type du bien" />
                <label className="mt-6 block text-xs font-extrabold text-[#0B2545]">
                  Titre de l’annonce
                  <input className={field} value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Appartement lumineux avec terrasse" />
                </label>
                <p className="mt-2 text-[11px] text-slate-500">Un titre précis améliore la fiche, sans promesse marketing inventée.</p>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Ville *" value={city} onChange={setCity} />
                <TextField label="Quartier" value={neighborhood} onChange={setNeighborhood} />
                <TextField label="Résidence / immeuble" value={residenceName} onChange={setResidenceName} />
                <TextField label="Repère utile" value={locationLandmark} onChange={setLocationLandmark} />
                <label className="text-xs font-extrabold text-[#0B2545] sm:col-span-2">
                  Adresse exacte privée
                  <input className={field} value={privateAddress} onChange={(event) => setPrivateAddress(event.target.value)} placeholder="Conservée privée, utile pour la précision géographique" />
                  <span className="mt-2 flex items-center gap-2 text-[10.5px] font-semibold leading-4 text-slate-500"><ShieldCheck size={14} className="text-[#0B63CE]" /> L’adresse exacte n’a pas besoin d’être publique pour améliorer la précision AkarFinder.</span>
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Surface principale en m² *" value={surface} onChange={setSurface} min="1" />
                  {!isLand ? <TextField label="État du bien" value={condition} onChange={setCondition} placeholder="Neuf, bon état, à rénover…" /> : null}

                  {!isLand && !isProfessional ? (
                    <>
                      <NumberField label="Chambres" value={bedrooms} onChange={setBedrooms} min="0" />
                      <NumberField label="Salles de bain" value={bathrooms} onChange={setBathrooms} min="0" />
                      <NumberField label="Pièces" value={rooms} onChange={setRooms} min="0" />
                      <NumberField label="Étage" value={floorNumber} onChange={setFloorNumber} min="0" />
                      <TextField label="Orientation" value={orientation} onChange={setOrientation} placeholder="Sud-Ouest…" />
                      <TextField label="Vue" value={viewType} onChange={setViewType} placeholder="Dégagée, jardin…" />
                      <NumberField label="Année de construction" value={constructionYear} onChange={setConstructionYear} min="1800" />
                    </>
                  ) : null}

                  {isProfessional ? (
                    <>
                      <NumberField label="Étage" value={floorNumber} onChange={setFloorNumber} min="0" />
                      <NumberField label="Façade en m" value={frontageM} onChange={setFrontageM} min="0" />
                      <NumberField label="Hauteur sous plafond en m" value={ceilingHeightM} onChange={setCeilingHeightM} min="0" step="0.1" />
                      <TextField label="Orientation" value={orientation} onChange={setOrientation} />
                    </>
                  ) : null}

                  {isLand ? (
                    <>
                      <TextField label="Statut constructible" value={landConstructibleStatus} onChange={setLandConstructibleStatus} placeholder="Constructible, à confirmer…" />
                      <TextField label="Zonage / usage" value={zoningType} onChange={setZoningType} />
                      <NumberField label="Façade en m" value={frontageM} onChange={setFrontageM} min="0" />
                      <NumberField label="Largeur d’accès routier en m" value={roadAccessWidthM} onChange={setRoadAccessWidthM} min="0" />
                    </>
                  ) : null}
                </div>

                <div className="mt-7">
                  <h2 className="text-base font-black text-[#0B2545]">Équipements et détails applicables</h2>
                  <p className="mt-1 text-xs text-slate-500">Chaque réponse réelle enrichit l’annonce. Les champs non applicables ne pénalisent pas le score.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {isLand ? (
                      <>
                        <BooleanChoice label="Eau disponible" value={features.utilitiesWater} onChange={(value) => setFeature("utilitiesWater", value)} />
                        <BooleanChoice label="Électricité disponible" value={features.utilitiesElectricity} onChange={(value) => setFeature("utilitiesElectricity", value)} />
                        <BooleanChoice label="Assainissement disponible" value={features.utilitiesSewer} onChange={(value) => setFeature("utilitiesSewer", value)} />
                      </>
                    ) : (
                      <>
                        <BooleanChoice label="Parking" value={features.hasParking} onChange={(value) => setFeature("hasParking", value)} />
                        <BooleanChoice label="Climatisation" value={features.hasAirConditioning} onChange={(value) => setFeature("hasAirConditioning", value)} />
                        <BooleanChoice label="Sécurité" value={features.hasSecurity} onChange={(value) => setFeature("hasSecurity", value)} />
                        {!isProfessional ? (
                          <>
                            <BooleanChoice label="Ascenseur" value={features.hasElevator} onChange={(value) => setFeature("hasElevator", value)} />
                            <BooleanChoice label="Terrasse" value={features.hasTerrace} onChange={(value) => setFeature("hasTerrace", value)} />
                            <BooleanChoice label="Balcon" value={features.hasBalcony} onChange={(value) => setFeature("hasBalcony", value)} />
                            <BooleanChoice label="Cuisine équipée" value={features.hasEquippedKitchen} onChange={(value) => setFeature("hasEquippedKitchen", value)} />
                            <BooleanChoice label="Meublé" value={features.isFurnished} onChange={(value) => setFeature("isFurnished", value)} />
                            <BooleanChoice label="Chauffage" value={features.hasHeating} onChange={(value) => setFeature("hasHeating", value)} />
                            <BooleanChoice label="Concierge" value={features.hasConcierge} onChange={(value) => setFeature("hasConcierge", value)} />
                            <BooleanChoice label="Résidence fermée" value={features.hasGatedAccess} onChange={(value) => setFeature("hasGatedAccess", value)} />
                            {isHouseLike ? (
                              <>
                                <BooleanChoice label="Garage" value={features.hasGarage} onChange={(value) => setFeature("hasGarage", value)} />
                                <BooleanChoice label="Jardin" value={features.hasGarden} onChange={(value) => setFeature("hasGarden", value)} />
                                <BooleanChoice label="Piscine" value={features.hasPool} onChange={(value) => setFeature("hasPool", value)} />
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Prix demandé en DH *" value={price} onChange={setPrice} min="1" />
                  <NumberField label="Charges / syndic mensuels en DH" value={monthlyCharges} onChange={setMonthlyCharges} min="0" />
                  <BooleanChoice label="Prix négociable" value={negotiable} onChange={setNegotiable} />
                  <TextField label="Statut juridique déclaré" value={legalStatusDeclared} onChange={setLegalStatusDeclared} placeholder="Titre foncier, melkia, à préciser…" />
                  <div className="sm:col-span-2">
                    <BooleanChoice label="Documents du bien disponibles" value={documentsAvailable} onChange={setDocumentsAvailable} />
                    <p className="mt-2 text-[10.5px] leading-4 text-slate-500">Déclarer qu’un document existe ne signifie jamais qu’il est vérifié. Les points de vérification restent réservés au contrôle réel.</p>
                  </div>
                </div>

                {price && surface && Number(surface) > 0 ? (
                  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/45 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#0B63CE]">Calcul AkarFinder</p>
                    <p className="mt-1 text-lg font-black text-[#0B2545]">{new Intl.NumberFormat("fr-MA").format(Math.round(Number(price) / Number(surface)))} DH/m²</p>
                    <p className="mt-1 text-xs text-slate-500">Calcul arithmétique uniquement. La position marché sera ajoutée seulement si des comparables réels existent.</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <div className="rounded-2xl border border-[#D9E7F3] bg-[#F8FBFF] p-4">
                  <p className="text-sm font-black text-[#0B2545]">Galerie signature AkarFinder</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">3 photos valides minimum pour publier. 6 à 10 photos utiles font progresser fortement la qualité du dossier.</p>
                </div>
                <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#BFD5EA] bg-white p-5 text-center transition hover:bg-[#F8FBFF]">
                  <ImagePlus className="text-[#0B63CE]" />
                  <span className="mt-2 text-sm font-extrabold text-[#0B2545]">Ajouter jusqu’à 12 photos</span>
                  <span className="text-xs text-slate-500">JPG, PNG ou WebP · 15 Mo max · cible ≥1200 × 800</span>
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addPhotos(event.target.files)} />
                </label>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {photos.map((photo, index) => (
                    <article key={photo.id} className={`overflow-hidden rounded-2xl border ${photo.accepted ? "border-emerald-200" : "border-amber-200"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.preview} alt={`Aperçu ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                      <div className="p-3">
                        <p className="truncate text-xs font-extrabold text-[#0B2545]">{index + 1}. {photo.file.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{photo.message}</p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)} className="grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-30"><ArrowUp size={15} /></button>
                          <button type="button" aria-label="Descendre" disabled={index === photos.length - 1} onClick={() => move(index, 1)} className="grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-30"><ArrowDown size={15} /></button>
                          <button type="button" onClick={() => removePhoto(photo.id)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><Trash2 size={14} /> Retirer</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <div className="xl:hidden">
                  <SellerAkarFinderPreview
                    photoPreview={accepted[0]?.preview}
                    propertyType={propertyType}
                    title={title}
                    city={city}
                    neighborhood={neighborhood}
                    residenceName={residenceName}
                    surface={numberOrNull(surface)}
                    price={numberOrNull(price)}
                    bedrooms={numberOrNull(bedrooms)}
                    bathrooms={numberOrNull(bathrooms)}
                    floorNumber={numberOrNull(floorNumber)}
                    negotiable={negotiable}
                    documentsAvailable={documentsAvailable}
                    acceptedPhotoCount={accepted.length}
                    score={score}
                  />
                </div>

                <label className="mt-6 block text-xs font-extrabold text-[#0B2545]">
                  Description du bien
                  <textarea rows={6} maxLength={2000} className={field} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Décrivez les vrais points forts, l’agencement, l’état et les informations utiles." />
                  <span className="mt-2 block text-[10.5px] font-semibold text-slate-500">{description.trim().length}/2000 · une description utile de 80 caractères ou plus renforce la fiche.</span>
                </label>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <TextField label="Nom du déclarant *" value={name} onChange={setName} />
                  <TextField label="Téléphone *" value={phone} onChange={setPhone} />
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[#D9E7F3] bg-[#F8FBFF] p-4 text-sm leading-6 text-[#334155]">
                  <input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  <span>Je confirme les informations déclarées et j’accepte l’envoi privé des médias pour vérification. Rien n’est publié automatiquement.</span>
                </label>

                <PublishGateSummary
                  score={score.score}
                  photos={accepted.length}
                  phoneOk={phoneValid(phone)}
                  consent={consent}
                  priceOk={Number(price) > 0}
                  surfaceOk={Number(surface) > 0}
                />

                {busy ? (
                  <div className="mt-5">
                    <p className="text-sm font-bold text-[#0B63CE]">Envoi privé : {progress}%</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0B63CE]" style={{ width: `${progress}%` }} /></div>
                  </div>
                ) : null}
                {result && !result.ok ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{result.error}</p> : null}
                <button
                  type="button"
                  disabled={!complete || busy}
                  onClick={() => void submit()}
                  className={`${ui.primaryAction} mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {busy ? "Enregistrement…" : "Enregistrer pour vérification"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={step === 0 || busy}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className={`${ui.secondaryAction} disabled:opacity-40`}
            >
              <ArrowLeft size={16} /> Retour
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canAdvance || busy}
                onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
                className={`${ui.primaryAction} disabled:opacity-40`}
              >
                Continuer <ArrowRight size={16} />
              </button>
            ) : null}
          </div>
        </section>

        <aside className="hidden xl:block">
          <div className="sticky top-5">
            <SellerAkarFinderPreview
              photoPreview={accepted[0]?.preview}
              propertyType={propertyType}
              title={title}
              city={city}
              neighborhood={neighborhood}
              residenceName={residenceName}
              surface={numberOrNull(surface)}
              price={numberOrNull(price)}
              bedrooms={numberOrNull(bedrooms)}
              bathrooms={numberOrNull(bathrooms)}
              floorNumber={numberOrNull(floorNumber)}
              negotiable={negotiable}
              documentsAvailable={documentsAvailable}
              acceptedPhotoCount={accepted.length}
              score={score}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScoreRail({ score }: { score: ReturnType<typeof calculateAkarFinderSellerScore> }) {
  return (
    <section className="rounded-[22px] border border-[#D9E7F3] bg-white p-4 shadow-[0_12px_36px_rgba(11,37,69,0.05)]">
      <p className="text-[9.5px] font-black uppercase tracking-[0.15em] text-[#0B63CE]">Qualité des données</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black tracking-[-0.04em] text-[#0B2545]">{score.score}/100</p>
        <p className="text-right text-[10px] font-bold text-slate-500">{score.label}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#0B63CE]" style={{ width: `${score.score}%` }} />
      </div>
      <div className="mt-4 space-y-2">
        {score.dimensions.map((dimension) => (
          <div key={dimension.key} className="flex items-center justify-between gap-2 text-[10px]">
            <span className="font-semibold text-slate-500">{dimension.label}</span>
            <span className="font-black text-[#0B2545]">{dimension.score}/{dimension.max}</span>
          </div>
        ))}
      </div>
      {score.nextAction ? (
        <div className="mt-4 rounded-xl bg-[#EEF6FF] p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#0B63CE]">Meilleur prochain gain</p>
          <p className="mt-1 text-[10.5px] font-bold leading-4 text-[#0B2545]">{score.nextAction}</p>
        </div>
      ) : null}
      <p className="mt-3 text-[9.5px] leading-4 text-slate-400">Ce score mesure la qualité de la fiche, jamais la valeur du bien.</p>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-extrabold text-[#0B2545]">
      {label}
      <input className={field} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <label className="text-xs font-extrabold text-[#0B2545]">
      {label}
      <input type="number" min={min} step={step} className={field} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BooleanChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-[#D9E7F3] bg-white p-3">
      <p className="text-xs font-extrabold text-[#0B2545]">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onChange(true)}
          className={`rounded-lg px-3 py-2 text-[11px] font-black ${value === true ? "bg-[#0B63CE] text-white" : "bg-[#F8FBFF] text-slate-600"}`}
        >
          Oui
        </button>
        <button
          type="button"
          aria-pressed={value === false}
          onClick={() => onChange(false)}
          className={`rounded-lg px-3 py-2 text-[11px] font-black ${value === false ? "bg-[#0B2545] text-white" : "bg-[#F8FBFF] text-slate-600"}`}
        >
          Non
        </button>
      </div>
    </div>
  );
}

function PublishGateSummary({
  score,
  photos,
  phoneOk,
  consent,
  priceOk,
  surfaceOk,
}: {
  score: number;
  photos: number;
  phoneOk: boolean;
  consent: boolean;
  priceOk: boolean;
  surfaceOk: boolean;
}) {
  const gates = [
    { label: `Score ≥ ${AKARFINDER_SELLER_SCORE_MIN_PUBLISH}/100`, ok: score >= AKARFINDER_SELLER_SCORE_MIN_PUBLISH },
    { label: `${AKARFINDER_SELLER_MIN_PHOTOS} photos valides minimum`, ok: photos >= AKARFINDER_SELLER_MIN_PHOTOS },
    { label: "Surface et prix valides", ok: surfaceOk && priceOk },
    { label: "Contact valide", ok: phoneOk },
    { label: "Consentement explicite", ok: consent },
  ];
  return (
    <section className="mt-5 rounded-2xl border border-[#D9E7F3] bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#0B63CE]">Gates avant vérification</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {gates.map((gate) => (
          <p key={gate.label} className={`flex items-center gap-2 text-[11px] font-bold ${gate.ok ? "text-emerald-700" : "text-slate-500"}`}>
            <CheckCircle2 size={14} className={gate.ok ? "text-emerald-600" : "text-slate-300"} />
            {gate.label}
          </p>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">Après dépôt, une revue humaine puis votre confirmation explicite restent obligatoires avant mise en ligne.</p>
    </section>
  );
}

function stepTitle(step: number) {
  return [
    "Quel bien allez-vous présenter ?",
    "Ancrez le bien dans son territoire",
    "Décrivez ce qui rend la fiche utile",
    "Prix, statut et confiance",
    "Construisez une galerie qui informe",
    "Vérifiez l’annonce AkarFinder produite",
  ][step];
}

function stepDetail(step: number) {
  return [
    "Le type pilote les questions suivantes : aucun champ inutile pour un terrain, un appartement ou un bureau.",
    "La ville et le quartier sont publics. L’adresse exacte peut rester privée tout en améliorant la précision géographique.",
    "Plus les faits sont structurés, plus l’annonce devient comparable, lisible et utile sans jamais inventer d’information.",
    "AkarFinder sépare toujours ce qui est déclaré de ce qui a réellement été vérifié.",
    "La qualité des médias compte davantage que la quantité brute. Les fichiers restent privés avant publication.",
    "L’aperçu reprend la hiérarchie V4 : bien, confiance, territoire, marché, vie locale, décision et source.",
  ][step];
}
