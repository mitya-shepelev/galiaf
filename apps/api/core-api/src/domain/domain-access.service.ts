import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  InvitationRecord,
  MembershipRecord,
  OrganizationRecord,
  UserRecord,
} from "./domain.types.js";
import { DomainStoreService } from "./domain-store.service.js";
import type { RequestIdentity } from "../auth/auth.types.js";

@Injectable()
export class DomainAccessService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
  ) {}

  public async getOrCreateCurrentUser(
    identity: RequestIdentity,
  ): Promise<UserRecord> {
    return this.store.upsertUserFromIdentity({
      subject: identity.sub,
      email: identity.email ?? `${identity.sub}@unknown.local`,
      fullName: identity.name ?? identity.email ?? identity.sub,
    });
  }

  public async listOrganizations(
    identity: RequestIdentity,
  ): Promise<OrganizationRecord[]> {
    const organizations = await this.store.getOrganizations();

    if (identity.effectiveRoles.includes("platform_admin")) {
      return organizations;
    }

    const allowedIds = new Set(
      identity.tenantMemberships.map((membership) => membership.organizationId),
    );

    return organizations.filter((organization) => allowedIds.has(organization.id));
  }

  public canAccessOrganization(
    identity: RequestIdentity,
    organizationId: string,
  ): boolean {
    if (identity.effectiveRoles.includes("platform_admin")) {
      return true;
    }

    return identity.tenantMemberships.some(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.roles.length > 0,
    );
  }

  public assertOrganizationAccess(
    identity: RequestIdentity,
    organizationId: string,
  ): void {
    if (!this.canAccessOrganization(identity, organizationId)) {
      throw new ForbiddenException("The current identity cannot access this organization.");
    }
  }

  public assertManagerForOrganization(
    identity: RequestIdentity,
    organizationId: string,
  ): void {
    if (identity.effectiveRoles.includes("platform_admin")) {
      return;
    }

    const membership = identity.tenantMemberships.find(
      (item) => item.organizationId === organizationId,
    );

    if (!membership || !membership.roles.includes("company_manager")) {
      throw new ForbiddenException(
        "The current identity is not allowed to manage this organization.",
      );
    }
  }

  public async findOrganizationOrFail(
    organizationId: string,
  ): Promise<OrganizationRecord> {
    const organizations = await this.store.getOrganizations();
    const organization = organizations.find((item) => item.id === organizationId);

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return organization;
  }

  public async listUsers(identity: RequestIdentity): Promise<UserRecord[]> {
    const users = await this.store.getUsers();

    if (identity.effectiveRoles.includes("platform_admin")) {
      return users;
    }

    const managedOrganizationIds = this.getManagedOrganizationIds(identity);

    if (managedOrganizationIds.size === 0) {
      throw new ForbiddenException("Only managers can list organization users.");
    }

    const memberships = await this.store.getMemberships();
    const relatedUserIds = new Set(
      memberships
        .filter((membership) =>
          managedOrganizationIds.has(membership.organizationId),
        )
        .map((membership) => membership.userId),
    );

    return users.filter((user) => relatedUserIds.has(user.id));
  }

  public async listMemberships(
    identity: RequestIdentity,
    organizationId?: string,
  ): Promise<MembershipRecord[]> {
    const memberships = await this.store.getMemberships();

    if (identity.effectiveRoles.includes("platform_admin")) {
      return organizationId
        ? memberships.filter((membership) => membership.organizationId === organizationId)
        : memberships;
    }

    const managedOrganizationIds = this.getManagedOrganizationIds(identity);

    if (managedOrganizationIds.size === 0) {
      throw new ForbiddenException("Only managers can list organization memberships.");
    }

    if (organizationId && !managedOrganizationIds.has(organizationId)) {
      throw new ForbiddenException(
        "The current identity is not allowed to manage this organization.",
      );
    }

    return memberships.filter((membership) => {
      if (organizationId && membership.organizationId !== organizationId) {
        return false;
      }

      return managedOrganizationIds.has(membership.organizationId);
    });
  }

  public async listInvitations(
    identity: RequestIdentity,
    organizationId?: string,
  ): Promise<InvitationRecord[]> {
    const invitations = await this.store.getInvitations();

    if (identity.effectiveRoles.includes("platform_admin")) {
      return organizationId
        ? invitations.filter((invitation) => invitation.organizationId === organizationId)
        : invitations;
    }

    const managedOrganizationIds = this.getManagedOrganizationIds(identity);

    if (managedOrganizationIds.size === 0) {
      throw new ForbiddenException("Only managers can list organization invitations.");
    }

    if (organizationId && !managedOrganizationIds.has(organizationId)) {
      throw new ForbiddenException(
        "The current identity is not allowed to manage this organization.",
      );
    }

    return invitations.filter((invitation) => {
      if (organizationId && invitation.organizationId !== organizationId) {
        return false;
      }

      return managedOrganizationIds.has(invitation.organizationId);
    });
  }

  private getManagedOrganizationIds(identity: RequestIdentity): Set<string> {
    return new Set(
      identity.tenantMemberships
        .filter((membership) => membership.roles.includes("company_manager"))
        .map((membership) => membership.organizationId),
    );
  }
}
