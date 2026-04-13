import type {
  AdminBootstrap,
  AuthSession,
  CreateInvitationRequest,
  CreateOrganizationEmployeeRequest,
  CreateOrganizationRequest,
  CurrentUserProfile,
  HealthReport,
  InvitationAcceptanceResult,
  InvitationRecord,
  MembershipRecord,
  OrganizationRecord,
  OrganizationEmployeeAccessRecord,
  PublicAuthContract,
  SupportedRole,
  TenantMembership,
  UpdateMembershipRolesRequest,
  UserRecord,
  WorkspaceAccess,
} from "@galiaf/types";

export type {
  AdminBootstrap,
  AuthSession,
  CreateInvitationRequest,
  CreateOrganizationEmployeeRequest,
  CreateOrganizationRequest,
  CurrentUserProfile,
  HealthReport,
  InvitationAcceptanceResult,
  InvitationRecord,
  MembershipRecord,
  OrganizationRecord,
  OrganizationEmployeeAccessRecord,
  PublicAuthContract,
  SupportedRole,
  TenantMembership,
  UpdateMembershipRolesRequest,
  UserRecord,
  WorkspaceAccess,
} from "@galiaf/types";

export interface AccessRolesSnapshot {
  subject: string;
  platformRoles: SupportedRole[];
  tenantMemberships: TenantMembership[];
  activeTenantId?: string;
  effectiveRoles: SupportedRole[];
}

export interface SwitchContextPayload {
  requestedRole: SupportedRole;
  targetTenantId?: string;
}

export interface SwitchContextResult {
  accepted: boolean;
  nextContext: {
    requestedRole: SupportedRole;
    targetTenantId?: string;
  };
  note: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
  fetch?: typeof fetch;
}

export interface DevAuthContext {
  sub: string;
  email?: string;
  name?: string;
  clientId?: string;
  activeTenantId?: string;
  platformRoles: SupportedRole[];
  tenantMemberships: TenantMembership[];
  issuer?: string;
  audiences?: string[];
  scopes?: string[];
}

