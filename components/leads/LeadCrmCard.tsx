"use client";
// P11D-D — Client-side CRM controls for Pro lead inbox.
// Handles inline status updates, internal notes, follow-up dates.
// Token is passed from the server-side page as a prop (internal MVP only).

import { useState } from "react";
import type { BuyerLeadRow, LeadStatus, VisitStatus } from "@/lib/leads/types";
import {
  ALLOWED_LEAD_STATUSES,
  ALLOWED_VISIT_STATUSES,
  mapLeadStatusLabel,
  mapVisitStatusLabel,
} from "@/lib/leads/lead-admin";

type CrmState = {
  status: LeadStatus;
  visitStatus: VisitStatus | null;
  internalNotes: string;
  nextFollowUpAt: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  lead: BuyerLeadRow;
  adminToken: string;
};

export function LeadCrmCard({ lead, adminToken }: Props) {
  const isVisit = (lead.lead_type ?? "buyer_profile") === "visit_request";

  const [open, setOpen] = useState(false);
  const [crm, setCrm] = useState<CrmState>({
    status: lead.status,
    visitStatus: (lead.visit_status as VisitStatus | null) ?? null,
    internalNotes: lead.internal_notes ?? "",
    nextFollowUpAt: lead.next_follow_up_at
      ? lead.next_follow_up_at.slice(0, 10)
      : "",
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function patchLead(payload: Record<string, unknown>) {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-leads-admin-token": adminToken,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSaveStatus("error");
        return false;
      }
      setSaveStatus("saved");
      // Reset saved state after 2s
      setTimeout(() => setSaveStatus("idle"), 2000);
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }

  async function handleSaveNote() {
    const payload: Record<string, unknown> = {
      status: crm.status,
      internal_notes: crm.internalNotes || null,
    };
    if (crm.nextFollowUpAt) {
      payload.next_follow_up_at = crm.nextFollowUpAt;
    } else {
      payload.next_follow_up_at = null;
    }
    if (isVisit && crm.visitStatus) {
      payload.visit_status = crm.visitStatus;
    }
    await patchLead(payload);
  }

  async function handleMarkContacted() {
    const ok = await patchLead({ mark_contacted: true });
    if (ok) {
      setCrm((prev) => ({ ...prev, status: "contacted" }));
    }
  }

  async function handleArchive() {
    const ok = await patchLead({ status: "archived" });
    if (ok) {
      setCrm((prev) => ({ ...prev, status: "archived" }));
    }
  }

  const feedbackLabel =
    saveStatus === "saved"
      ? "Lead mis à jour."
      : saveStatus === "error"
        ? "Impossible de mettre à jour le lead pour le moment."
        : null;

  const feedbackColor =
    saveStatus === "saved" ? "text-emerald-700" : "text-red-700";

  return (
    <div className="mt-4 border-t border-[#ede4d0] pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl bg-[#f7f4ed] px-4 py-2.5 text-left text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-gray-500 transition hover:bg-[#f0ece2]"
      >
        <span>Suivi interne</span>
        <span className="text-[16px] leading-none">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-4 rounded-xl border border-[#e8dfc8] bg-[#fffdf9] p-4">
          {/* Status row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                Statut lead
              </label>
              <select
                value={crm.status}
                onChange={(e) =>
                  setCrm((prev) => ({
                    ...prev,
                    status: e.target.value as LeadStatus,
                  }))
                }
                className="w-full rounded-lg border border-[#ddd0b0] bg-white px-3 py-2 text-[13px] font-semibold text-deepblue focus:outline-none focus:ring-2 focus:ring-bronze-400"
              >
                {ALLOWED_LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {mapLeadStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {isVisit ? (
              <div>
                <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
                  Statut visite
                </label>
                <select
                  value={crm.visitStatus ?? "pending"}
                  onChange={(e) =>
                    setCrm((prev) => ({
                      ...prev,
                      visitStatus: e.target.value as VisitStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-[#ddd0b0] bg-white px-3 py-2 text-[13px] font-semibold text-deepblue focus:outline-none focus:ring-2 focus:ring-bronze-400"
                >
                  {ALLOWED_VISIT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {mapVisitStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* Follow-up date */}
          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Prochain suivi (optionnel)
            </label>
            <input
              type="date"
              value={crm.nextFollowUpAt}
              onChange={(e) =>
                setCrm((prev) => ({ ...prev, nextFollowUpAt: e.target.value }))
              }
              className="rounded-lg border border-[#ddd0b0] bg-white px-3 py-2 text-[13px] font-semibold text-deepblue focus:outline-none focus:ring-2 focus:ring-bronze-400"
            />
          </div>

          {/* Internal notes */}
          <div>
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-gray-400">
              Note interne
            </label>
            <textarea
              value={crm.internalNotes}
              onChange={(e) =>
                setCrm((prev) => ({ ...prev, internalNotes: e.target.value }))
              }
              placeholder="Note interne sur ce lead (max 2000 caractères)…"
              maxLength={2000}
              rows={3}
              className="w-full resize-y rounded-lg border border-[#ddd0b0] bg-white px-3 py-2.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-bronze-400"
            />
            <p className="mt-0.5 text-right text-[11px] text-gray-400">
              {crm.internalNotes.length}/2000
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={saveStatus === "saving"}
              className="rounded-xl bg-deepblue px-4 py-2 text-[13px] font-extrabold text-white transition hover:bg-[#0f2d5a] disabled:opacity-60"
            >
              {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer la note"}
            </button>
            <button
              type="button"
              onClick={handleMarkContacted}
              disabled={saveStatus === "saving"}
              className="rounded-xl border border-[#d0c5a8] bg-[#fffdf8] px-4 py-2 text-[13px] font-bold text-deepblue transition hover:bg-[#f7f3ea] disabled:opacity-60"
            >
              Marquer contacté
            </button>
            {crm.status !== "archived" ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={saveStatus === "saving"}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Archiver
              </button>
            ) : null}
          </div>

          {feedbackLabel ? (
            <p className={`text-[12.5px] font-semibold ${feedbackColor}`}>
              {feedbackLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
