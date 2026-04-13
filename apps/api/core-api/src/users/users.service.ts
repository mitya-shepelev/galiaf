import { Inject, Injectable } from "@nestjs/common";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";

@Injectable()
export class UsersService {
  public constructor(
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
  ) {}

  public async me(identity: RequestIdentity) {
    const user = this.domainAccess.getOrCreateCurrentUser(identity);

    return {
      user: await user,
      tenantMemberships: identity.tenantMemberships,
      effectiveRoles: identity.effectiveRoles,
      activeTenantId: identity.activeTenantId,
    };
  }

  public async list(identity: RequestIdentity) {
    return this.domainAccess.listUsers(identity);
  }
}
