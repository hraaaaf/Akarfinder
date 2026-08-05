"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, ShieldCheck, Trash2 } from "lucide-react";
import { PropertyTypeVisualSelector } from "@/components/property-types/PropertyTypeVisualSelector";
import { ui } from "@/components/ui/design-system";
import type { LeadApiResponse } from "@/lib/leads/types";
import type { ListingPropertyType } from "@/lib/listings/types";
import type { SellerIntent } from "@/lib/seller/readiness";

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

async function inspect(file: File): Promise<DraftPhoto> {
  const id = `${file.name}-${file.size}-${file.lastModified}`;
  const preview = URL.createObjectURL(file);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { id, file, preview, accepted: false, message: 'Choisissez une photo JPG, PNG ou WebP.' };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { id, file, preview, accepted: false, message: 'Cette photo dépasse 15 Mo.' };
  }
  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
      id,
      file,
      preview,
      accepted: image.naturalWidth >= 1200 && image.naturalHeight >= 800,
      message: image.naturalWidth >= 1200 && image.naturalHeight >= 800
        ? 'Bonne taille pour présenter votre bien.'
        : 'Choisissez si possible une image d’au moins 1200 × 800.',
    });
    image.onerror = () => resolve({ id, file, preview, accepted: false, message: 'Cette image ne peut pas être lue.' });
    image.src = preview;
  });
}

