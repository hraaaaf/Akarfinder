"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Send } from "lucide-react";
import { SellerPublicationPanel } from "@/components/vendre/SellerPublicationPanel";
import { ui } from "@/components/ui/design-system";
import {
  sellerReviewReasonLabel,
  type SellerReviewReason,
  type SellerReviewStatus,
} from "@/lib/seller/moderation";

type ReviewDraft = {
  review_status: SellerReviewStatus;
  review_reasons: SellerReviewReason[] | null;
  reviewer_note: string | null;
  seller_correction_note: string | null;
  reviewed_at: string | null;
  resubmitted_at: string | null;
  publication_eligible: false;
};

type Props = { draftId: string; uploadToken: string };

const STATUS_COPY: Record<SellerReviewStatus, { title: string; detail: string }> = {
  draft: { title: "Brouillon enregistré", detail: "Votre dossier peut encore être complété avant vérification." },
  uploading: { title: "Photos en cours d’envoi", detail: "L’envoi privé des photos est en cours." },
  ready_for_review: { title: "À vérifier", detail: "Votre dossier est prêt. Une vérification humaine est nécessaire avant toute publication." },
  needs_changes: { title: "Quelques corrections sont nécessaires", detail: "Suivez les indications ci-dessous, puis renvoyez votre dossier." },
  resubmitted: { title: "Corrections envoyées", detail: "Votre dossier corrigé est de nouveau en cours de vérification." },
  approved: { title: "Dossier validé", detail: "Votre dossier est validé. Vous restez la seule personne à décider de sa mise en ligne." },
};

export function SellerReviewStatusPanel({ draftId, uploadToken }: Props) {
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/seller-drafts/${encodeURIComponent(draftId)}/review`, {
        headers: { "x-draft-upload-token": uploadToken },
        cache: "no-store",
      });
      const payload = await response.json() as { ok: boolean; draft?: ReviewDraft; error?: string };
      if (!response.ok || !payload.ok || !payload.draft) throw new Error(payload.error || "Le suivi n’est pas disponible.");
      setDraft(payload.draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le suivi n’est pas disponible.");
    } finally {
      setBusy(false);
    }
  }, [draftId, uploadToken]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function resubmit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/seller-drafts/${encodeURIComponent(draftId)}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-draft-upload-token": uploadToken },
        body: JSON.stringify({ correction_note: note }),
      });
      const payload = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Le dossier n’a pas pu être renvoyé.");
      setMessage("Votre dossier corrigé a bien été renvoyé.");
      setNote("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le dossier n’a pas pu être renvoyé.");
    } finally {
      setBusy(false);
    }
  }

  const status = draft?.review_status ?? "ready_for_review";
  const copy = STATUS_COPY[status];
  const reasons = draft?.review_reasons ?? [];

  return (
    <div>
      <section className={`${ui.surfaceMuted} mt-6 p-5 text-left`} aria-labelledby="seller-review-title">
        <div className="flex items-start gap-3">
          {status === "approved" ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} /> : status === "needs_changes" ? <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={22} /> : <Clock3 className="mt-0.5 shrink-0 text-primary" size={22} />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Suivi du dossier</p>
            <h2 id="seller-review-title" className="mt-1 text-lg font-extrabold">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.detail}</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/30 bg-background" aria-label="Actualiser le suivi">
            <RefreshCw size={16} className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
          </button>
        </div>

        {status === "needs_changes" ? (
          <div className="mt-5">
            <h3 className="text-sm font-extrabold">À améliorer</h3>
            <ul className="mt-3 space-y-2">{reasons.map((reason) => <li key={reason} className="rounded-xl bg-background px-4 py-3 text-sm font-semibold">{sellerReviewReasonLabel(reason)}</li>)}</ul>
            {draft?.reviewer_note ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{draft.reviewer_note}</p> : null}
            <label className="mt-5 block text-sm font-extrabold">Ce que vous avez corrigé <span className="font-normal text-muted-foreground">(facultatif)</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1200} rows={4} className={`${ui.field} mt-2 w-full px-4 py-3 text-sm`} placeholder="Exemple : j’ai ajouté les photos de la façade et précisé le quartier." />
            </label>
            <button type="button" onClick={() => void resubmit()} disabled={busy} className={`${ui.primaryAction} mt-4 w-full sm:w-auto`}><Send size={16} /> J’ai corrigé mon dossier</button>
          </div>
        ) : null}

        {message ? <p aria-live="polite" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      {status === "approved" ? <SellerPublicationPanel draftId={draftId} uploadToken={uploadToken} /> : null}
    </div>
  );
}
