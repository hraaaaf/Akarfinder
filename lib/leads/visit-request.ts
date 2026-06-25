import type { Listing } from "@/lib/listings/types";
import type {
  VisitDaypart,
  VisitRequestApiPayload,
} from "@/lib/leads/types";

export type VisitRequestValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export type NormalizedVisitRequestPayload = {
  listing_id: string;
  full_name: string;
  phone_whatsapp: string;
  preferred_slot_1?: string;
  preferred_slot_2?: string;
  visit_preferred_daypart?: VisitDaypart;
  visit_message?: string;
  consent_contact: boolean;
  source_page?: string;
};

export type VisitLeadInsert = {
  lead_type: "visit_request";
  visit_status: "pending";
  visit_preferred_slot_1: string | null;
  visit_preferred_slot_2: string | null;
  visit_preferred_daypart: VisitDaypart | null;
  visit_message: string | null;
  listing_title: string | null;
  listing_city: string | null;
  listing_neighborhood: string | null;
  listing_price: number | null;
  listing_source_url: string | null;
  listing_source_access_level: string | null;
  listing_image_permission_status: string | null;
  source_channel: "visit_request";
  source_page: string | null;
  listing_id: string;
  project_type: string | null;
  city: string | null;
  neighborhood: string | null;
  budget_total: number | null;
  currency: string;
  property_type: string | null;
  desired_surface_m2: number | null;
  bedrooms: number | null;
  is_mre: boolean;
  full_name: string;
  phone_whatsapp: string;
  message: string | null;
  consent_contact: true;
  consent_indicative: true;
  lead_temperature: "chaud" | "tiède";
  lead_reasons: string[];
  status: "new";
  user_agent: string | null;
};

const MOROCCAN_DAYPARTS: VisitDaypart[] = [
  "Matin",
  "Midi",
  "Après-midi",
  "Soir",
  "Flexible",
];

export function normalizeVisitRequestPayload(
  body: unknown
): NormalizedVisitRequestPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const source = body as Record<string, unknown>;
  const daypart =
    typeof source.visit_preferred_daypart === "string" &&
    MOROCCAN_DAYPARTS.includes(source.visit_preferred_daypart as VisitDaypart)
      ? (source.visit_preferred_daypart as VisitDaypart)
      : undefined;

  return {
    listing_id:
      typeof source.listing_id === "string" ? source.listing_id.trim() : "",
    full_name:
      typeof source.full_name === "string" ? source.full_name.trim() : "",
    phone_whatsapp:
      typeof source.phone_whatsapp === "string"
        ? normalizeVisitPhone(source.phone_whatsapp)
        : "",
    preferred_slot_1:
      typeof source.preferred_slot_1 === "string"
        ? source.preferred_slot_1.trim()
        : undefined,
    preferred_slot_2:
      typeof source.preferred_slot_2 === "string"
        ? source.preferred_slot_2.trim()
        : undefined,
    visit_preferred_daypart: daypart,
    visit_message:
      typeof source.visit_message === "string"
        ? source.visit_message.trim()
        : undefined,
    consent_contact: source.consent_contact === true,
    source_page:
      typeof source.source_page === "string" ? source.source_page.trim() : undefined,
  };
}

export function normalizeVisitPhone(phone: string): string {
  const stripped = phone.trim().replace(/[\s\-().]/g, "");

  if (/^0[5-7]\d{8}$/.test(stripped)) {
    return `+212${stripped.slice(1)}`;
  }

  if (/^212[5-7]\d{8}$/.test(stripped)) {
    return `+${stripped}`;
  }

  return stripped;
}

