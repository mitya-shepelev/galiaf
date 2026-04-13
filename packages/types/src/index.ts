export type UserRole = "platform_admin" | "company_manager" | "employee";

export type TenantId = string;

export interface OrganizationSummary {
  id: string;
  name: string;
  activeEmployees: number;
}

export interface AccessGrant {
  role: UserRole;
  tenantId: TenantId;
  grantedAt: string;
}

export type OrganizationStatus = "active" | "suspended";

export interface OrganizationRecord {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAt: string;
}

export type UserStatus = "active" | "blocked";

export interface UserRecord {
  id: string;
  externalAuthSubject: string;
  email: string;
  fullName: string;
  status: UserStatus;
  createdAt: string;
}

export type MembershipRole = Extract<UserRole, "company_manager" | "employee">;

export type MembershipStatus = "active" | "revoked";

export interface MembershipRecord {
  id: string;
  userId: string;
  organizationId: string;
  roles: MembershipRole[];
  status: MembershipStatus;
  invitedByUserId?: string;
  createdAt: string;
}

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export interface InvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  targetName?: string;
  roles: MembershipRole[];
  status: InvitationStatus;
  invitedByUserId: string;
  acceptedByUserId?: string;
  expiresAt: string;
  createdAt: string;
}

export type SupportedRole = UserRole;

export interface TenantMembership {
  organizationId: TenantId;
  roles: MembershipRole[];
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

export interface AuthSession {
  subject: string;
  issuer: string;
  clientId?: string;
  activeTenantId?: string;
  platformRoles: SupportedRole[];
  tenantMemberships: TenantMembership[];
  effectiveRoles: SupportedRole[];
  scopes: string[];
}

export interface HealthReport {
  status: "ok";
  service: string;
  database: "ok" | "error";
  redis: "ok" | "error";
  timestamp: string;
}

export interface AdminBootstrap {
  dashboard: string;
  subject: string;
  allowedAreas: string[];
}

export interface WorkspaceAccess {
  subject: string;
  activeTenantId?: string;
  effectiveRoles: SupportedRole[];
  availableMemberships: TenantMembership[];
}

export type ChatRoomScope = "organization" | "direct";

export interface ChatRoomReference {
  id: string;
  scope: ChatRoomScope;
  organizationId?: TenantId;
  subject?: string;
}

export interface ChatMessageRecord {
  id: string;
  roomId: string;
  authorSubject: string;
  authorName?: string;
  text: string;
  createdAt: string;
  deliveryStatus: "queued" | "delivered";
  receipts: ChatMessageReceipt[];
}

export interface ChatMessageReceipt {
  subject: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface ChatPresenceEvent {
  roomId: string;
  subject: string;
  state: "online" | "offline";
  timestamp: string;
}