export function SellerSecurePublishForm({ initialPropertyType, initialIntent = 'publish' }: Props) {
  const [propertyType, setPropertyType] = useState<"" | ListingPropertyType>(initialPropertyType ?? '');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [surface, setSurface] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; error?: string; uploaded?: number } | null>(null);

  const accepted = useMemo(() => photos.filter((photo) => photo.accepted), [photos]);
  const complete = Boolean(propertyType && city.trim() && Number(surface) > 0 && phone.trim() && consent);

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

  async function submit() {
    if (!complete) return;
    setBusy(true);
    setResult(null);
    setProgress(0);
    try {
      const leadResponse = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_channel: 'seller',
          source_page: '/vendre/dossier',
          profile: {
            project: 'vendre',
            phone,
            name: name || undefined,
            city: city.trim(),
            neighborhood: neighborhood.trim() || undefined,
            propertyType,
            surface: Number(surface),
            budgetTotal: price ? Number(price) : undefined,
            message: `[${initialIntent}] ${description}`.trim(),
            consentContact: true,
            consentIndicatif: true,
          },
        }),
      });
      const lead = await leadResponse.json() as LeadApiResponse;
      if (!lead.ok) throw new Error(lead.error);

      let uploaded = 0;
      if (accepted.length > 0) {
        if (!lead.seller_property_draft_id || !lead.seller_upload_token) throw new Error('Le brouillon est enregistré, mais les photos n’ont pas pu être préparées.');
        for (const photo of accepted) {
          const form = new FormData();
          form.append('photo', photo.file, photo.file.name);
          const response = await fetch(`/api/seller-drafts/${encodeURIComponent(lead.seller_property_draft_id)}/photos`, {
            method: 'POST',
            headers: { 'x-draft-upload-token': lead.seller_upload_token },
            body: form,
          });
          const payload = await response.json() as { ok: boolean; error?: string };
          if (!response.ok || !payload.ok) throw new Error(payload.error || 'Une photo n’a pas pu être envoyée.');
          uploaded += 1;
          setProgress(Math.round(uploaded / accepted.length * 100));
        }
      }
      setResult({ ok: true, uploaded });
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'Enregistrement impossible.' });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) {
    return (
      <section className={`${ui.surface} mx-auto max-w-2xl p-8 text-center`}>
        <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{result.uploaded ? 'Prête à vérifier' : 'Brouillon'}</p>
        <h1 className="mt-2 text-2xl font-extrabold">Brouillon du bien enregistré</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Ces faits déclarés restent séparés des informations vérifiées. {result.uploaded ? `${result.uploaded} photo(s) sont conservées dans un espace privé. ` : ''}Rien n’est publié automatiquement.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/vendre" className={ui.primaryAction}>Retour à Vendre</Link><Link href="/search" className={ui.secondaryAction}>Voir des biens comparables</Link></div>
      </section>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <section className={`${ui.surface} p-5 sm:p-7`}>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Dossier vendeur sécurisé</p>
        <h1 className="mt-2 text-3xl font-extrabold">Préparez, vérifiez, puis envoyez votre brouillon</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Vous voyez l’aperçu exact avant l’envoi. Les photos restent privées et aucune publication n’est possible depuis ce formulaire.</p>

        <div className="mt-7">
          <PropertyTypeVisualSelector value={propertyType} onChange={(value) => setPropertyType(value === 'all' ? '' : value)} ariaLabel="Type du bien" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-extrabold">Ville<input className={field} value={city} onChange={(event) => setCity(event.target.value)} /></label>
          <label className="text-xs font-extrabold">Quartier<input className={field} value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></label>
          <label className="text-xs font-extrabold">Surface en m²<input type="number" min="1" className={field} value={surface} onChange={(event) => setSurface(event.target.value)} /></label>
          <label className="text-xs font-extrabold">Prix souhaité en DH<input type="number" min="0" className={field} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
          <label className="text-xs font-extrabold sm:col-span-2">Description<textarea rows={5} maxLength={2000} className={field} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        </div>

        <div className="mt-8 border-t border-border/20 pt-6">
          <h2 className="text-xl font-extrabold">Aperçu et ordre des photos</h2>
          <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-surface-muted p-5 text-center">
            <ImagePlus className="text-primary" />
            <span className="mt-2 text-sm font-extrabold">Ajouter jusqu’à 12 photos</span>
            <span className="text-xs text-muted-foreground">JPG, PNG ou WebP · 15 Mo maximum</span>
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addPhotos(event.target.files)} />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <article key={photo.id} className={`overflow-hidden rounded-2xl border ${photo.accepted ? 'border-emerald-200' : 'border-amber-200'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt={`Aperçu ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                <div className="p-3"><p className="truncate text-xs font-extrabold">{index + 1}. {photo.file.name}</p><p className="mt-1 text-xs text-muted-foreground">{photo.message}</p><div className="mt-3 flex gap-2"><button type="button" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)} className="grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" aria-label="Descendre" disabled={index === photos.length - 1} onClick={() => move(index, 1)} className="grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-30"><ArrowDown size={15} /></button><button type="button" onClick={() => removePhoto(photo.id)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><Trash2 size={14} /> Retirer</button></div></div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/20 pt-6">
          <h2 className="text-xl font-extrabold">Aperçu final</h2>
          <div className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm"><strong>{propertyType || 'Type à compléter'}</strong><p className="mt-1 text-muted-foreground">{[neighborhood, city].filter(Boolean).join(', ') || 'Localisation à compléter'} · {surface ? `${surface} m²` : 'surface à compléter'}</p><p className="mt-2 line-clamp-3">{description || 'Votre description apparaîtra ici.'}</p></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-extrabold">Téléphone<input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="text-xs font-extrabold">Nom<input className={field} value={name} onChange={(event) => setName(event.target.value)} /></label></div>
          <label className="mt-5 flex items-start gap-3 rounded-xl bg-surface-muted p-4 text-sm leading-6"><input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Je confirme les informations et j’accepte l’envoi privé des photos pour vérification. Rien n’est publié automatiquement.</span></label>
          {busy && accepted.length > 0 ? <div className="mt-4"><p className="text-sm font-bold text-primary">Envoi privé : {progress}%</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div></div> : null}
          {result && !result.ok ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{result.error}</p> : null}
          <button type="button" disabled={!complete} onClick={() => void submit()} className={`${ui.primaryAction} mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50`}>{busy ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
        </div>
      </section>

      <aside className="lg:sticky lg:top-24">
        <section className={`${ui.surface} p-5`}><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Statut</p><p className="mt-2 text-xl font-extrabold">{accepted.length ? 'Prête à envoyer' : 'Brouillon'}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{accepted.length} photo(s) acceptée(s) sur {photos.length}.</p></section>
        <section className={`${ui.surfaceMuted} mt-4 p-4`}><p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={16} className="text-primary" /> Espace privé</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Le stockage n’est pas public. Le serveur vérifie le format, la taille et la signature réelle de chaque image.</p></section>
      </aside>
    </div>
  );
}
