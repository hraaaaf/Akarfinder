from pathlib import Path

path = Path('docs/ROADMAP.md')
text = path.read_text(encoding='utf-8')
start = '<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->'
end = '<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->'
if text.count(start) != 1 or text.count(end) != 1:
    raise SystemExit('visual roadmap markers are not unique')
replacement = '''<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-START -->
## Bibliothèque visuelle quartiers — Rabat P0 → P2 ✅ CLOSED

Doctrine verrouillée : **photos réelles uniquement**, provenance/licence défendables, aucune photo d’ambiance présentée comme photo du bien, aucune inférence géographique non prouvée.

- **P0 Souissi ✅ CLOSED** — pilote source → droits → rendu → QA → Storage/metadata certifié.
- **P1.1 Agdal ✅ CLOSED**.
- **P1.2 Akkari ✅ CLOSED**.
- **P1.3 Aviation ✅ CLOSED**.
- **P1.4 Hassan ✅ CLOSED**.
- **P1.5 Hay Riad ✅ CLOSED**.
- **P1.6 Les Orangers ✅ CLOSED**.
- **P1.7 Médina ✅ CLOSED — PR #556**.
- **P1.8 Océan ✅ CLOSED — PR #588** ; merge `48188de7f62c80da163ff157040940712e45c93f` ; exact-head `3dc9a6daa6aa56192d8237cd9d79a727f9a65475` ; QA machine 10/10 sur 6 viewports.
- **P1.9 Yacoub El Mansour / Hay El Fath ✅ CLOSED — PR #595** ; merge `ab8f283c727f14b23f6f5717b6cadac5450ad07a` ; 3 scènes réelles certifiées ; human gate PASS.
- **P2 Visual Resolver integration ✅ CLOSED — PR #605** ; merge `997d60dad5fdcd2ad6b081b299834daa9a59bed2` ; exact-head `0451af0fe05997d747ec5e938c0cd52161af4117` ; Contract `31760579909` ✅ ; Product Design Reviewer `31760579663` ✅ ; Independent Release Certifier `31760579853` ✅ ; predecessor Rabat `31760579895` ✅ ; QA 6 viewports, 5/5 images chargées, 0 overflow ; human gate **9,2/10**.
- P2 active les 5 pools Rabat jusque-là manquants dans Search avec libellé public truth-safe `Rabat • contexte <quartier>`, disclosure `Photo d’ambiance`, attribution exacte `Wikimedia Commons` / `KartaView`, city fallback historique inchangé et fail-closed hors providers autorisés.

**Prochain LOT de cette lane : P3 — national rollout.** Démarrage par **P3.1 Casablanca / Maârif** en source discovery read-only ; aucun master ni Search activation avant droits + géographie + QA.
<!-- NEIGHBORHOOD-VISUAL-P0-CLOSEOUT-END -->'''
before, tail = text.split(start, 1)
_, after = tail.split(end, 1)
updated = before + replacement + after
updated = updated.replace('**Version : 2026-08-13**', '**Version : 2026-08-14**', 1)
path.write_text(updated, encoding='utf-8')
