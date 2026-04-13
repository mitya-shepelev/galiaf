import {
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { UpdateMembershipRolesRequest } from "@galiaf/types";
import { AuditService } from "../audit/audit.service.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { DomainStoreService } from "../domain/domain-store.service.js";

@Injectable()
export class MembershipsService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  public async list(identity: RequestIdentity, organizationId?: string) {
    if (organizationId) {
      this.domainAccess.assertOrganizationAccess(identity, organizationId);
    }

    return this.domainAccess.listMemberships(identity, organizationId);
  }

  public async updateRoles(
    identity: RequestIdentity,
    membershipId: string,
    payload: UpdateMembershipRolesRequest,
  ) {
    const memberships = await this.store.getMemberships();
    const membership = memberships.find((item) => item.id === membershipId);

    if (!membership) {
      throw new NotFoundException("Membership not found.");
    }

    this.domainAccess.assertManagerForOrganization(
      identity,
      membership.organizationId,
    );

    const roles = this.domainAccess.normalizeMembershipRoles(payload.roles);

    if (
      !identity.effectiveRoles.includes("platform_admin") &&
      roles.includes("company_manager") &&
      !identity.tenantMemberships.some(
        (item) =>
          item.organizationId === membership.organizationId &&
          item.roles.includes("company_manager"),
      )
    ) {
      throw new ForbiddenException("Only managers can assign manager role.");
    }

    const updatedMembership = await this.store.updateMembershipRoles(membershipId, roles);

    if (!updatedMembership) {
      throw new InternalServerErrorException(
        "Membership disappeared during role update.",
      );
    }

    await this.audit.record({
      action: "membership_roles_updated",
      entityType: "membership",
      entityId: updatedMembership.id,
      organizationId: updatedMembership.organizationId,
      actorIdentity: identity,
      details: {
        roles: updatedMembership.roles,
      },
    });

    return updatedMembership;
  }

  public async revoke(identity: RequestIdentity, membershipId: string) {
    const memberships = await this.store.getMemberships();
    const membership = memberships.find((item) => item.id === membershipId);

    if (!membership) {
      throw new NotFoundException("Membership not found.");
    }

    this.domainAccess.assertManagerForOrganization(
      identity,
      membership.organizationId,
    );

    const revokedMembership = await this.store.revokeMembership(membershipId);

    if (!revokedMembership) {
      throw new InternalServerErrorException(
        "Membership disappeared during revoke.",
      );
    }

    await this.audit.record({
      action: "membership_revoked",
      entityType: "membership",
      entityId: revokedMembership.id,
      organizationId: revokedMembership.organizationId,
      actorIdentity: identity,
      details: {
        roles: revokedMembership.roles,
      },
    });

    return revokedMembership;
  }
}
