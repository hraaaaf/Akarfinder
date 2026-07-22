// VERCEL-PHASE-DEPLOYMENT-GATE-V1
// Git-triggered Preview and Production deployments are disabled.
// Vercel is used only as an explicit phase-completion release gate.
export const config = {
  git: {
    deploymentEnabled: false,
  },
};
