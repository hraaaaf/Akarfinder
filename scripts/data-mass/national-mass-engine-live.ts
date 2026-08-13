import fs from "node:fs/promises";
import path from "node:path";
import { evaluateNationalMassEngine } from "./national-mass-engine";

const MASS1 = process.env.DATA_MASS_6_MASS1_PROOF ?? ".tmp/data-mass-6/mass1/proof.json";
const MASS4 = process.env.DATA_MASS_6_MASS4_PROOF ?? ".tmp/data-mass-6/mass4.json";
const MASS5 = process.env.DATA_MASS_6_MASS5_PROOF ?? ".tmp/data-mass-6/mass5/proof.json";
const OUT = process.env.DATA_MASS_6_OUT_DIR ?? ".tmp/data-mass-6/results";

async function readJson(file: string) { return JSON.parse(await fs.readFile(file, "utf8")); }

async function main() {
  const [m1, m4, m5] = await Promise.all([readJson(MASS1), readJson(MASS4), readJson(MASS5)]);
  const discover = m1.readOnly === true && Number(m1.discoveryRowsRead) > 0;
  const classify = Number(m1.sourceFactoryCandidateDomains) > 0 && m5.predecessorReadOnlyProofVerified === true;
  const policy = Number(m4.policyAdmissibleRegistryRows) > 0;

  const stageState = {
    DISCOVER: discover,
    CLASSIFY: classify,
    POLICY: policy,
    INDEX: false,
    FRESHNESS: false,
    DEDUP: false,
    RANK: false,
  } as const;

  const engine = evaluateNationalMassEngine(stageState);
  const proof = {
    ...engine,
    status: "PASS",
    headSha: process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? null,
    stageState,
    discoveryRowsRead: m1.discoveryRowsRead,
    sourceFactoryDomains: m1.sourceFactoryCandidateDomains,
    policyAdmissibleRegistryRows: m4.policyAdmissibleRegistryRows,
    postBaselineAddedSourceFactoryDomains: m5.postBaselineAddedSourceFactoryDomains,
    expectedCurrentBlock: policy ? null : "POLICY",
    predecessorReadOnlyProofVerified: m5.predecessorReadOnlyProofVerified === true,
  };

  if (!discover || !classify) throw new Error("MASS_6_PREDECESSOR_DISCOVERY_OR_CLASSIFICATION_FAILED");
  if (!policy && engine.blockedAt !== "POLICY") throw new Error("MASS_6_POLICY_BYPASS");

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
