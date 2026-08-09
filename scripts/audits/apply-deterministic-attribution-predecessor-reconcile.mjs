import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content, "utf8"); }
function replaceOnce(path, source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, got ${count}`);
  return source.replace(before, after);
}

{
  const path = "scripts/scrapers/__tests__/search-truth-tier.test.ts";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    '    assert.ok(card.includes("Source externe"));',
    '    assert.ok(card.includes("publicAttribution.typeLabel"));\n    assert.ok(card.includes("publicAttribution.sourceLabel"));\n    assert.doesNotMatch(card, /result\\.result_attribution_label|result\\.source_name/);',
  );
  write(path, source);
}

{
  const path = "scripts/scrapers/__tests__/search-mobile-card-grid-1.test.ts";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    '    assert.ok(card.includes("listing.source_name || truth.informationLabel"));',
    '    assert.ok(card.includes("publicAttribution.combinedLabel"));\n    assert.doesNotMatch(card, /listing\\.source_name\\s*\\|\\|\\s*truth\\.informationLabel/);',
  );
  write(path, source);
}

{
  const path = "scripts/scrapers/__tests__/search-wording-purity-1.test.ts";
  let source = read(path);
  source = replaceOnce(
    path,
    source,
    '    assert.ok(externalCard.includes("Source externe"));',
    '    assert.ok(externalCard.includes("publicAttribution.typeLabel"));\n    assert.ok(externalCard.includes("publicAttribution.sourceLabel"));\n    assert.doesNotMatch(externalCard, /result\\.result_attribution_label|result\\.source_name/);',
  );
  write(path, source);
}

console.log("DETERMINISTIC-ATTRIBUTION predecessor reconcile PASS");