export const demoAuthContexts = {
  platformAdmin: {
    sub: "demo-admin",
    email: "admin@galiaf.local",
    name: "Platform Admin",
    platformRoles: ["platform_admin"],
    tenantMemberships: [],
  } satisfies DevAuthContext,
  managerAlpha: {
    sub: "demo-manager-alpha",
    email: "manager.alpha@galiaf.local",
    name: "Manager Alpha",
    platformRoles: [],
    tenantMemberships: [
      {
        organizationId: "org_alpha",
        roles: ["company_manager"],
      },
    ],
    activeTenantId: "org_alpha",
  } satisfies DevAuthContext,
  employeeAlpha: {
    sub: "demo-employee-alpha",
    email: "employee.alpha@galiaf.local",
    name: "Employee Alpha",
    platformRoles: [],
    tenantMemberships: [
      {
        organizationId: "org_alpha",
        roles: ["employee"],
      },
    ],
    activeTenantId: "org_alpha",
  } satisfies DevAuthContext,
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function mergeHeaders(
  baseHeaders?: HeadersInit,
  nextHeaders?: HeadersInit,
): Headers {
  const headers = new Headers(baseHeaders);
  const incoming = new Headers(nextHeaders);

  incoming.forEach((value, key) => {
    headers.set(key, value);
  });

  return headers;
}

export function createDevAuthHeaders(context: DevAuthContext): HeadersInit {
  return {
    "x-dev-auth-context": JSON.stringify({
      ...context,
      issuer: context.issuer ?? "dev-bypass",
      audiences: context.audiences ?? [],
      scopes: context.scopes ?? [],
    }),
  };
}

export class ApiError extends Error {
  public constructor(
    public readonly pathname: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API request failed for ${pathname}: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private readonly fetchImpl: typeof fetch;

  public constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetch ?? fetch;
  }

  public buildUrl(pathname: string): string {
    return new URL(pathname.replace(/^\//u, ""), normalizeBaseUrl(this.options.baseUrl))
      .toString();
  }

  public getHealth(): Promise<HealthReport> {
    return this.request<HealthReport>("/health");
  }

  public getPublicAuthConfig(): Promise<PublicAuthContract> {
    return this.request<PublicAuthContract>("/auth/public-config");
  }

  public getSession(): Promise<AuthSession> {
    return this.request<AuthSession>("/auth/session");
  }

  public getCurrentUser(): Promise<CurrentUserProfile> {
    return this.request<CurrentUserProfile>("/users/me");
  }

  public getAccessRoles(): Promise<AccessRolesSnapshot> {
    return this.request<AccessRolesSnapshot>("/access/roles");
  }

  public getAdminBootstrap(): Promise<AdminBootstrap> {
    return this.request<AdminBootstrap>("/access/admin/bootstrap");
  }

  public getWorkspace(): Promise<WorkspaceAccess> {
    return this.request<WorkspaceAccess>("/access/workspace");
  }

  public switchContext(
    payload: SwitchContextPayload,
  ): Promise<SwitchContextResult> {
    return this.request<SwitchContextResult>("/auth/context/switch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public listOrganizations(): Promise<OrganizationRecord[]> {
    return this.request<OrganizationRecord[]>("/organizations");
  }

  public listUsers(): Promise<UserRecord[]> {
    return this.request<UserRecord[]>("/users");
  }

  public createOrganization(
    payload: CreateOrganizationRequest,
  ): Promise<OrganizationRecord> {
    return this.request<OrganizationRecord>("/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public createOrganizationEmployee(
    organizationId: string,
    payload: CreateOrganizationEmployeeRequest,
  ): Promise<OrganizationEmployeeAccessRecord> {
    return this.request<OrganizationEmployeeAccessRecord>(
      `/organizations/${encodeURIComponent(organizationId)}/employees`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  public listMemberships(organizationId?: string): Promise<MembershipRecord[]> {
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";

    return this.request<MembershipRecord[]>(`/memberships${query}`);
  }

  public updateMembershipRoles(
    membershipId: string,
    payload: UpdateMembershipRolesRequest,
  ): Promise<MembershipRecord> {
    return this.request<MembershipRecord>(
      `/memberships/${encodeURIComponent(membershipId)}/roles`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  }

  public revokeMembership(membershipId: string): Promise<MembershipRecord> {
    return this.request<MembershipRecord>(
      `/memberships/${encodeURIComponent(membershipId)}/revoke`,
      {
        method: "PATCH",
      },
    );
  }

  public listInvitations(organizationId?: string): Promise<InvitationRecord[]> {
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";

    return this.request<InvitationRecord[]>(`/invitations${query}`);
  }

  public createInvitation(
    payload: CreateInvitationRequest,
  ): Promise<InvitationRecord> {
    return this.request<InvitationRecord>("/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public revokeInvitation(invitationId: string): Promise<InvitationRecord> {
    return this.request<InvitationRecord>(
      `/invitations/${encodeURIComponent(invitationId)}/revoke`,
      {
        method: "PATCH",
      },
    );
  }

  public acceptInvitation(
    invitationId: string,
  ): Promise<InvitationAcceptanceResult> {
    return this.request<InvitationAcceptanceResult>(
      `/invitations/${encodeURIComponent(invitationId)}/accept`,
      {
        method: "POST",
      },
    );
  }

  private async request<T>(pathname: string, init?: RequestInit): Promise<T> {
    const headers = mergeHeaders(this.options.defaultHeaders, init?.headers);

    headers.set("accept", "application/json");

    if (init?.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await this.fetchImpl(this.buildUrl(pathname), {
      ...init,
      headers,
    });

    if (!response.ok) {
      const body = await this.parseResponseBody(response);

      throw new ApiError(
        pathname,
        response.status,
        response.statusText,
        body,
      );
    }

    return (await this.parseResponseBody(response)) as T;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }
}
