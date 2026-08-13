import fs from "node:fs/promises";
import path from "node:path";
import { evaluateNationalMassEngine } from "./national-mass-engine";

const MASS1 = process.env.DATA_MASS_6_MASS1_PROOF ?? ".tmp/data-mass-6/mass1/proof.json";
const MASS4 = process.env.DATA_MASS_6_MASS4_PROOF ?? ".tmp/data-mass-6/mass4.json";
const MASS5 = process.env.DATA_MASS_6_MASS5_PROOF ?? ".tmp/data-mass-6/mass5/proof.json";
const OUT = process.env.DATA_MASS_6_OUT_DIR ?? ".tmp/data-mass-6/results";

async function readJson(file: string) { return JSON.parse(await fs.readFile(file, "utf8")); }

function assertReadOnly(name: string, proof: any) {
  const ok = proof.databaseWrites === 0 &&
    (proof.registryWrites ?? proof.policyChanges ?? 0) === 0 &&
    (proof.searchActivations ?? proof.publicRowsCreated ?? 0) === 0 &&
    proof.sourceNetworkRequests === 0 &&
    proof.detailPageFetches === 0;
  if (!ok) throw new Error(`MASS_6_${name}_READ_ONLY_PROOF_FAILED`);
}

async function main() {
  const [m1, m4, m5] = await Promise.all([readJson(MASS1), readJson(MASS4), readJson(MASS5)]);
  assertReadOnly("MASS1", m1);
  assertReadOnly("MASS4", m4);
  assertReadOnly("MASS5", m5);

  const discover = m1.readOnly === true && Number(m1.discoveryRowsRead) > 0;
  const classify = Number(m1.sourceFactoryCandidateDomains) > 0 && m5.predecessorReadOnlyProofVerified === true;
  const policyAdmissibleRegistryRows = Number(m4.policyAdmissibleRegistryRows);
  const policy = policyAdmissibleRegistryRows > 0;

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
  const currentBoundaryStable = policyAdmissibleRegistryRows === 0 && engine.blockedAt === "POLICY";
  const proof = {
    ...engine,
    status: currentBoundaryStable ? "PASS" : "REVIEW_REQUIRED",
    headSha: process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? null,
    stageState,
    discoveryRowsRead: m1.discoveryRowsRead,
    sourceFactoryDomains: m1.sourceFactoryCandidateDomains,
    policyAdmissibleRegistryRows,
    postBaselineAddedSourceFactoryDomains: m5.postBaselineAddedSourceFactoryDomains,
    expectedCurrentBlock: "POLICY",
    predecessorReadOnlyProofVerified: m5.predecessorReadOnlyProofVerified === true,
    predecessorZeroMutationProofVerified: true,
  };

  if (!discover || !classify) throw new Error("MASS_6_PREDECESSOR_DISCOVERY_OR_CLASSIFICATION_FAILED");
  if (!currentBoundaryStable) throw new Error("MASS_6_POLICY_STATE_CHANGED_REVIEW_REQUIRED");

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
