from pathlib import Path

MERGE = "81f4809424757838c099b6acfb8f8d4b719deab7"
PROOF = """### P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402

P0.4 a revu en shadow les **5 domaines `STRONG_PATTERN_EVIDENCE`** issus de P0.3, sans activer aucun pattern. Le replay utilise un oracle conservateur à trois états : signatures détail certifiées = `POSITIVE`, signatures explicitement non-detail = `NEGATIVE`, tout le reste = `AMBIGUOUS`. Un pattern qui absorbe une URL ambiguë est rejeté fail-closed.

Preuve finale : **15/15 requêtes Common Crawl URL-index réussies**, **2 `SHADOW_ACCEPTABLE` / 3 `REJECTED_SHADOW`**, **0 faux positif**, **1 faux négatif**, **42 matchs ambigus** uniquement sur les candidats rejetés. Acceptés en shadow : `christiesrealestatemorocco.com` (**1024 positifs / 9 négatifs / précision 1 / rappel 1 / 0 ambiguous match**) et `immobilier-a-marrakech.com` (**165 / 15 / précision 1 / rappel 1 / 0 ambiguous match**). Rejetés : `immo-maroc.com` (corpus négatif insuffisant + 4 ambiguous matches), `immohammedia.com` (3 ambiguous matches), `leaderimmo.ma` (35 ambiguous matches).

Finding Reviewer corrigé avant merge : les URL non certifiées ne sont plus fabriquées comme négatives ; elles restent `AMBIGUOUS`. Le client Common Crawl respecte `Retry-After`, utilise retry/timeout bornés et ne contourne aucun rate-limit. **20/20 workflows exact-head verts**, Reviewer **PASS 9,5/10**, Release Certifier **GO**, merge `81f4809424757838c099b6acfb8f8d4b719deab7`, gate P0.4 post-merge **PASS**. Artefact exact-head : `sha256:c772ed6a63daa800238040e93f17dc983d58c24538290ac05ac96f9538e7d22f`.

Contrat : **0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 harvest, 0 pattern activation**. P0.4 prouve seulement une aptitude structurelle shadow ; il n'accorde aucune autorisation d'activation.
"""

# README
p = Path("README.md")
s = p.read_text()
if "### P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402" not in s:
    anchor = "\n### DATA-4"
    s = s.replace(anchor, "\n" + PROOF + anchor, 1) if anchor in s else s.rstrip() + "\n\n" + PROOF + "\n"
p.write_text(s)

# ROADMAP
p = Path("docs/ROADMAP.md")
s = p.read_text()
old_start = "## 7.4 P0.4 — Registry Pattern Review Shadow — NEXT"
roadmap_block = PROOF.replace("### P0.4", "## 7.4 P0.4") + "\n## 7.5 Prochaine étape mass-index\n\nUn LOT séparé pourra examiner **uniquement les 2 candidats `SHADOW_ACCEPTABLE`** pour une éventuelle revue Registry/canary bornée. Cette étape devra revalider policy/autorisation, conserver rollback et fail-closed, et ne devra jamais activer automatiquement les 3 candidats rejetés.\n"
if old_start in s:
    start = s.index(old_start)
    end = s.find("\n# 8.", start)
    if end == -1:
        end = len(s)
    s = s[:start] + roadmap_block + s[end:]
elif "## 7.4 P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402" not in s:
    anchor = "\n# 8."
    s = s.replace(anchor, "\n" + roadmap_block + anchor, 1) if anchor in s else s.rstrip() + "\n\n" + roadmap_block
s = s.replace(
    "**P0.1, P0.2 et P0.3 sont CLOSED.** Exécuter ensuite **P0.4 — Registry Pattern Review Shadow** uniquement sur les 5 domaines `STRONG_PATTERN_EVIDENCE`. Le LOT reste read-only/shadow : propositions + tests positifs/négatifs + replay, sans mutation Registry, sans harvest, sans nouvelle source et sans expansion automatique.",
    "**P0.1, P0.2, P0.3 et P0.4 sont CLOSED.** La prochaine étape mass-index est un LOT séparé de revue Registry/canary, limité aux **2 candidats `SHADOW_ACCEPTABLE`** ; aucune activation automatique, et les 3 candidats rejetés restent bloqués."
)
p.write_text(s)

# SESSION
p = Path("docs/SESSION.md")
s = p.read_text()
s = s.replace(
    "**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 Common Crawl Pattern Evidence ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = P0.4 Registry Pattern Review Shadow**",
    "**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = revue Registry/canary bornée sur les 2 `SHADOW_ACCEPTABLE` uniquement**"
)
s = s.replace(
    "Base du closeout DATA : `main` `8ffffc7cfbe0921d21f66887e1c4ecccf3a738cb` — merge PR #400.",
    f"Base du closeout DATA : `main` `{MERGE}` — merge PR #402."
)
old = "# PROCHAIN LOT DATA — P0.4 Registry Pattern Review Shadow\n\nUniquement les **5 STRONG**. Produire des patterns candidats, corpus positifs/négatifs et replay shadow avec mesure des erreurs. **Zéro mutation Registry, zéro harvest, zéro write production.** Les 6 reviewable ne sont pas incluses automatiquement ; les 7 insufficient restent bloquées.\n"
replacement = PROOF.replace("### P0.4", "# P0.4") + "\n# PROCHAINE ÉTAPE DATA\n\nLOT séparé de revue Registry/canary uniquement pour `christiesrealestatemorocco.com` et `immobilier-a-marrakech.com`, avec revalidation policy/autorisation et rollback avant toute mutation. `immo-maroc.com`, `immohammedia.com` et `leaderimmo.ma` restent bloqués tant que leur ambiguïté n'est pas résolue.\n"
if old in s:
    s = s.replace(old, replacement)
elif "# P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402" not in s:
    anchor = "\n# UX / Search — état court"
    s = s.replace(anchor, "\n" + replacement + anchor, 1)
s = s.replace(
    "DATA-4.4C, P0.1, P0.2 et P0.3 sont fermés. Le reconciler #396 est fermé. **Prochain LOT mass-index : P0.4 — Registry Pattern Review Shadow**, limité aux 5 preuves fortes. Aucun nouveau scraper/source direct, aucune activation Registry, aucun harvest et aucune expansion automatique.",
    "DATA-4.4C, P0.1, P0.2, P0.3 et P0.4 sont fermés. Le reconciler #396 est fermé. **Prochaine étape mass-index : LOT séparé de revue Registry/canary limité aux 2 `SHADOW_ACCEPTABLE`**, sans activation automatique ; les 3 rejetés restent bloqués."
)
p.write_text(s)

Path(".github/workflows/p0-4-closeout-docs-temp.yml").unlink(missing_ok=True)
Path("scripts/tmp-p0-4-closeout-docs.py").unlink(missing_ok=True)
