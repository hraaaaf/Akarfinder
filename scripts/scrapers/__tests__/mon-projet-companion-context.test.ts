import assert from "node:assert/strict";
import test from "node:test";

import {
  createCompanionSession,
  transitionCompanionSession,
  type CompanionEvent,
  type CompanionSession,
} from "../../../lib/companion-v1/state-machine.js";

function companionAtPreferences(): CompanionSession {
  let session = createCompanionSession("2026-09-02T12:00:00.000Z");
  session = transitionCompanionSession(session, { type: "start" });
  session = transitionCompanionSession(session, { type: "answer_objective", objective: "buy" });
  session = transitionCompanionSession(session, { type: "answer_usage", intended_uses: ["primary_residence"] });
  session = transitionCompanionSession(session, { type: "answer_location", cities: ["Casablanca"] });
  session = transitionCompanionSession(session, { type: "answer_budget", purchase_max_mad: 1_500_000 });
  session = transitionCompanionSession(session, { type: "answer_type", property_types: ["Appartement"] });
  return transitionCompanionSession(session, { type: "answer_constraints", min_surface_m2: 90 });
}

function unsafeEvent(value: unknown): CompanionEvent {
  return value as CompanionEvent;
}

test("Mon Projet rejects malformed boolean context received at runtime", () => {
  const session = companionAtPreferences();
  assert.throws(
    () => transitionCompanionSession(session, unsafeEvent({ type: "answer_context", remote_work: "oui" })),
    /PROFILE_CONTEXT_BOOLEAN_INVALID/,
  );
});

test("Mon Projet rejects malformed anchor collections received at runtime", () => {
  const session = companionAtPreferences();
  assert.throws(
    () => transitionCompanionSession(session, unsafeEvent({ type: "answer_anchors", anchors: "Bureau" })),
    /PROFILE_ANCHOR_VALUES_INVALID/,
  );
});

test("Mon Projet rejects malformed anchor labels as profile validation errors", () => {
  const session = companionAtPreferences();
  assert.throws(
    () => transitionCompanionSession(session, unsafeEvent({ type: "answer_anchors", anchors: [{ label: 42 }] })),
    /PROFILE_ANCHOR_TEXT_INVALID/,
  );
});
