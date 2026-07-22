import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCompanionSession } from "../../../lib/companion-v1/state-machine.js";
import { planCompanionQuestion } from "../../../lib/companion-v1/question-planner.js";

describe("#19F Companion structured question planner", () => {
  it("plans a specific coast-vs-tourism tradeoff from explicit profile tension", () => {
    const session = createCompanionSession();
    session.state = "COMPROMIS";
    session.profile.neighborhood_preferences = [
      { key:"coastal_lifestyle", direction:"prefer_high", importance:"high", target:null, signal:{ value:true, source:"explicit", confidence:"high", updated_at:session.last_transition_at } },
      { key:"tourism_intensity", direction:"prefer_low", importance:"high", target:null, signal:{ value:true, source:"explicit", confidence:"high", updated_at:session.last_transition_at } },
    ];
    const plan = planCompanionQuestion(session);
    assert.equal(plan.id, "coast_vs_tourism");
    assert.equal(plan.answer_type, "single_choice");
    assert.ok((plan.options?.length ?? 0) >= 3);
  });

  it("never asks a free-form chatbot question type", () => {
    const session = createCompanionSession();
    for (const state of ["ENTRY","OBJECTIF","USAGE","LOCALISATION","BUDGET","TYPE","CONTRAINTES_ABSOLUES","PREFERENCES","PRIORISATION","COMPROMIS","PROFIL_RECAP","RECHERCHE","TRI_PAR_ELIMINATION","AFFINAGE","NOUVELLE_RECHERCHE"] as const) {
      session.state = state;
      const plan = planCompanionQuestion(session);
      assert.notEqual((plan as { answer_type:string }).answer_type, "free_text_chat");
    }
  });
});
