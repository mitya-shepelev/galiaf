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

export interface DomainState {
  organizations: OrganizationRecord[];
  users: UserRecord[];
  memberships: MembershipRecord[];
  invitations: InvitationRecord[];
}
