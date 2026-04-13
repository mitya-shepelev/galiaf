import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateOrganizationEmployeeRequest,
  OrganizationEmployeeAccessRecord,
} from "@galiaf/types";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import type { OrganizationRecord } from "../domain/domain.types.js";
import { DomainStoreService } from "../domain/domain-store.service.js";

@Injectable()
export class OrganizationsService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
  ) {}

  public async list(identity: RequestIdentity): Promise<OrganizationRecord[]> {
    return this.domainAccess.listOrganizations(identity);
  }

  public async getById(
    identity: RequestIdentity,
    organizationId: string,
  ): Promise<OrganizationRecord> {
    this.domainAccess.assertOrganizationAccess(identity, organizationId);

    return this.domainAccess.findOrganizationOrFail(organizationId);
  }

  public async create(input: {
    name: string;
    status?: OrganizationRecord["status"];
  }): Promise<OrganizationRecord> {
    return this.store.createOrganization(input);
  }

  public async createEmployee(
    identity: RequestIdentity,
    organizationId: string,
    payload: CreateOrganizationEmployeeRequest,
  ): Promise<OrganizationEmployeeAccessRecord> {
    this.domainAccess.assertManagerForOrganization(identity, organizationId);

    const organization = await this.domainAccess.findOrganizationOrFail(organizationId);
    const inviter = await this.domainAccess.getOrCreateCurrentUser(identity);
    const roles = this.domainAccess.normalizeMembershipRoles(payload.roles);
    const user = await this.store.provisionManagedUser({
      email: payload.email,
      fullName: payload.fullName,
    });
    const membership = await this.store.createMembership({
      userId: user.id,
      organizationId,
      roles,
      invitedByUserId: inviter.id,
    });

    return {
      organization,
      user,
      membership,
    };
  }
}