function parseIsoLikeSlot(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function validateVisitRequestPayload(
  payload: NormalizedVisitRequestPayload | null
): VisitRequestValidationResult {
  if (!payload) {
    return { ok: false, error: "Corps de requête invalide." };
  }

  if (!payload.listing_id) {
    return { ok: false, error: "Annonce introuvable." };
  }

  if (!payload.full_name || payload.full_name.length < 2) {
    return { ok: false, error: "Nom requis pour la demande de visite." };
  }

  if (!payload.phone_whatsapp || payload.phone_whatsapp.length < 8) {
    return {
      ok: false,
      error: "Téléphone WhatsApp requis pour envoyer la demande.",
    };
  }

  if (payload.consent_contact !== true) {
    return {
      ok: false,
      error: "Consentement de contact requis pour la demande de visite.",
    };
  }

  const slot1 = parseIsoLikeSlot(payload.preferred_slot_1);
  const slot2 = parseIsoLikeSlot(payload.preferred_slot_2);
  if (payload.preferred_slot_1 && !slot1) {
    return { ok: false, error: "Créneau 1 invalide." };
  }
  if (payload.preferred_slot_2 && !slot2) {
    return { ok: false, error: "Créneau 2 invalide." };
  }

  const hasAvailabilitySignal =
    Boolean(slot1) ||
    Boolean(slot2) ||
    Boolean(payload.visit_preferred_daypart) ||
    Boolean(payload.visit_message);

  if (!hasAvailabilitySignal) {
    return {
      ok: false,
      error: "Ajoutez au moins un créneau, un moment préféré ou un message.",
    };
  }

  return { ok: true };
}

export function buildVisitLeadInsert(
  payload: NormalizedVisitRequestPayload,
  listing: Listing,
  userAgent?: string
): VisitLeadInsert {
  const slot1 = parseIsoLikeSlot(payload.preferred_slot_1);
  const slot2 = parseIsoLikeSlot(payload.preferred_slot_2);
  const accessLevel = listing.source_access_level ?? "indexed_only";
  const imagePermission = listing.image_permission_status ?? "unknown";
  const leadTemperature =
    slot1 || slot2 || payload.visit_message || payload.visit_preferred_daypart
      ? "chaud"
      : "tiède";

  return {
    lead_type: "visit_request",
    visit_status: "pending",
    visit_preferred_slot_1: slot1,
    visit_preferred_slot_2: slot2,
    visit_preferred_daypart: payload.visit_preferred_daypart ?? null,
    visit_message: payload.visit_message ?? null,
    listing_title: listing.title,
    listing_city: listing.city,
    listing_neighborhood: listing.neighborhood || null,
    listing_price: listing.price ?? null,
    listing_source_url: listing.listing_url ?? null,
    listing_source_access_level: accessLevel,
    listing_image_permission_status: imagePermission,
    source_channel: "visit_request",
    source_page: payload.source_page ?? `/listings/${listing.id}`,
    listing_id: payload.listing_id,
    project_type:
      listing.transaction_type === "rent"
        ? "louer"
        : listing.transaction_type === "new"
          ? "neuf"
          : "acheter",
    city: listing.city,
    neighborhood: listing.neighborhood || null,
    budget_total: listing.price ?? null,
    currency: listing.currency,
    property_type: listing.property_type,
    desired_surface_m2: listing.surface_m2 ?? null,
    bedrooms: listing.bedrooms ?? null,
    is_mre: false,
    full_name: payload.full_name,
    phone_whatsapp: payload.phone_whatsapp,
    message: payload.visit_message ?? null,
    consent_contact: true,
    consent_indicative: true,
    lead_temperature: leadTemperature,
    lead_reasons: [
      "Demande de visite explicite sur fiche annonce.",
      "Créneau ou disponibilité proposée par le visiteur.",
    ],
    status: "new",
    user_agent: userAgent ?? null,
  };
}

export function buildVisitWhatsAppMessage(input: {
  fullName: string;
  listingTitle: string;
  preferredSlot1?: string | null;
  preferredDaypart?: string | null;
}) {
  const slot = formatVisitSlot(input.preferredSlot1) ?? input.preferredDaypart ?? "créneau à préciser";
  return `Bonjour ${input.fullName}, vous avez demandé une visite pour ${input.listingTitle} sur AkarFinder. Le créneau souhaité est ${slot}. Est-ce toujours disponible pour vous ?`;
}

export function getVisitSourceAccessNotice(accessLevel?: string | null) {
  if (accessLevel === "partner_full") {
    return "Votre demande sera traitée comme un lead partenaire et reste en attente de confirmation.";
  }

  if (accessLevel === "preview_allowed") {
    return "Votre demande est enregistrée par AkarFinder puis traitée selon les droits de diffusion de cette annonce.";
  }

  return "Demande enregistrée par AkarFinder. L’équipe pourra vous orienter vers la bonne source.";
}

export function getVisitSuccessCopy(accessLevel?: string | null) {
  return {
    title: "Demande de visite envoyée.",
    description:
      accessLevel === "indexed_only"
        ? "Demande enregistrée par AkarFinder. L’équipe pourra vous orienter vers la bonne source."
        : "Votre créneau est en attente de confirmation.",
    pendingLabel: "La visite reste en attente de confirmation.",
  };
}

export function formatVisitSlot(slot?: string | null) {
  if (!slot) return null;
  const date = new Date(slot);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toVisitRequestApiPayload(
  payload: NormalizedVisitRequestPayload
): VisitRequestApiPayload {
  return {
    listing_id: payload.listing_id,
    full_name: payload.full_name,
    phone_whatsapp: payload.phone_whatsapp,
    preferred_slot_1: payload.preferred_slot_1,
    preferred_slot_2: payload.preferred_slot_2,
    visit_preferred_daypart: payload.visit_preferred_daypart,
    visit_message: payload.visit_message,
    consent_contact: payload.consent_contact,
    source_page: payload.source_page,
  };
}
