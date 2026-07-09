import { assertPublicPropertyIndexRecordSafety } from "@/lib/public-property-index/public-safety";
import type { OpenSerpRawResult } from "./types";

const FORBIDDEN_KEYS = [
  "raw_metadata",
  "contact",
  "phone",
  "whatsapp",
  "email",
  "gallery",
  "image",
  "image_url",
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "source_registry",
];

export function assertOpenSerpRawResultSafety(result: OpenSerpRawResult): void {
  const serialized = JSON.stringify(result).toLowerCase();
  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`Unsafe OpenSERP raw field exposure detected: ${key}`);
    }
  }
}

export function assertOpenSerpMappedRecordSafety(record: {
  [key: string]: unknown;
}): void {
  assertPublicPropertyIndexRecordSafety(record as never);
}
