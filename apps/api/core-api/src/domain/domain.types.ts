import type { SupportedRole } from "../auth/auth.types.js";

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

export type MembershipRole = Extract<SupportedRole, "company_manager" | "employee">;

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

export type AuditEventAction =
  | "organization_created"
  | "organization_employee_provisioned"
  | "invitation_created"
  | "invitation_revoked"
  | "invitation_accepted"
  | "membership_roles_updated"
  | "membership_revoked"
  | "auth_context_switch_requested"
  | "admin_bootstrap_viewed"
  | "audit_events_viewed";

export interface AuditEventRecord {
  id: string;
  action: AuditEventAction;
  entityType: string;
  entityId: string;
  organizationId?: string;
  actorSubject: string;
  actorUserId?: string;
  actorEmail?: string;
  actorName?: string;
  actorRoles: SupportedRole[];
  actorActiveTenantId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface DomainState {
  organizations: OrganizationRecord[];
  users: UserRecord[];
  memberships: MembershipRecord[];
  invitations: InvitationRecord[];
  auditEvents: AuditEventRecord[];
}
