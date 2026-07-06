import { FORBIDDEN_OBSERVATION_WORDING } from "./observation-labels";

const FORBIDDEN_OBSERVATION_KEYS = new Set([
  "contact",
  "phone",
  "telephone",
  "email",
  "whatsapp",
  "gallery",
  "images",
  "image_url",
  "photo",
  "photos",
  "description",
]);

export function assertNoUnsafeObservationExposure(payload: unknown): void {
  const visited = new Set<unknown>();

  function walk(value: unknown, path: string): void {
    if (value === null || value === undefined || typeof value !== "object") {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (FORBIDDEN_OBSERVATION_KEYS.has(key)) {
        throw new Error(`Unsafe observation field exposure at ${path}.${key}`);
      }
      walk(nestedValue, `${path}.${key}`);
    }
  }

  walk(payload, "payload");
}

export function assertObservationWordingIsSafe(labels: string[]): void {
  const joined = labels.join(" ").toLowerCase();

  for (const forbidden of FORBIDDEN_OBSERVATION_WORDING) {
    if (joined.includes(forbidden)) {
      throw new Error(`Unsafe observation wording detected: "${forbidden}"`);
    }
  }
}
