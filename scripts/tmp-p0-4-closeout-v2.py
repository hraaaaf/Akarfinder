from pathlib import Path

MERGE = "81f4809424757838c099b6acfb8f8d4b719deab7"
PROOF = """### P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402

P0.4 a revu en shadow les **5 domaines `STRONG_PATTERN_EVIDENCE`** issus de P0.3, sans activer aucun pattern. Le replay utilise un oracle conservateur à trois états : signatures détail certifiées = `POSITIVE`, signatures explicitement non-detail = `NEGATIVE`, tout le reste = `AMBIGUOUS`. Un pattern qui absorbe une URL ambiguë est rejeté fail-closed.

Preuve finale : **15/15 requêtes Common Crawl URL-index réussies**, **2 `SHADOW_ACCEPTABLE` / 3 `REJECTED_SHADOW`**, **0 faux positif**, **1 faux négatif**, **42 matchs ambigus** uniquement sur les candidats rejetés. Acceptés en shadow : `christiesrealestatemorocco.com` (**1024 positifs / 9 négatifs / précision 1 / rappel 1 / 0 ambiguous match**) et `immobilier-a-marrakech.com` (**165 / 15 / précision 1 / rappel 1 / 0 ambiguous match**). Rejetés : `immo-maroc.com` (corpus négatif insuffisant + 4 ambiguous matches), `immohammedia.com` (3 ambiguous matches), `leaderimmo.ma` (35 ambiguous matches).

Finding Reviewer corrigé avant merge : les URL non certifiées ne sont plus fabriquées comme négatives ; elles restent `AMBIGUOUS`. Le client Common Crawl respecte `Retry-After`, utilise retry/timeout bornés et ne contourne aucun rate-limit. **20/20 workflows exact-head verts**, Reviewer **PASS 9,5/10**, Release Certifier **GO**, merge `81f4809424757838c099b6acfb8f8d4b719deab7`, gate P0.4 post-merge **PASS**. Artefact exact-head : `sha256:c772ed6a63daa800238040e93f17dc983d58c24538290ac05ac96f9538e7d22f`.

Contrat : **0 source-site request, 0 WARC/content fetch, 0 DB mutation, 0 Registry/policy mutation, 0 harvest, 0 pattern activation**. P0.4 prouve seulement une aptitude structurelle shadow ; il n'accorde aucune autorisation d'activation.
"""

# README — replace stale P0.4-next sentence, insert closed section before DATA-4.
p = Path('README.md')
s = p.read_text()
stale = 'Prochain lot mass-index : **P0.4 — Registry Pattern Review Shadow** sur les **5 strong uniquement**. Il doit convertir les signatures en propositions de patterns avec contrôles positifs/négatifs et shadow replay ; aucune activation automatique. Les 6 reviewable restent hors activation et les 7 insufficient restent bloqués.'
next_text = 'Étape mass-index suivante après P0.4 : **revue Registry/canary bornée uniquement aux 2 candidats `SHADOW_ACCEPTABLE`**, dans un LOT séparé avec revalidation policy/autorisation et rollback avant toute mutation. Les 3 candidats rejetés restent bloqués.'
if stale in s:
    s = s.replace(stale, next_text, 1)
if '### P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402' not in s:
    anchor = '\n### DATA-4 — Reservoir Strategy'
    if anchor not in s:
        raise SystemExit('README DATA-4 anchor missing')
    s = s.replace(anchor, '\n' + PROOF + anchor, 1)
p.write_text(s)

# ROADMAP — preserve current Search status, only extend DATA status and replace P0.4 block/action.
p = Path('docs/ROADMAP.md')
s = p.read_text()
status_old = '; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 Common Crawl Discovery Coverage ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**'
status_new = '; DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ PR #396**'
if status_old in s:
    s = s.replace(status_old, status_new, 1)
old_start = '## 7.4 P0.4 — Registry Pattern Review Shadow — NEXT'
if old_start in s:
    start = s.index(old_start)
    end = s.find('\n# 8. DATA-4', start)
    if end == -1:
        raise SystemExit('ROADMAP DATA-4 anchor missing')
    block = PROOF.replace('### P0.4', '## 7.4 P0.4') + "\n## 7.5 Prochaine étape mass-index\n\nUn LOT séparé pourra examiner **uniquement les 2 candidats `SHADOW_ACCEPTABLE`** pour une éventuelle revue Registry/canary bornée. Cette étape devra revalider policy/autorisation, conserver rollback et fail-closed, et ne devra jamais activer automatiquement les 3 candidats rejetés.\n"
    s = s[:start] + block + s[end:]
