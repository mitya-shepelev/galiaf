import { Inject, Injectable } from "@nestjs/common";
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
}
