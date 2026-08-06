from pathlib import Path

path = Path("components/companion/MonProjetWizardP1A.tsx")
source = path.read_text()

old = '''  async function applyEvents(events: CompanionEvent[]) {
    setPending(true);
    setError(null);
    let current = session;
    try {
      for (const event of events) {
        const response = await fetch("/api/companion/transition", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session: current, event }),
        });
        const payload = await response.json() as { session?: CompanionSession; error?: string };
        if (!response.ok || !payload.session) throw new Error(payload.error ?? "TRANSITION_FAILED");
        current = payload.session;
      }
      setSession(current);
      setStep((value) => Math.min(TOTAL_STEPS, value + 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }

  function goBack() {
    if (step === 1) return;
    setStep((value) => value - 1);
  }
'''

new = '''  async function runEvents(base: CompanionSession, events: CompanionEvent[]) {
    let current = base;
    for (const event of events) {
      const response = await fetch("/api/companion/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: current, event }),
      });
      const payload = await response.json() as { session?: CompanionSession; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "TRANSITION_FAILED");
      current = payload.session;
    }
    return current;
  }

  async function applyEvents(events: CompanionEvent[]) {
    setPending(true);
    setError(null);
    try {
      const current = await runEvents(session, events);
      setSession(current);
      setStep((value) => Math.min(TOTAL_STEPS, value + 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }

  function eventsBeforeStep(targetStep: number): CompanionEvent[] {
    const events: CompanionEvent[] = [];
    if (targetStep >= 2 && objective) events.push({ type: "start" }, { type: "answer_objective", objective }, { type: "answer_usage", intended_uses: uses });
    if (targetStep >= 3) events.push({ type: "answer_location", cities: [city.trim()] }, objective === "rent" ? { type: "answer_budget", rent_monthly_max_mad: budgetUnknown ? null : Number(budget) } : { type: "answer_budget", purchase_max_mad: budgetUnknown ? null : Number(budget) });
    if (targetStep >= 4) events.push({ type: "answer_type", property_types: propertyTypes }, { type: "answer_constraints", min_surface_m2: minSurface ? Number(minSurface) : null, min_bedrooms: minBedrooms ? Number(minBedrooms) : null, required_features: requiredFeatures });
    if (targetStep >= 5) {
      const answers: CompanionPreferenceAnswer[] = preferences.map((key) => {
        const definition = PREFERENCES.find((item) => item.key === key)!;
        return { key, direction: definition.direction, importance: "high" };
      });
      events.push({ type: "answer_preferences", preferences: answers });
    }
    if (targetStep >= 6) events.push({ type: "answer_priorities", priorities });
    if (targetStep >= 7) events.push({ type: "answer_compromise", tourism_intensity_max: centralityCalm === "calm" ? 2 : centralityCalm === "balanced" ? 4 : 6 });
    if (targetStep >= 8) events.push({ type: "confirm_profile" });
    return events;
  }

  async function goBack() {
    if (step === 1 || pending) return;
    const targetStep = step - 1;
    setPending(true);
    setError(null);
    try {
      const rebuilt = await runEvents(createCompanionSession(), eventsBeforeStep(targetStep));
      setSession(rebuilt);
      setStep(targetStep);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "TRANSITION_FAILED");
    } finally {
      setPending(false);
    }
  }
'''

if old not in source:
    raise SystemExit("target snippet not found")

path.write_text(source.replace(old, new))