old_action = '**P0.1, P0.2 et P0.3 sont CLOSED.** Exécuter ensuite **P0.4 — Registry Pattern Review Shadow** uniquement sur les 5 domaines `STRONG_PATTERN_EVIDENCE`. Le LOT reste read-only/shadow : propositions + tests positifs/négatifs + replay, sans mutation Registry, sans harvest, sans nouvelle source et sans expansion automatique.'
new_action = '**P0.1, P0.2, P0.3 et P0.4 sont CLOSED.** La prochaine étape mass-index est un LOT séparé de revue Registry/canary, limité aux **2 candidats `SHADOW_ACCEPTABLE`** ; aucune activation automatique, et les 3 candidats rejetés restent bloqués.'
if old_action in s:
    s = s.replace(old_action, new_action, 1)
p.write_text(s)

# SESSION — preserve current Search/RANKING closeout and update DATA lane + canonical main wording + P0.4 section/action.
p = Path('docs/SESSION.md')
s = p.read_text()
lane_old = '**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 Common Crawl Pattern Evidence ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = P0.4 Registry Pattern Review Shadow**'
lane_new = '**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = revue Registry/canary bornée sur les 2 `SHADOW_ACCEPTABLE` uniquement**'
if lane_old in s:
    s = s.replace(lane_old, lane_new, 1)
# Do not overwrite Search canonical main line; add DATA merge fact separately.
if 'P0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402.' not in s:
    anchor = 'Main canonique après RANKING-QUALITY-1 : `c5949063fa1c0e3448e917473239f821a17b7d59` — merge PR #403.'
    if anchor in s:
        s = s.replace(anchor, anchor + '\n\nP0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402 ; post-merge gate PASS.', 1)
old = '# PROCHAIN LOT DATA — P0.4 Registry Pattern Review Shadow\n\nUniquement les **5 STRONG**. Produire des patterns candidats, corpus positifs/négatifs et replay shadow avec mesure des erreurs. **Zéro mutation Registry, zéro harvest, zéro write production.** Les 6 reviewable ne sont pas incluses automatiquement ; les 7 insufficient restent bloquées.\n'
replacement = PROOF.replace('### P0.4', '# P0.4') + "\n# PROCHAINE ÉTAPE DATA\n\nLOT séparé de revue Registry/canary uniquement pour `christiesrealestatemorocco.com` et `immobilier-a-marrakech.com`, avec revalidation policy/autorisation et rollback avant toute mutation. `immo-maroc.com`, `immohammedia.com` et `leaderimmo.ma` restent bloqués tant que leur ambiguïté n'est pas résolue.\n"
if old in s:
    s = s.replace(old, replacement, 1)
elif '# P0.4 — Registry Pattern Review Shadow ✅ CLOSED — PR #402' not in s:
    anchor = '\n# UX / Search — état court'
    if anchor in s:
        s = s.replace(anchor, '\n' + replacement + anchor, 1)
old_action2 = 'DATA-4.4C, P0.1, P0.2 et P0.3 sont fermés. Le reconciler #396 est fermé. **Prochain LOT mass-index : P0.4 — Registry Pattern Review Shadow**, limité aux 5 preuves fortes. Aucun nouveau scraper/source direct, aucune activation Registry, aucun harvest et aucune expansion automatique.'
new_action2 = 'DATA-4.4C, P0.1, P0.2, P0.3 et P0.4 sont fermés. Le reconciler #396 est fermé. **Prochaine étape mass-index : LOT séparé de revue Registry/canary limité aux 2 `SHADOW_ACCEPTABLE`**, sans activation automatique ; les 3 rejetés restent bloqués.'
if old_action2 in s:
    s = s.replace(old_action2, new_action2, 1)
p.write_text(s)

Path('.github/workflows/p0-4-closeout-v2-temp.yml').unlink(missing_ok=True)
Path('scripts/tmp-p0-4-closeout-v2.py').unlink(missing_ok=True)
