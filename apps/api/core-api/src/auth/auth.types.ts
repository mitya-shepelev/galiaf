export type SupportedRole =
  | "platform_admin"
  | "company_manager"
  | "employee";

export interface TenantMembership {
  organizationId: string;
  roles: Array<Extract<SupportedRole, "company_manager" | "employee">>;
}

export interface RequestIdentity {
  sub: string;
  issuer: string;
  audiences: string[];
  scopes: string[];
  email?: string;
  name?: string;
  clientId?: string;
  activeTenantId?: string;
  platformRoles: SupportedRole[];
  tenantMemberships: TenantMembership[];
  effectiveRoles: SupportedRole[];
  rawClaims: Record<string, unknown>;
}

export interface PublicAuthContract {
  mode: "dev" | "oidc";
  issuerUrl: string;
  audience: string;
  jwksUri: string;
  allowedCorsOrigins: string[];
  clients: {
    adminWebClientId: string;
    managerWebClientId: string;
    employeeWebClientId: string;
    mobileClientId: string;
  };
  flows: {
    web: string;
    mobile: string;
    api: string;
    chat: string;
  };
  claimsContract: {
    globalRolesClaim: string;
    activeTenantClaim: string;
    tenantMembershipsClaim: string;
  };
}
