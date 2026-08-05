"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, PauseCircle, PlayCircle } from "lucide-react";
import { ui } from "@/components/ui/design-system";
import type { SellerPublicationAction, SellerPublicationStatus } from "@/lib/seller/publication";

type Props = { draftId: string; uploadToken: string };

type PublicationState = { status: SellerPublicationStatus };

const COPY: Record<SellerPublicationStatus, { title: string; detail: string }> = {
  unpublished: { title: "Annonce non publiée", detail: "Votre dossier est validé. Vous décidez quand le mettre en ligne." },
  live: { title: "Annonce en ligne", detail: "Votre annonce est visible. Vous pouvez la mettre en pause ou la retirer." },
  paused: { title: "Annonce en pause", detail: "Votre annonce n’est plus visible, mais vous pourrez la remettre en ligne." },
  withdrawn: { title: "Annonce retirée", detail: "Cette annonce a été retirée. Elle ne peut plus être remise en ligne depuis ce dossier." },
};

export function SellerPublicationPanel({ draftId, uploadToken }: Props) {
  const [publication, setPublication] = useState<PublicationState>({ status: "unpublished" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/seller-drafts/${encodeURIComponent(draftId)}/publication`, {
      headers: { "x-draft-upload-token": uploadToken },
      cache: "no-store",
    });
    const payload = await response.json() as { ok: boolean; publication?: PublicationState; error?: string };
    if (!response.ok || !payload.ok || !payload.publication) throw new Error(payload.error || "Le statut de l’annonce n’est pas disponible.");
    setPublication(payload.publication);
  }, [draftId, uploadToken]);

  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Le statut n’est pas disponible.")); }, [refresh]);

  async function act(action: SellerPublicationAction) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/seller-drafts/${encodeURIComponent(draftId)}/publication`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-draft-upload-token": uploadToken },
        body: JSON.stringify({ action, confirmation: true }),
      });
      const payload = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "L’action n’a pas pu être appliquée.");
      setMessage(action === "publish" || action === "resume" ? "Votre annonce est maintenant en ligne." : action === "pause" ? "Votre annonce est en pause." : "Votre annonce a été retirée.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’action n’a pas pu être appliquée.");
    } finally { setBusy(false); }
  }

  const copy = COPY[publication.status];
  return (
    <section className={`${ui.surface} mt-6 p-5 text-left`} aria-labelledby="seller-publication-title">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Gestion de l’annonce</p>
      <h2 id="seller-publication-title" className="mt-1 text-lg font-extrabold">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.detail}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {publication.status === "unpublished" ? <button type="button" disabled={busy} onClick={() => void act("publish")} className={ui.primaryAction}><Eye size={16} /> Mettre mon annonce en ligne</button> : null}
        {publication.status === "live" ? <><button type="button" disabled={busy} onClick={() => void act("pause")} className={ui.secondaryAction}><PauseCircle size={16} /> Mettre en pause</button><button type="button" disabled={busy} onClick={() => void act("withdraw")} className={ui.secondaryAction}><EyeOff size={16} /> Retirer l’annonce</button></> : null}
        {publication.status === "paused" ? <><button type="button" disabled={busy} onClick={() => void act("resume")} className={ui.primaryAction}><PlayCircle size={16} /> Remettre en ligne</button><button type="button" disabled={busy} onClick={() => void act("withdraw")} className={ui.secondaryAction}><EyeOff size={16} /> Retirer l’annonce</button></> : null}
      </div>
      {message ? <p aria-live="polite" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
    </section>
  );
}
