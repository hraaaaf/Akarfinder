export type ObservationSourceKind =
  | "external_web"
  | "partner_authorized"
  | "direct_owner"
  | "demo"
  | "unknown";

export type ObservationLabel =
  | "Observé récemment"
  | "Observé pendant cette recherche"
  | "Première observation AkarFinder"
  | "Déjà observé"
  | "Observé plusieurs fois"
  | "Dernière observation récente"
  | "Source originale à confirmer"
  | "Aperçu limité";

export type ObservationRecord = {
  fingerprint: string;
  source_kind: ObservationSourceKind;
  source_host?: string;
  first_observed_at?: string;
  last_observed_at?: string;
  observation_count?: number;
  last_seen_in_current_search?: boolean;
  city?: string;
  district?: string;
  property_type?: string;
  transaction_type?: string;
};

export type ObservationFingerprintInput = {
  original_url?: string;
  source_host?: string;
  title: string;
  city?: string;
  district?: string;
  property_type?: string;
  transaction_type?: string;
  price?: number;
  surface?: number;
};

export type ObservationSummary = {
  labels: ObservationLabel[];
  help_line?: string;
};
