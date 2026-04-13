import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateOrganizationEmployeeRequest,
  OrganizationEmployeeAccessRecord,
} from "@galiaf/types";
import { AuditService } from "../audit/audit.service.js";
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
    @Inject(AuditService)
    private readonly audit: AuditService,
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

  public async create(
    identity: RequestIdentity,
    input: {
    name: string;
    status?: OrganizationRecord["status"];
  }): Promise<OrganizationRecord> {
    const organization = await this.store.createOrganization(input);

    await this.audit.record({
      action: "organization_created",
      entityType: "organization",
      entityId: organization.id,
      organizationId: organization.id,
      actorIdentity: identity,
      details: {
        name: organization.name,
        status: organization.status,
      },
    });

    return organization;
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

    await this.audit.record({
      action: "organization_employee_provisioned",
      entityType: "membership",
      entityId: membership.id,
      organizationId,
      actorIdentity: identity,
      actorUserId: inviter.id,
      details: {
        userId: user.id,
        userEmail: user.email,
        roles,
      },
    });

    return {
      organization,
      user,
      membership,
    };
  }
}
