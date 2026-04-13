import { Inject, Injectable } from "@nestjs/common";
import type { CurrentUserProfile } from "@galiaf/types";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { DomainStoreService } from "../domain/domain-store.service.js";

@Injectable()
export class UsersService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
  ) {}

  public async me(identity: RequestIdentity): Promise<CurrentUserProfile> {
    const user = await this.domainAccess.getOrCreateCurrentUser(identity);
    const resolvedMemberships = (await this.store.listMembershipsByUserId(user.id)).filter(
      (membership) => membership.status === "active",
    );
    const organizationIds = new Set(
      resolvedMemberships.map((membership) => membership.organizationId),
    );
    const resolvedOrganizations = (await this.store.getOrganizations()).filter((organization) =>
      organizationIds.has(organization.id),
    );

    return {
      user,
      tenantMemberships: identity.tenantMemberships,
      effectiveRoles: identity.effectiveRoles,
      activeTenantId: identity.activeTenantId,
      resolvedMemberships,
      resolvedOrganizations,
    };
  }

  public async list(identity: RequestIdentity) {
    return this.domainAccess.listUsers(identity);
  }
}
