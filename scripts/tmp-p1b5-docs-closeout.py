from pathlib import Path


def lines(path: str):
    p = Path(path)
    return p, p.read_text(encoding="utf-8").splitlines()


def write(p: Path, xs: list[str]):
    p.write_text("\n".join(xs) + "\n", encoding="utf-8")


def insert_after_contains(xs: list[str], needle: str, new_lines: list[str]):
    if any(new_lines[0] in x for x in xs):
        return xs
    for i, line in enumerate(xs):
        if needle in line:
            return xs[: i + 1] + new_lines + xs[i + 1 :]
    raise RuntimeError(f"anchor not found: {needle}")


def replace_line_contains(xs: list[str], needle: str, replacement: str):
    for i, line in enumerate(xs):
        if needle in line:
            xs[i] = replacement
            return xs
    raise RuntimeError(f"line not found: {needle}")

# README
p, xs = lines("README.md")
xs = insert_after_contains(xs, "P1B.4 ✅ PR #386", [
    "- P1B.5 ✅ PR #419, merge `0abfd97c` — **Canonical Geo Normalization Recovery** : récupération strictement déterministe des districts explicites manqués uniquement par accents/apostrophes ; `odm04_fold_text()` + suppression d’apostrophes, alias Geo Registry confiance 1, quartier unique + ville parente validée, aucun fuzzy/synonyme/réseau. Preflight production **20/20**, write atomique **20/20** = **14 map-eligible + 6 canonical-only** ; **11 Guéliz / 6 Océan / 3 Route de l’Ourika** ; latest-event post-write **20/20 resolved**, preflight retombé à 0, rollback append-only disponible. Couverture Search quartier : **89 / 15 438 = 0,5765 %** ; post-merge gate P1B.5 PASS ; `metric_layers_activated=false`."
])
xs = replace_line_contains(xs, "La couche **Offre par quartier reste interdite**", "La couche **Offre par quartier reste interdite** : **0,5765 %** de couverture ne justifie aucun choroplèthe national. La prochaine étape Carte poursuit la récupération géographique explicite et certifiable ; aucune couverture n’est fabriquée.")
write(p, xs)

# ROADMAP
p, xs = lines("docs/ROADMAP.md")
for i, line in enumerate(xs):
    if line.startswith("**Statut :"):
        xs[i] = line.replace("UX/Carte P1B.4 ✅ production certifiée", "UX/Carte P1B.5 ✅ production certifiée")
        break
else:
    raise RuntimeError("ROADMAP status line not found")
xs = insert_after_contains(xs, "P1B.4 ✅ PR #386", [
    "- P1B.5 ✅ PR #419 — **Canonical Geo Normalization Recovery**."
])
# Insert section immediately before the Offer-quarter status line.
section_title = "## P1B.5 — Canonical Geo Normalization Recovery ✅ CLOSED"
if not any(section_title == x for x in xs):
    for i, line in enumerate(xs):
        if line.startswith("**Offre quartier reste OFF."):
            section = [
                "",
                section_title,
                "",
                "Delta strict de normalisation sur des `property_listings.district` déjà persistés : fold canonique des accents via `odm04_fold_text()` + suppression d’apostrophes uniquement. Aucun alias créé, aucun fuzzy/synonyme/spatial/titre/URL/proximité/réseau.",
                "",
                "Production : preflight **20 candidats / 14 map-eligible / 6 canonical-only**, write atomique **20/20**, réparti en **11 Guéliz / 6 Océan / 3 Route de l’Ourika**. Les 20 événements P1B.5 sont les événements latest `resolved`, puis le preflight retombe à **0**. Rollback append-only disponible ; couches métriques toujours désactivées.",
                "",
                "Après write : **15 438 listings Search éligibles / 89 résolus quartier / 0,5765 % coverage**. Exact-head **20/20 PASS** sur `5a1d43dd53937c6b462a7a947d4c72605c41f5ab`, Reviewer technique PASS, merge `0abfd97c85da31e11d0e94ecc5ef5b9317c313ff`, push gate P1B.5 PASS.",
                "",
            ]
            xs = xs[:i] + section + xs[i:]
            break
    else:
        raise RuntimeError("ROADMAP Offer-quarter anchor not found")
xs = replace_line_contains(xs, "**Offre quartier reste OFF.", "**Offre quartier reste OFF.** À **0,5765 %** de couverture, aucun seuil artificiel ni choroplèthe national n’est autorisé. La prochaine lane Carte doit continuer la récupération explicite/certifiable et mesurer chaque gain réel.")
write(p, xs)

# SESSION
p, xs = lines("docs/SESSION.md")
xs = replace_line_contains(xs, "**Lane UX/Carte :", "**Lane UX/Carte : P1B.5 ✅ Canonical Geo Normalization Recovery certifié en production — PR #419**  ")
xs = replace_line_contains(xs, "**Couche Offre quartier :", "**Couche Offre quartier : OFF — couverture certifiée actuelle **89 / 15 438 = 0,5765 %****")
xs = insert_after_contains(xs, "- P1B.4 ✅ PR #386", [
    "- P1B.5 ✅ PR #419 — Canonical Geo Normalization Recovery : preflight 20/14/6, write 20/20, 11 Guéliz + 6 Océan + 3 Route de l’Ourika, latest resolved 20/20, coverage Search quartier **89/15 438 = 0,5765 %**, rollback append-only disponible, metric layers OFF ;"
])
write(p, xs)

print("P1B.5 docs closeout prepared")
