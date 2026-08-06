import type {
  ProfessionalIdentityResolution,
  ProfessionalMembershipContext,
  ProfessionalValidationStatus,
  ProfessionalWorkspaceStatus,
} from "./types";

export function workspaceStatusFromValidation(
  validationStatus: ProfessionalValidationStatus,
): ProfessionalWorkspaceStatus {
  switch (validationStatus) {
    case "validated":
      return "active";
    case "pending":
      return "onboarding";
    case "suspended":
      return "suspended";
    case "rejected":
      return "rejected";
  }
}

export function isWorkspaceAccessibleContext(
  context: ProfessionalMembershipContext,
): boolean {
  return context.membership.status === "active"
    && context.has_active_owner === true
    && (context.workspace_status === "active" || context.workspace_status === "onboarding");
}

function compareContexts(
  left: ProfessionalMembershipContext,
  right: ProfessionalMembershipContext,
): number {
  const leftValidated = left.workspace_status === "active" ? 0 : 1;
  const rightValidated = right.workspace_status === "active" ? 0 : 1;
  if (leftValidated !== rightValidated) return leftValidated - rightValidated;

  const byName = left.organization.display_name.localeCompare(
    right.organization.display_name,
    "fr",
    { sensitivity: "base" },
  );
  if (byName !== 0) return byName;
  return left.organization.id.localeCompare(right.organization.id);
}

export function resolveActiveProfessionalContext(
  contexts: ProfessionalMembershipContext[],
  preferredOrganizationId?: string | null,
): ProfessionalIdentityResolution {
  const availableContexts = contexts
    .filter(isWorkspaceAccessibleContext)
    .sort(compareContexts);

  if (availableContexts.length === 0) {
    return {
      active_context: null,
      available_contexts: [],
      selection_source: "none",
    };
  }

  if (preferredOrganizationId) {
    const preferred = availableContexts.find(
      (context) => context.organization.id === preferredOrganizationId,
    );
    if (preferred) {
      return {
        active_context: preferred,
        available_contexts: availableContexts,
        selection_source: "preferred",
      };
    }
  }

  return {
    active_context: availableContexts[0] ?? null,
    available_contexts: availableContexts,
    selection_source: "default",
  };
}
