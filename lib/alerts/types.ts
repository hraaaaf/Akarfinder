// P18A — saved_alerts types

export type AlertApiPayload = {
  transaction_type?: string;
  city?: string;
  budget_min?: number;
  budget_max?: number;
  property_type?: string;
  phone?: string;
  email?: string;
  consent: boolean;
};

export type AlertApiResponse =
  | { ok: true; alert_id: string }
  | { ok: false; error: string };

export type SavedAlertRow = {
  id: string;
  created_at: string;
  transaction_type: string;
  city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  property_type: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  consent: boolean;
  status: "active" | "archived";
};
