from pathlib import Path

MERGE = "ac0e240d28b88c5e66da73d1ab964794deb01877"
ARTIFACT = "sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536"

p0_5_readme = """### P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

P0.5 a requalifié en **lecture seule** les 2 candidats `SHADOW_ACCEPTABLE` de P0.4 avant toute éventuelle mutation Registry/canary. Le résultat production est fail-closed : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**.

- `christiesrealestatemorocco.com` : Common Crawl discovery autorisé, mais `authorization_status=unverified`, `partnership_required=true`, `legal_review_required=true` ; **0 seed / 5 discovery candidates** ;
- `immobilier-a-marrakech.com` : Common Crawl discovery autorisé, mais `authorization_status=unverified`, `partnership_required=true`, `legal_review_required=true`, `detail_fetch_policy=paused` ; **0 seed / 14 discovery candidates**.

Le contrat distingue explicitement **preuve structurelle ≠ canal de discovery autorisé ≠ autorisation de canary**. `READY_FOR_CANARY_REVIEW` reste un état review-only pour un éventuel `commoncrawl_seed_only_internal`; il n'active ni pattern, ni source, ni détail, ni affichage.

Certification : **20/20 workflows exact-head verts** sur `e54099e9120d573d8092c8a119c066c911b624bd`, Reviewer **PASS 9,6/10**, Release Certifier **GO**, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, gate P0.5 post-merge **PASS**. Artefact exact-head : `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`.

Contrat : **0 source-site request, 0 Common Crawl request, 0 WARC/content fetch, 0 DB mutation, 0 Registry mutation, 0 harvest, 0 pattern activation, 0 canary write**. Aucun rollback n'est requis puisqu'aucune mutation n'a eu lieu.
"""

# README
p = Path("README.md")
s = p.read_text()
old = "Étape mass-index suivante après P0.4 : **revue Registry/canary bornée uniquement aux 2 candidats `SHADOW_ACCEPTABLE`**, dans un LOT séparé avec revalidation policy/autorisation et rollback avant toute mutation. Les 3 candidats rejetés restent bloqués."
new = "P0.5 a exécuté cette revue de readiness en lecture seule : **0/2 candidat autorisé pour une revue canary**. Les deux restent bloqués par l'autorisation/partenariat/revue légale ; aucun canary n'est permis tant que le Source Registry n'évolue pas explicitement."
s = s.replace(old, new)
anchor = "\n### DATA-4 — Reservoir Strategy"
if "### P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408" not in s:
    s = s.replace(anchor, "\n" + p0_5_readme + anchor, 1)
old_decision = "**DATA-4.4C, P0.1, P0.2 et P0.3 sont fermés et certifiés.** Le micro-lot reconciler #396 est également fermé. P0.3 a produit 5 preuves fortes, 6 reviewable et 7 insuffisantes, sans aucune activation. Prochain lot mass-index : **P0.4 — Registry Pattern Review Shadow**, strictement borné aux 5 preuves fortes."
new_decision = "**DATA-4.4C, P0.1, P0.2, P0.3, P0.4 et P0.5 sont fermés et certifiés.** Le micro-lot reconciler #396 est également fermé. **État mass-index actuel : 0/2 candidat P0.4 autorisé pour une revue canary.** La prochaine dépendance est externe : autorisation/partenariat/revue légale puis mise à jour explicite du Source Registry. Aucun canary ni nouveau lot d'activation ne doit partir tant que ces blockers ne sont pas levés."
s = s.replace(old_decision, new_decision)
p.write_text(s)

# ROADMAP
p = Path("docs/ROADMAP.md")
s = p.read_text()
s = s.replace("P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ PR #396", "P0.4 ✅ ; P0.5 Registry Activation Readiness Gate ✅ CLOSED ; freshness reconciler hardening ✅ PR #396")
old_75 = """## 7.5 Prochaine étape mass-index

Un LOT séparé pourra examiner **uniquement les 2 candidats `SHADOW_ACCEPTABLE`** pour une éventuelle revue Registry/canary bornée. Cette étape devra revalider policy/autorisation, conserver rollback et fail-closed, et ne devra jamais activer automatiquement les 3 candidats rejetés.
"""
new_75 = """## 7.5 P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

Responsabilité unique : **revalider en lecture seule la readiness Registry/canary des 2 candidats `SHADOW_ACCEPTABLE` de P0.4**, sans mutation et sans transformer une preuve structurelle en autorisation.

Preuve production : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**. Les deux domaines sont Common Crawl-discovery-allowed mais restent `authorization_status=unverified`, `partnership_required=true` et `legal_review_required=true`. Stock actuel : Christie’s **0 seed / 5 discovery candidates** ; Immobilier-à-Marrakech **0 seed / 14 discovery candidates**. Aucun candidate row n'est accepted/promoted/compliance_allowed.

Contrat : 0 source-site request, 0 Common Crawl request, 0 WARC/content fetch, 0 DB mutation, 0 Registry mutation, 0 harvest, 0 pattern activation, 0 canary write. Certification : **20/20 exact-head PASS**, Reviewer **9,6/10**, Certifier GO, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, gate P0.5 post-merge PASS. Artefact : `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`.

### Dépendance suivante

**Aucun canary technique n'est autorisé actuellement.** La prochaine étape n'est pas un P0.6 automatique : elle dépend d'une résolution externe d'autorisation/partenariat/revue légale, puis d'une modification explicite et auditée du Source Registry vers un état d'autorisation positif. Tant que ce changement n'existe pas, les 2 candidats restent bloqués et les 3 candidats P0.4 rejetés restent hors scope.
"""
s = s.replace(old_75, new_75)
s = s.replace("**P0.1, P0.2, P0.3 et P0.4 sont CLOSED.** La prochaine étape mass-index est un LOT séparé de revue Registry/canary, limité aux **2 candidats `SHADOW_ACCEPTABLE`** ; aucune activation automatique, et les 3 candidats rejetés restent bloqués.", "**P0.1 à P0.5 sont CLOSED.** P0.5 conclut **0/2 ready** : aucun canary mass-index ne doit être lancé tant que l'autorisation/partenariat/revue légale n'est pas résolue et reflétée explicitement dans le Source Registry. Les 3 candidats rejetés P0.4 restent bloqués.")
p.write_text(s)

