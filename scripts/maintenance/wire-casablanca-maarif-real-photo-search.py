from pathlib import Path
import subprocess

path = Path("components/search/SearchListingCardDark.tsx")
text = path.read_text(encoding="utf-8")

old_import = 'import { resolveRabatRealPhoto } from "@/lib/contextual-illustrations/rabat-real-photo-library";'
new_import = 'import { resolveRealNeighborhoodPhoto } from "@/lib/contextual-illustrations/real-neighborhood-photo-resolver";'
old_call = "? resolveRabatRealPhoto({"
new_call = "? resolveRealNeighborhoodPhoto({"

if text.count(old_import) != 1:
    raise SystemExit(f"expected exactly one Rabat resolver import, found {text.count(old_import)}")
if text.count(old_call) != 1:
    raise SystemExit(f"expected exactly one Rabat resolver call, found {text.count(old_call)}")

updated = text.replace(old_import, new_import, 1).replace(old_call, new_call, 1)
path.write_text(updated, encoding="utf-8")

subprocess.run(["git", "diff", "--check"], check=True)
changed = subprocess.check_output(["git", "diff", "--name-only"], text=True).splitlines()
if changed != ["components/search/SearchListingCardDark.tsx"]:
    raise SystemExit(f"unexpected runtime diff: {changed}")

subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
subprocess.run(["git", "add", str(path)], check=True)
subprocess.run(["git", "commit", "-m", "P3.1: wire national real-neighborhood photo resolver"], check=True)
subprocess.run(
    ["git", "push", "origin", "HEAD:agent/neighborhood-visual-p3-1-casablanca-maarif-discovery"],
    check=True,
)