# SESSION
p = Path("docs/SESSION.md")
s = p.read_text()
s = s.replace("**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 Registry Pattern Review Shadow ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain LOT = revue Registry/canary bornée sur les 2 `SHADOW_ACCEPTABLE` uniquement**", "**Lane DATA : DATA-4.4C ✅ ; P0.1 ✅ ; P0.2 ✅ ; P0.3 ✅ ; P0.4 ✅ ; P0.5 Registry Activation Readiness Gate ✅ CLOSED ; freshness reconciler hardening ✅ #396 ; prochain état = dépendance externe autorisation/partenariat/revue légale, aucun canary autorisé**")
s = s.replace("Main canonique après RANKING-QUALITY-1 : `c5949063fa1c0e3448e917473239f821a17b7d59` — merge PR #403.\n\nP0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402 ; post-merge gate PASS.", "Main canonique après P0.5 : `ac0e240d28b88c5e66da73d1ab964794deb01877` — merge PR #408 ; post-merge gate PASS.\n\nP0.4 main merge : `81f4809424757838c099b6acfb8f8d4b719deab7` — PR #402 ; post-merge gate PASS.")
old_next = """# PROCHAINE ÉTAPE DATA

LOT séparé de revue Registry/canary uniquement pour `christiesrealestatemorocco.com` et `immobilier-a-marrakech.com`, avec revalidation policy/autorisation et rollback avant toute mutation. `immo-maroc.com`, `immohammedia.com` et `leaderimmo.ma` restent bloqués tant que leur ambiguïté n'est pas résolue.
"""
p0_5_session = """# P0.5 — Registry Activation Readiness Gate ✅ CLOSED — PR #408

Lecture seule sur les 2 `SHADOW_ACCEPTABLE` P0.4. Verdict production : **0/2 `READY_FOR_CANARY_REVIEW`, 2/2 `BLOCKED_BY_POLICY`**.

- `christiesrealestatemorocco.com` : Common Crawl discovery allowed, mais `authorization_status=unverified` + partenariat requis + revue légale requise ; **0 seed / 5 candidates** ;
- `immobilier-a-marrakech.com` : mêmes blockers, `detail_fetch_policy=paused` ; **0 seed / 14 candidates**.

Certification : head `e54099e9120d573d8092c8a119c066c911b624bd`, **20/20 PASS**, Reviewer **9,6/10**, Certifier GO, merge `ac0e240d28b88c5e66da73d1ab964794deb01877`, post-merge gate PASS, artefact `sha256:a8617f91147feec1f2d870b971d346f36cddf74386da9019af2b600d4d224536`. **0 source-site/CC/WARC request, 0 DB/Registry mutation, 0 harvest/pattern activation/canary write.**

# PROCHAINE ÉTAPE DATA

**Aucun canary n'est autorisé.** Dépendance externe : obtenir/résoudre autorisation, partenariat et revue légale, puis seulement refléter ce changement par une modification explicite/auditée du Source Registry. Ne pas inventer de P0.6 automatique. `immo-maroc.com`, `immohammedia.com` et `leaderimmo.ma` restent bloqués par P0.4.
"""
s = s.replace(old_next, p0_5_session)
s = s.replace("DATA-4.4C, P0.1, P0.2, P0.3 et P0.4 sont fermés. Le reconciler #396 est fermé. **Prochaine étape mass-index : LOT séparé de revue Registry/canary limité aux 2 `SHADOW_ACCEPTABLE`**, sans activation automatique ; les 3 rejetés restent bloqués.", "DATA-4.4C et P0.1 à P0.5 sont fermés. Le reconciler #396 est fermé. **P0.5 = 0/2 ready** : aucun canary mass-index jusqu'à résolution externe des blockers d'autorisation/partenariat/revue légale et mise à jour explicite du Source Registry. Les 3 rejetés P0.4 restent bloqués.")
p.write_text(s)

# self-clean so final branch diff contains canonical docs only
Path("scripts/tmp-p0-5-closeout.py").unlink()
Path(".github/workflows/p0-5-closeout-temp.yml").unlink()
